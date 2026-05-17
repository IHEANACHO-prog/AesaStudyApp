from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone

from handler.models import Answer, Question, Exam, Attempt, Option, Performance, Student
from handler.serializers import QuestionSerializer, AttemptSerializer, ExamSerializer
from handler.views.users.role_auth import IsStudent, IsInstructor
from rest_framework.permissions import IsAuthenticated


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def exam_list_create(request, level_id=None, department_id=None, course_id=None):
    if request.method == 'GET':
        exams = Exam.objects.filter(course_id=course_id)
        serializer = ExamSerializer(exams, many=True)
        return Response(serializer.data)
    
    # Secure the POST method: Only instructors/staff can create exams
    elif request.method == 'POST':
        if not (request.user.is_staff or hasattr(request.user, 'instructor_profile')):
            return Response({"error": "Only instructors can create exams."}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = ExamSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(course_id=course_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── NEW ───────────────────────────────────────────────────────────────────────
# Frontend: examApi.getByCourse(id) → GET /api/course/<id>/exams/
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def exam_list_by_course(request, course_id):
    exams = Exam.objects.filter(course_id=course_id)
    serializer = ExamSerializer(exams, many=True)
    return Response(serializer.data)
# ─────────────────────────────────────────────────────────────────────────────


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def count_exams_created(request):
    count = Exam.objects.count()
    return Response({"count": count})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def exam_questions_list_create(request, course_id, exam_id):
    exam = get_object_or_404(Exam, id=exam_id, course_id=course_id)
    
    if request.method == 'GET':
        questions = Question.objects.filter(exam=exam)
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data)
        
    elif request.method == 'POST':
        # Secure the POST method: Only instructors/staff can add questions
        if not (request.user.is_staff or hasattr(request.user, 'instructor_profile')):
            return Response({"error": "Only instructors can add questions."}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = QuestionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(exam=exam)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def exam_question_detail(request, course_id, exam_id, question_id):
    question = get_object_or_404(Question, id=question_id, exam_id=exam_id)
    
    if request.method == 'GET':
        serializer = QuestionSerializer(question)
        return Response(serializer.data)
        
    # Secure PATCH and DELETE: Instructor/Staff only
    if not (request.user.is_staff or hasattr(request.user, 'instructor_profile')):
        return Response({"error": "Unauthorized action."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PATCH':
        serializer = QuestionSerializer(question, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    elif request.method == 'DELETE':
        question.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def exam_detail(request, course_id, exam_id):
    exam = get_object_or_404(Exam, id=exam_id, course_id=course_id)
    
    if request.method == 'GET':
        serializer = ExamSerializer(exam)
        return Response(serializer.data)
        
    # Secure PATCH and DELETE: Instructor/Staff only
    if not (request.user.is_staff or hasattr(request.user, 'instructor_profile')):
        return Response({"error": "Unauthorized action."}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PATCH':
        serializer = ExamSerializer(exam, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    elif request.method == 'DELETE':
        exam.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsStudent])
def view_results(request, course_id, exam_id):
    exam = get_object_or_404(Exam, id=exam_id, course_id=course_id)
    attempt = Attempt.objects.filter(
        student=request.user.student_profile,
        exam=exam,
        is_submitted=True
    ).order_by('-end_time').first()
    
    if not attempt:
        return Response({"error": "No submitted attempts found."}, status=status.HTTP_404_NOT_FOUND)

    questions = Question.objects.filter(exam=exam)
    results = []
    for question in questions:
        answer = Answer.objects.filter(question=question, attempt=attempt).first()
        correct_option = Option.objects.filter(question=question, is_answer=True).first()
        if answer:
            results.append({
                "question": question.question_text,
                "selected_option": answer.selected_option.option_value if answer.selected_option else "N/A",
                "is_correct": answer.is_correct,
                "correct_answer": correct_option.option_value if correct_option else "N/A"
            })
    return Response(results)


@api_view(['POST'])
@permission_classes([IsStudent])
def start_exam_view(request, course_id, exam_id):
    exam = get_object_or_404(Exam, id=exam_id, course_id=course_id)
    student = request.user.student_profile
    active = Attempt.objects.filter(student=student, exam=exam, is_submitted=False).first()
    if active:
        return Response(AttemptSerializer(active).data, status=status.HTTP_200_OK)
    attempt = Attempt.objects.create(student=student, exam=exam, start_time=timezone.now())
    return Response(AttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


@api_view(['POST', 'GET'])
@permission_classes([IsStudent])
def submit_attempt(request, course_id, exam_id):
    student = request.user.student_profile
    exam = get_object_or_404(Exam, id=exam_id, course_id=course_id)
    
    if request.method == "GET":
        questions = Question.objects.filter(exam=exam)
        return Response(QuestionSerializer(questions, many=True).data)
        
    elif request.method == "POST":
        attempt = Attempt.objects.filter(
            student=student, exam=exam, is_submitted=False
        ).first()
        if not attempt:
            return Response(
                {"error": "No active attempt found"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        answers_data = request.data.get("answers", [])
        score = 0
        for ans in answers_data:
            try:
                question = Question.objects.get(id=ans['question'], exam=exam)
                selected_option = question.options.get(id=ans['option'])
                is_correct = selected_option.is_answer
                Answer.objects.create(
                    attempt=attempt,
                    question=question,
                    selected_option=selected_option,
                    is_correct=is_correct
                )
                if is_correct:
                    score += question.mark
            except Exception:
                continue
                
        attempt.score = score
        attempt.is_submitted = True
        attempt.end_time = timezone.now()
        attempt.save()
        return Response({"score": score}, status=status.HTTP_201_CREATED)