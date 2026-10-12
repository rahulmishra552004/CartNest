class LoadtestMarkerMiddleware:
    """Identify the isolated backend to the load generator."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['X-Loadtest-Database'] = 'isolated'
        return response
