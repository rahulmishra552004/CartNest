from .models import DeliveryOption
from .serializers import DeliveryOptionSerializer
from rest_framework import generics

class DeliveryOptionListView(generics.ListAPIView):
    queryset = DeliveryOption.objects.all()
    serializer_class = DeliveryOptionSerializer

