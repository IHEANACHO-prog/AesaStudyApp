from django.urls import path
from handler.views.health import health_check

urlpatterns = [
    path('health/', health_check),
]
