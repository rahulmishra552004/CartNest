from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password

User = get_user_model()

class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
            write_only = True,
            min_length = 8
        )

    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'email', 'role']
        read_only_fields = ['id']

    def validate_password(self, password):
        validate_password(password)
        return password

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
