# ============================================
# AESA Django — handler/views/q_and_a_forum.py
# PASTE TO: handler/views/q_and_a_forum.py
# ============================================
#
# UPGRADES over previous version:
#   [1] IsAuthenticated enforced on every view — no unauthenticated access
#   [2] Questions ordered by -created_at (newest first)
#   [3] Answers ordered by created_at (oldest first — conversation order)
#   [4] Consistent error shape: always { "error": "..." } — never bare strings
#   [5] 403 guard uses request.user == obj.user (unchanged — already correct)
#   [6] create_question / create_answer now return the full serialized object
#       including nested user and course — no silent 201 with empty body
#   [7] All views decorated with @permission_classes([IsAuthenticated])
#       so DRF returns 401 (not 403) for unauthenticated requests,
#       which triggers the client.ts token-refresh flow correctly
# ============================================

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from ...serializers import AnswerForumSerializer, QuestionFormSerializer
from ...models import QuestionForum, AnswerForum, Course


# ── Questions ─────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_questions(request, course_id):
    """
    GET /api/forum/course/<course_id>/questions/
    Returns all questions for a course, newest first.
    """
    course    = get_object_or_404(Course, id=course_id)
    questions = QuestionForum.objects.filter(course=course).order_by('-created_at')
    serializer = QuestionFormSerializer(questions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_question(request, course_id):
    """
    POST /api/forum/course/<course_id>/questions/create/
    Body: { "title": "...", "body": "..." }
    Course and user set from URL/request — never from body.
    """
    course     = get_object_or_404(Course, id=course_id)
    serializer = QuestionFormSerializer(data=request.data)

    if serializer.is_valid():
        instance   = serializer.save(user=request.user, course=course)
        # Re-serialize with nested user + course for the full response object
        out = QuestionFormSerializer(instance)
        return Response(out.data, status=status.HTTP_201_CREATED)

    return Response(
        {'error': 'Invalid data', 'detail': serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def question_manager(request, course_id, questfr_id):
    """
    GET    /api/forum/course/<course_id>/questions/<questfr_id>/  → detail
    PATCH  /api/forum/course/<course_id>/questions/<questfr_id>/  → edit (owner only)
    DELETE /api/forum/course/<course_id>/questions/<questfr_id>/  → delete (owner only)
    """
    course   = get_object_or_404(Course, id=course_id)
    question = get_object_or_404(QuestionForum, id=questfr_id, course=course)

    if request.method == 'GET':
        serializer = QuestionFormSerializer(question)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # PATCH and DELETE require ownership
    if request.user != question.user:
        return Response(
            {'error': 'You are not the author of this post.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == 'PATCH':
        serializer = QuestionFormSerializer(question, data=request.data, partial=True)
        if serializer.is_valid():
            instance = serializer.save()
            out = QuestionFormSerializer(instance)
            return Response(out.data, status=status.HTTP_200_OK)
        return Response(
            {'error': 'Invalid data', 'detail': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # DELETE
    question.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Answers ───────────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_answers(request, questfr_id):
    """
    GET /api/forum/questions/<questfr_id>/answers/
    Returns all answers for a question, oldest first (conversation order).
    """
    question = get_object_or_404(QuestionForum, id=questfr_id)
    answers  = AnswerForum.objects.filter(question=question).order_by('created_at')
    serializer = AnswerForumSerializer(answers, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_answer(request, questfr_id):
    """
    POST /api/forum/questions/<questfr_id>/answers/create/
    Body: { "answer": "..." }
    Question and user set from URL/request — never from body.
    """
    question   = get_object_or_404(QuestionForum, id=questfr_id)
    serializer = AnswerForumSerializer(data=request.data)

    if serializer.is_valid():
        instance = serializer.save(user=request.user, question=question)
        out = AnswerForumSerializer(instance)
        return Response(out.data, status=status.HTTP_201_CREATED)

    return Response(
        {'error': 'Invalid data', 'detail': serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def answer_manager(request, questfr_id, ansfr_id):
    """
    GET    /api/forum/questions/<questfr_id>/answers/<ansfr_id>/  → detail
    PATCH  /api/forum/questions/<questfr_id>/answers/<ansfr_id>/  → edit (owner only)
    DELETE /api/forum/questions/<questfr_id>/answers/<ansfr_id>/  → delete (owner only)
    """
    question = get_object_or_404(QuestionForum, id=questfr_id)
    answer   = get_object_or_404(AnswerForum, id=ansfr_id, question=question)

    if request.method == 'GET':
        serializer = AnswerForumSerializer(answer)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # PATCH and DELETE require ownership
    if request.user != answer.user:
        return Response(
            {'error': 'You are not the author of this answer.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == 'PATCH':
        serializer = AnswerForumSerializer(answer, data=request.data, partial=True)
        if serializer.is_valid():
            instance = serializer.save()
            out = AnswerForumSerializer(instance)
            return Response(out.data, status=status.HTTP_200_OK)
        return Response(
            {'error': 'Invalid data', 'detail': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # DELETE
    answer.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)