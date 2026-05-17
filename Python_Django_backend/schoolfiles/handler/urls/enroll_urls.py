from django.urls import path
from ..views import school_details as school_views

urlpatterns = [
    path('course/<int:course>/enroll/', school_views.enroll_in_course, name='enroll_in_course')
]
