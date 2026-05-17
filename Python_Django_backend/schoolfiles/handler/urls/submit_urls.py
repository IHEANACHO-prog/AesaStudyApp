from django.urls import path
from ..views.assessments.submit_view import start_exam_view, submit_attempt, view_results

urlpatterns = [
    path('start_exam/', start_exam_view),
    path('begin_exam/', submit_attempt),
    path('stop_exam/',  submit_attempt),
    path('results/',    view_results),
]