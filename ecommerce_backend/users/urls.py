from django.urls import path
from .views import (
        csrf_view,
        login_view,
        logout_view,
        current_user_view,
        customer_registration_view,
        vendor_registration_view,
        change_password_view,
    )

urlpatterns = [
        path('auth/csrf/', csrf_view, name='csrf'),
        path('auth/login/', login_view, name='login'),
        path('auth/logout/', logout_view, name='logout'),
        path('auth/me/', current_user_view, name='current_user'),
        path(
            'auth/register_customer/',
             customer_registration_view,
             name='customer_registeration'
        ),
        path(
            'auth/register_vendor/',
            vendor_registration_view,
            name = 'vendor_registeration'
        ),
        path(
            'auth/change_password/',
            change_password_view,
            name = 'change_password'
        ),
    ]


