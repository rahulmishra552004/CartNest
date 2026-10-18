"""Responses for rendered JSON caches, including legacy Python-data entries."""
from django.http import HttpResponse
from rest_framework.response import Response


def cached_json_response(data):
    if isinstance(data, bytes):
        return HttpResponse(data, content_type='application/json')
    return Response(data)
