from django.urls import path
from ..views.school_details.selfassessment_views import (
    get_sa_questions, submit_self_assessment
)

urlpatterns = [
    path('course/<int:course_id>/self-assessment/',        get_sa_questions,       name='sa-questions'),
    path('course/<int:course_id>/self-assessment/submit/', submit_self_assessment, name='sa-submit'),
]
