from django.shortcuts import render
from rest_framework import generics
from .serializers import ProductSerializer
from .models import Product
from django.db.models import Q

class ProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer

    def get_queryset(self):
        queryset = Product.objects.all()
        search = self.request.query_params.get('search', '').strip()

        if search:
            queryset = queryset.filter(
                    Q(name__icontains=search) |
                    Q(keywords__icontains=search)
                    )
            
        return queryset



