from django.urls import path
from ..views import forum

urlpatterns = [
    path('course/<int:course_id>/question_forum/', forum.get_questions, name='qustions_asked'),
    path('course/<int:course_id>/question_forum/create/', forum.create_question, name='qustion_ask'),
    path('course/<int:course_id>/question_forum/<int:questfr_id>/', forum.question_manager, name='qustions_get'),
    path('course/<int:course_id>/question_forum/<int:questfr_id>/update/', forum.question_manager, name='qustions_update'),
    path('course/<int:course_id>/question_forum/<int:questfr_id>/delete/', forum.question_manager, name='qustions_delete'),
    path('question_forum/<int:questfr_id>/answer_forum/', forum.get_answers, name='answers_get'),
    path('question_forum/<int:questfr_id>/answer_forum/create/', forum.create_answer, name='answer_question'),
    path('question_forum/<int:questfr_id>/answer_forum/<int:ansfr_id>/', forum.answer_manager, name='answer_get'),
    path('question_forum/<int:questfr_id>/answer_forum/<int:ansfr_id>/update/', forum.answer_manager, name='answer_update'),
    path('question_forum/<int:questfr_id>/answer_forum/<int:ansfr_id>/delete/', forum.answer_manager, name='answer_delete')
]
