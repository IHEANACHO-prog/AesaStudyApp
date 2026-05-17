from django.urls import path
from ..views.forum import q_and_a_forum

urlpatterns = [
    # ── Canonical Forum Paths ────────────────────────────────────────────────
    # These match the functions in your q_and_a_forum.py
    path('forum/course/<int:course_id>/questions/', q_and_a_forum.get_questions, name='forum-get-questions'),
    path('forum/course/<int:course_id>/questions/create/', q_and_a_forum.create_question, name='forum-create-question'),
    path('forum/course/<int:course_id>/questions/<int:questfr_id>/', q_and_a_forum.question_manager, name='forum-question-manager'),
    
    # ── Answer Paths ─────────────────────────────────────────────────────────
    path('forum/questions/<int:questfr_id>/answers/', q_and_a_forum.get_answers, name='forum-get-answers'),
    path('forum/questions/<int:questfr_id>/answers/create/', q_and_a_forum.create_answer, name='forum-create-answer'),
    path('forum/questions/<int:questfr_id>/answers/<int:ansfr_id>/', q_and_a_forum.answer_manager, name='forum-answer-manager'),

    # ── AESA-STUDY ALIASES ──────────────────────────────────────────────────
    # These fix the 404 errors triggered by the frontend's specific API calls
    path('course/<int:course_id>/question_forum/', q_and_a_forum.get_questions, name='alias-forum-list'),
    path('course/<int:course_id>/question_forum/create/', q_and_a_forum.create_question, name='alias-forum-create'),
]