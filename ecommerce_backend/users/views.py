from django.db import transaction
from vendors.serializers import VendorSerializer
import json
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate, login as django_login
from django.contrib.auth import logout as django_logout
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import (
    require_GET,
    require_POST,
    require_http_methods
)
from rest_framework import status
from .serializers import RegistrationSerializer, RegistrationUpdateSerializer
from vendors.models import Vendor

def _user_data(user):
    vendor = getattr(user, 'vendor', None) if user.role == 'vendor' else None
    return {
        'id': user.pk,
        'username': user.get_username(),
        'email': user.email,
        'role': user.role,
        'store_name': vendor.store_name if vendor is not None else None,
    }

@require_POST
def change_password_view(request):
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict):
            return JsonResponse(
                {'detail' : 'expected a json object'},
                status = status.HTTP_400_BAD_REQUEST,
            )
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {'detail' : 'invalid data'},
            status = status.HTTP_400_BAD_REQUEST
        )

    if not request.user.is_authenticated:
        return JsonResponse(
            {'detail': 'Authentication required'},
            status = 401,
        )

    if 'password' not in data or 'new_password' not in data:
        return JsonResponse(
            {'detail': 'password and new password required'},
            status = 400,
        )

    if (
        not isinstance(data['password'], str)
        or not isinstance(data['new_password'], str)
        or not data['password']
        or not data['new_password']
    ):
        return JsonResponse(
            {'detail': 'both passwords must be non empty strings'},
            status = 400,
        )

    if not request.user.check_password(data['password']):
        return JsonResponse(
            {'detail': 'current password is invalid'},
            status = 400,
        )

    try:
        validate_password(data['new_password'], user=request.user)
    except ValidationError as error:
        return JsonResponse(
            {'detail': error.messages},
            status = 400,
        )

    request.user.set_password(data['new_password'])
    request.user.save(update_fields=['password'])
    update_session_auth_hash(request, request.user)

    return JsonResponse(
        {'detail': 'password updated successfully'},
        status = 200,
    )

@require_http_methods(['POST', 'PATCH'])
def vendor_registration_view(request):
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict):
            return JsonResponse(
                    {'detail' : 'expected a json object'},
                    status = status.HTTP_400_BAD_REQUEST
                )

    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
                {'detail' : 'invalid data'},
                status = status.HTTP_400_BAD_REQUEST
            )

    fields = ['username', 'password', 'email']
    registration_data = {
            field : data[field]
            for field in fields
            if field in data
        }
    registration_data['role'] = 'vendor'

    vendor_data = {}
    if 'store_name' in data:
        vendor_data['store_name'] = data['store_name']

    if request.method == 'POST':
        registration_serializer = RegistrationSerializer(data=registration_data)
        vendor_serializer = VendorSerializer(data=vendor_data)

    if request.method == 'PATCH':
        if not request.user.is_authenticated:
            return JsonResponse(
                {'detail' : 'Authentication Required'},
                status = 401,
            )
        if request.user.role == 'vendor':
            try:
                vendor = request.user.vendor
            except Vendor.DoesNotExist:
                return JsonResponse(
                    {'detail': 'your vendor profile is missing please contact support'},
                    status = 409,
                )

            registration_serializer = RegistrationUpdateSerializer(
                instance = request.user,
                data = registration_data,
                partial = True,
            )
            vendor_serializer = VendorSerializer(
                instance = vendor,
                data = vendor_data,
                partial = True,
            )
        else:
            registration_serializer = RegistrationUpdateSerializer(
                instance = request.user,
                data = registration_data,
                partial = True,
            )
            vendor_serializer = VendorSerializer(data=vendor_data)

    registration_valid = registration_serializer.is_valid()
    vendor_valid = vendor_serializer.is_valid()

    if (registration_valid and vendor_valid):
        with transaction.atomic():
            user = registration_serializer.save()
            vendor_serializer.save(user=user)

        if request.method == 'POST':
            detail = 'vendor created successfully'
            status_code = 201
        if request.method == 'PATCH':
            detail = 'vendor updated successfully'
            status_code = 200

        return JsonResponse(
                {
                    'detail' : detail,
                    'user': _user_data(user),
                },
                status = status_code,
            )

    else:
        return JsonResponse(
                {
                    'detail' : 'invalid data',
                    'user' : registration_serializer.errors,
                    'vendor' : vendor_serializer.errors
                },
                status = status.HTTP_400_BAD_REQUEST
            )

@require_http_methods(['POST', 'PATCH'])
def customer_registration_view(request):
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict):
            return JsonResponse(
                    {'detail' : 'expected a json object'},
                    status = status.HTTP_400_BAD_REQUEST
                )


    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
                {'detail' : 'invalid data'},
                status = status.HTTP_400_BAD_REQUEST
            )

    data['role'] = 'customer'

    if request.method == 'POST':
        serializer = RegistrationSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return JsonResponse(
                    {
                        'detail' : 'user created successfully',
                    },
                    status = status.HTTP_201_CREATED,
                )

    if request.method == 'PATCH':
        if not request.user.is_authenticated:
            return JsonResponse({
                'detail' : 'authentication required',
                }, status = 401
            )
        if request.user.role != 'customer':
            return JsonResponse(
                {'detail' : 'only allowed for customers'},
                status = 403,
            )
        serializer = RegistrationUpdateSerializer(
            instance = request.user,
            data = data,
            partial = True,
        )
        if serializer.is_valid():
            serializer.save()
            return JsonResponse({
                'detail' : 'user data updated successfully'
                }, status = 200
            )

    return JsonResponse(
            serializer.errors,
            status = status.HTTP_400_BAD_REQUEST,
        )

@require_GET
def csrf_view(request):
    return JsonResponse({
                'csrfToken' : get_token(request)
                })

@require_POST
@csrf_protect
def login_view(request):
    try:
        data = json.loads(request.body)
    except(json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {'detail' : 'incorrect json body'},
            status = 400
        )

    if not isinstance(data, dict):
        return JsonResponse(
            {'detail' : 'expected a json object'},
            status = 400
        )

    username = data.get('username')
    password = data.get('password')

    if (
        not isinstance(username, str)
        or not isinstance(password, str)
        or not username.strip()
        or not password
    ):
        return JsonResponse(
                {'detail' : 'username and password required, both must be non empty strings'},
                status = 400
                )

    user = authenticate(
            request,
            username = username,
            password = password
            )

    if user is None:
        return JsonResponse(
                {'detail' : 'invalid username or password'},
                status = 401
                )

    django_login(request, user)

    return JsonResponse({
        'user': _user_data(user),
        'csrfToken' : get_token(request)
        })

@require_POST
@csrf_protect
def logout_view(request):
    django_logout(request)
    return JsonResponse({
        'detail' : 'logged_out'
        })

@require_GET
def current_user_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({
            'detail' : 'unauthenticated'},
            status = 401)

    return JsonResponse(_user_data(request.user))
