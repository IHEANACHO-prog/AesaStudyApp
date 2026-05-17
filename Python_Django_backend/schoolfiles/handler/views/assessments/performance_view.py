from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from collections import defaultdict

from handler.models import Performance, Progress, Student, SelfAssessmentAttempt
from handler.serializers import PerformanceSerializer, ProgressSerializer
from handler.views.users.role_auth import IsStudent


@api_view(['GET'])
@permission_classes([IsStudent])
def performance_view(request):
    student = get_object_or_404(Student, user=request.user)

    # ── Exam/Test Performance records ─────────────────────────────────────────
    exam_performance = (
        Performance.objects
        .filter(student=student)
        .select_related('course')
        .order_by('-id')
    )
    exam_data = list(PerformanceSerializer(exam_performance, many=True).data)

    # ── Self-assessment attempts grouped by course ────────────────────────────
    sa_attempts = (
        SelfAssessmentAttempt.objects
        .filter(student=request.user)
        .select_related('course')
        .order_by('-completed_at')
    )

    # Group by course
    grouped = defaultdict(list)
    course_meta = {}
    for a in sa_attempts:
        if a.course:
            grouped[a.course.id].append(a)
            course_meta[a.course.id] = a.course

    # Build one summary row per course
    sa_course_data = []
    for course_id, attempts in grouped.items():
        course    = course_meta[course_id]
        scores    = [
            round(a.score / a.total * 100, 2) if a.total > 0 else 0
            for a in attempts
        ]
        avg_score = round(sum(scores) / len(scores), 2) if scores else 0
        best      = max(scores) if scores else 0
        last_date = attempts[0].completed_at  # already ordered by -completed_at

        sa_course_data.append({
            'id':               f'sa_{course_id}',
            'course': {
                'id':    course.id,
                'code':  course.code,
                'title': course.title,
            },
            'average_score':     avg_score,
            'best_score':        best,
            'total_attempts':    len(attempts),
            'last_attempt_date': last_date.isoformat() if last_date else None,
            'performance_type':  'self_assessment',
        })

    # ── Combine: exam rows + one SA row per course ────────────────────────────
    combined = exam_data + sa_course_data

    return Response(combined)


@api_view(['GET'])
@permission_classes([IsStudent])
def progress_view(request):
    progress = (
        Progress.objects
        .filter(user=request.user)
        .select_related('course')
        .order_by('course__title')
    )
    serializer = ProgressSerializer(progress, many=True)
    return Response(serializer.data)