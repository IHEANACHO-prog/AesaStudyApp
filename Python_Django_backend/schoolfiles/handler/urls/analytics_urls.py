from django.urls import path
from ..views.assessments.dashboard_view   import dashboard_view
from ..views.assessments.performance_view import performance_view, progress_view

urlpatterns = [
    path('analytics/performance/', performance_view),
    path('analytics/progress/',    progress_view),
    path('analytics/dashboard/',   dashboard_view),
]