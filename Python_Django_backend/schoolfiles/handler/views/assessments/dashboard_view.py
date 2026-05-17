from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from handler.models import (
    Student, Enrollment, Performance, Progress,
    Attempt, SelfAssessmentAttempt, Instructor, Course, Exam,
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    user = request.user

    # ── INSTRUCTOR DASHBOARD ──────────────────────────────────────────────────
    if user.role == 'instructor':
        try:
            instructor  = Instructor.objects.get(user=user)
            courses     = Course.objects.filter(instructor=instructor).select_related('level', 'department')
            course_ids  = list(courses.values_list('id', flat=True))

            # Total students enrolled across all instructor's courses
            enrolled_count = Enrollment.objects.filter(
                course_id__in=course_ids
            ).values('student').distinct().count()

            # Exams created
            exams_count = Exam.objects.filter(course_id__in=course_ids).count()

            # All submitted attempts on instructor's exams
            attempts = (
                Attempt.objects
                .filter(exam__course_id__in=course_ids, is_submitted=True)
                .select_related('exam', 'exam__course', 'student', 'student__user')
                .order_by('-end_time', '-id')
            )
            total_attempts = attempts.count()
            scores         = list(attempts.values_list('score', flat=True))
            avg_score      = round(sum(scores) / len(scores), 1) if scores else 0.0

            # Recent student submissions for activity feed
            recent_activity = [
                {
                    'exam_title':   a.exam.title,
                    'course_title': a.exam.course.title if a.exam.course else '—',
                    'score':        a.score,
                    'total_marks':  a.exam.total_marks,
                    'submitted_at': a.end_time.isoformat() if a.end_time else None,
                    'exam_type':    a.exam.exam_type,
                    'student_name': f"{a.student.user.first_name} {a.student.user.last_name}".strip()
                                    or a.student.user.username,
                }
                for a in attempts[:10]
            ]

            # Pending tasks — courses with no exams
            courses_with_no_exams = [
                c.title for c in courses
                if not Exam.objects.filter(course=c).exists()
            ]

        except Instructor.DoesNotExist:
            enrolled_count        = 0
            exams_count           = 0
            total_attempts        = 0
            avg_score             = 0.0
            recent_activity       = []
            courses_with_no_exams = []

        return Response({
            'enrolled':             enrolled_count,
            'avg_score':            avg_score,
            'progress':             0.0,
            'exams_done':           exams_count,
            'total_submissions':    total_attempts,
            'recent_activity':      recent_activity,
            'pending_tasks':        courses_with_no_exams,
        })

    # ── STUDENT DASHBOARD ─────────────────────────────────────────────────────
    try:
        student = Student.objects.get(user=user)
    except Student.DoesNotExist:
        return Response({
            'enrolled':        0,
            'avg_score':       0.0,
            'progress':        0.0,
            'exams_done':      0,
            'recent_activity': [],
        })

    enrolled_count = Enrollment.objects.filter(student=student).count()

    performances = list(Performance.objects.filter(student=student))
    avg_score = (
        sum(p.average_score for p in performances) / len(performances)
        if performances else 0.0
    )

    progress_qs = list(Progress.objects.filter(user=user))
    avg_progress = (
        sum(p.progress_percentage for p in progress_qs) / len(progress_qs)
        if progress_qs else 0.0
    )

    # ── Exam/Test attempts ────────────────────────────────────────────────────
    exam_attempts = (
        Attempt.objects
        .filter(student=student, is_submitted=True)
        .select_related('exam', 'exam__course')
        .order_by('-end_time', '-id')
    )
    exams_done = exam_attempts.count()

    exam_activity = [
        {
            'exam_title':   a.exam.title,
            'course_title': a.exam.course.title if a.exam.course else '—',
            'score':        a.score,
            'total_marks':  a.exam.total_marks,
            'submitted_at': a.end_time.isoformat() if a.end_time else None,
            'exam_type':    a.exam.exam_type,
        }
        for a in exam_attempts
    ]

    # ── Self-assessment attempts ──────────────────────────────────────────────
    sa_attempts = (
        SelfAssessmentAttempt.objects
        .filter(student=user)
        .select_related('course')
        .order_by('-completed_at')
    )

    sa_activity = [
        {
            'exam_title':   'Practice Quiz',
            'course_title': a.course.title if a.course else '—',
            'score':        a.score,
            'total_marks':  a.total,
            'submitted_at': a.completed_at.isoformat() if a.completed_at else None,
            'exam_type':    'self_assessment',
        }
        for a in sa_attempts
    ]

    # ── Merge and sort by submitted_at descending, take latest 10 ─────────────
    all_activity = exam_activity + sa_activity
    all_activity.sort(
        key=lambda x: x['submitted_at'] or '',
        reverse=True
    )

    return Response({
        'enrolled':        enrolled_count,
        'avg_score':       round(avg_score,    1),
        'progress':        round(avg_progress, 1),
        'exams_done':      exams_done,
        'recent_activity': all_activity[:10],
    })