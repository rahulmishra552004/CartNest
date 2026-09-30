import json
from django.contrib.auth import authenticate, login as django_login
from django.contrib.auth import logout as django_logout
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_POST

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
                status = 400)
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return JsonResponse(
                {'detail' : 'username and password required'},
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
        'role' : request.user.role
        })



