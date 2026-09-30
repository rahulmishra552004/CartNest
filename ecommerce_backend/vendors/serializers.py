from .models import Vendor
from rest_framework import serializers

class VendorSerializer(serializers.ModelSerializer):
    user = serializers.ForeignKeyRelatedField(read_only = True)

    is_verified = serializers.BooleanField(read_only=True)

    class Meta:
        model = Vendor
        fields = '__all__'
