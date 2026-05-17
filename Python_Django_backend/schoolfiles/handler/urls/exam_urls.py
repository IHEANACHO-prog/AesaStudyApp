from django.urls import path, include
from ..views.assessments import (
    exam_list_create, exam_detail, count_exams_created,
    exam_list_by_course, exam_questions_list_create, exam_question_detail
)

urlpatterns = [
    path('course/<int:course_id>/exams/', exam_list_by_course, name='course-exams'),
    path('level/<int:level_id>/department/<int:department_id>/course/<int:course_id>/exam/', exam_list_create, name='view-exams'),
    path('exams/count/', count_exams_created, name='number-of-exams-created'),
    path('level/<int:level_id>/department/<int:department_id>/course/<int:course_id>/exam/create/', exam_list_create, name='create-exam'),
    path('course/<int:course_id>/exam/<int:exam_id>/', exam_detail),
    path('course/<int:course_id>/exam/<int:exam_id>/questions/', exam_questions_list_create, name='get_questions'),
    path('course/<int:course_id>/exam/<int:exam_id>/question/create/', exam_questions_list_create, name='create_questions'),
    path('course/<int:course_id>/exam/<int:exam_id>/question/<int:question_id>/', exam_question_detail),
    path('course/<int:course_id>/exam/<int:exam_id>/question/<int:question_id>/update/', exam_question_detail),
    path('course/<int:course_id>/exam/<int:exam_id>/question/<int:question_id>/delete/', exam_question_detail),
    path('course/<int:course_id>/exam/<int:exam_id>/question/<int:question_id>/option/', include('handler.urls.options_urls')),
    path('course/<int:course_id>/exam/<int:exam_id>/start_stop/', include('handler.urls.submit_urls')),
]