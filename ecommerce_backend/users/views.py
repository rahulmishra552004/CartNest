from django.db import transaction
from vendors.serializers import VendorSerializer
import json
from django.contrib.auth import authenticate, login as django_login
from django.contrib.auth import logout as django_logout
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_POST
from rest_framework import status
from .serializers import RegistrationSerializer

@require_POST
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
    registration_serializer = RegistrationSerializer(data=registration_data)

    vendor_data = {}
    if 'store_name' in data:
        vendor_data['store_name'] = data['store_name']
    vendor_serializer = VendorSerializer(data=vendor_data)

    registration_valid = registration_serializer.is_valid()
    vendor_valid = vendor_serializer.is_valid()

    if (registration_valid and vendor_valid):
        with transaction.atomic():
            user = registration_serializer.save()
            vendor_serializer.save(user=user)

        return JsonResponse(
                {
                    'detail' : 'vendor created successfully',
                },
                status = status.HTTP_201_CREATED
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

@require_POST
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
    serializer = RegistrationSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return JsonResponse(
                {
                    'detail' : 'user created successfully',
                },
                status = status.HTTP_201_CREATED,
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
        'user' : {
            'id' : user.id,
            'username' : user.get_username(),
            'email' : user.email,
            'role' : user.role
            },
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

    return JsonResponse({
        'id' : request.user.pk,
        'username' : request.user.get_username(),
        'email' : request.user.email,
        'role' : request.user.role
        })
