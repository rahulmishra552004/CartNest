import re
from rest_framework import serializers
from .models import Address

class AddressSerializer(serializers.ModelSerializer):
    recipientName = serializers.CharField(
        source = 'recipient_name',
        max_length = 150,
    )
    phoneNumber = serializers.CharField(
        source = 'phone_number',
        max_length = 20,
    )
    isDefault = serializers.BooleanField(
        source = 'is_default',
        default = False,
        required = False,
    )
    label = serializers.CharField(
        max_length = 50,
        required = False,
        allow_blank = True,
        default = ''
    )
    line1 = serializers.CharField(
        max_length = 200,
    )
    line2 = serializers.CharField(
        required = False,
        allow_blank = True,
        default = '',
        max_length = 200,
    )
    city = serializers.CharField(
        max_length = 100,
    )
    state = serializers.CharField(
        max_length = 100,
    )
    postalCode = serializers.CharField(
        source = 'postal_code',
        max_length = 20,
    )
    countryCode = serializers.CharField(
        source = 'country_code',
        min_length = 2,
        max_length = 2,
    )

    class Meta:
        model = Address
        fields = [
            'id',
            'label',
            'recipientName',
            'isDefault',
            'phoneNumber',
            'line1',
            'line2',
            'city',
            'state',
            'postalCode',
            'countryCode',
        ]
        read_only_fields = ['id']

    def validate_phoneNumber(self, value):
        cleaned = re.sub(r'[\s\-()]', '', value)
        if not re.fullmatch(r'\+[1-9]\d{7,14}', cleaned):
            raise serializers.ValidationError(
                'enter phone number with country code'
            )
        return cleaned

    def validate_countryCode(self, value):
        value = value.strip().upper()
        if not value.isalpha():
            raise serializers.ValidationError(
                'enter a two letter country code'
            )
        return value

