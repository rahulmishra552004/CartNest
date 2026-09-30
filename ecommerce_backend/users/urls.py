from django.urls import path
from .views import (
        csrf_view,
        login_view,
        logout_view,
        current_user_view
        )

urlpatterns = [
        path('auth/csrf/', csrf_view, name='csrf'),
        path('auth/login/', login_view, name='login'),
        path('auth/logout/', logout_view, name='logout'),
        path('auth/me/', current_user_view, name='current_user'),
        ]


