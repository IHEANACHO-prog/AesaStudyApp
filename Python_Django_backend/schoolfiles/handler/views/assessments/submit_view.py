from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone

from ...models import Answer, Question, Exam, Attempt, Option, Performance, Student
from ...serializers import QuestionSerializer, AttemptSerializer
from ...permissions import IsStudent


@permission_classes([IsStudent])
@api_view(['GET'])
def view_results(request, course_id, exam_id):
    exam = get_object_or_404(Exam, id=exam_id, course_id=course_id)
    attempt = Attempt.objects.filter(
        student=request.user.student_profile,
        exam=exam,
        is_submitted=True
    ).order_by('-end_time').first()

    questions = Question.objects.filter(exam=exam)
    results = []
    for question in questions:
        answer = Answer.objects.filter(question=question, attempt=attempt).first()
        option = Option.objects.filter(question=question, is_answer=True).first()
        if answer:
            results.append({
                "question":        question.question_text,
                "selected_option": answer.selected_option.option_value,
                "is_correct":      answer.is_correct,
                "correct_answer":  option.option_value if option else None,
            })
    return Response(results)


@permission_classes([IsStudent])
@api_view(['POST'])
def start_exam_view(request, course_id, exam_id):
    exam = get_object_or_404(Exam, id=exam_id, course_id=course_id)
    student = get_object_or_404(Student, user=request.user)

    if exam.exam_type != 'exam':
        active = Attempt.objects.filter(
            student=student, exam=exam, is_submitted=False
        ).first()
        if active:
            return Response(AttemptSerializer(active).data, status=status.HTTP_200_OK)
        attempt = Attempt.objects.create(
            student=student,
            exam=exam,
            start_time=timezone.now()
        )
        return Response(AttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)

    else:
        attempted = Attempt.objects.filter(
            student=student, exam=exam, is_submitted=True
        ).first()
        if attempted:
            return Response(
                {'detail': 'You have already attempted this exam.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        active = Attempt.objects.filter(
            student=student, exam=exam, is_submitted=False
        ).first()
        if active:
            return Response(AttemptSerializer(active).data, status=status.HTTP_200_OK)
        attempt = Attempt.objects.create(
            student=student,
            exam=exam,
            start_time=timezone.now()
        )
        return Response(AttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


@permission_classes([IsStudent])
@api_view(['POST', 'GET'])
def submit_attempt(request, course_id, exam_id):
    student = get_object_or_404(Student, user=request.user)

    if request.method == 'GET':
        exam = get_object_or_404(Exam, id=exam_id, course_id=course_id)
        questions = Question.objects.filter(exam=exam)
        return Response(QuestionSerializer(questions, many=True).data)

    elif request.method == 'POST':
        attempt = Attempt.objects.filter(
            student=student, exam_id=exam_id, is_submitted=False
        ).first()
        if not attempt:
            return Response(
                {"error": "No active attempt found for this exam"},
                status=status.HTTP_400_BAD_REQUEST
            )

        exam = get_object_or_404(Exam, id=exam_id, course_id=course_id)
        answers = request.data.get("answers", [])
        score = 0

        for ans in answers:
            question_id        = ans['question']
            selected_option_id = ans['option']
            try:
                question        = Question.objects.get(id=question_id, exam=exam)
                selected_option = question.options.get(id=selected_option_id)
                is_correct      = selected_option.is_answer
                Answer.objects.create(
                    attempt=attempt,
                    question=question,
                    selected_option=selected_option,
                    is_correct=is_correct
                )
                if is_correct:
                    score += question.mark
            except (Question.DoesNotExist, Option.DoesNotExist):
                return Response(
                    {"error": "Invalid question or option selected"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        attempt.score        = score
        attempt.is_submitted = True
        attempt.end_time     = timezone.now()
        attempt.save()

        # ── FIX: use get_or_create so we never duplicate Performance rows ──
        all_attempts = Attempt.objects.filter(
            student=student,
            exam__course=exam.course,
            is_submitted=True
        )
        count  = all_attempts.count()
        scores = list(all_attempts.values_list('score', flat=True))
        avg    = round(sum(scores) / count, 2) if count else 0
        best   = max(scores) if scores else 0

        perf, _ = Performance.objects.get_or_create(
            student=student,
            course=exam.course,
        )
        perf.average_score     = avg
        perf.best_score        = best
        perf.total_attempts    = count
        perf.last_attempt_date = timezone.now()
        perf.save()

        return Response({
            "message":      "Attempt submitted successfully",
            "score":        score,
            "average_score": avg,
        }, status=status.HTTP_201_CREATED)