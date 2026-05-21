# ============================================
# dashboard_view.py — Bug #5 Backend Patch
# PASTE TO: handler/views/assessments/dashboard_view.py
# (or wherever your dashboard_view.py lives)
# ============================================
#
# BUG-5 FIX: Add `course_id` and `exam_id` to each activity row so the
#   frontend can deep-link directly to the exam results page.
#   Previously the frontend could only navigate to /performance (the
#   full history page) because it had no IDs to build a specific URL.
#
#   After this patch, DashboardPage.tsx will navigate to:
#     /courses/:course_id/exam/:exam_id/results
#   when a student clicks any Recent Activity row.
#
# BUG-6 CHECK: The 30Q / 30 marks / 15 min requirement is an exam
#   creation constraint, NOT enforced here. Enforce it in ExamManagePage
#   on the frontend (default values) or add a validator in ExamSerializer.
#   See the note at the bottom of this file.
# ============================================

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

            enrolled_count = Enrollment.objects.filter(
                course_id__in=course_ids
            ).values('student').distinct().count()

            exams_count = Exam.objects.filter(course_id__in=course_ids).count()

            attempts = (
                Attempt.objects
                .filter(exam__course_id__in=course_ids, is_submitted=True)
                .select_related('exam', 'exam__course', 'student', 'student__user')
                .order_by('-end_time', '-id')
            )
            total_attempts = attempts.count()
            scores         = list(attempts.values_list('score', flat=True))
            avg_score      = round(sum(scores) / len(scores), 1) if scores else 0.0

            recent_activity = [
                {
                    'exam_title':   a.exam.title,
                    'course_title': a.exam.course.title if a.exam.course else '—',
                    'score':        a.score,
                    'total_marks':  a.exam.total_marks,
                    'submitted_at': a.end_time.isoformat() if a.end_time else None,
                    'exam_type':    a.exam.exam_type,
                    'student_name': (
                        f"{a.student.user.first_name} {a.student.user.last_name}".strip()
                        or a.student.user.username
                    ),
                    # BUG-5 FIX: include IDs for deep linking
                    'course_id': a.exam.course_id,
                    'exam_id':   a.exam_id,
                }
                for a in attempts[:10]
            ]

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
            'enrolled':          enrolled_count,
            'avg_score':         avg_score,
            'progress':          0.0,
            'exams_done':        exams_count,
            'total_submissions': total_attempts,
            'recent_activity':   recent_activity,
            'pending_tasks':     courses_with_no_exams,
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

    progress_qs  = list(Progress.objects.filter(user=user))
    avg_progress = (
        sum(p.progress_percentage for p in progress_qs) / len(progress_qs)
        if progress_qs else 0.0
    )

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
            # BUG-5 FIX: include IDs so frontend can link to results page
            'course_id':    a.exam.course_id,
            'exam_id':      a.exam_id,
        }
        for a in exam_attempts
    ]

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
            # Self-assessment has no exam_id, so omit — frontend falls back to /performance
            'course_id':    a.course_id if a.course else None,
            'exam_id':      None,
        }
        for a in sa_attempts
    ]

    all_activity = exam_activity + sa_activity
    all_activity.sort(key=lambda x: x['submitted_at'] or '', reverse=True)

    return Response({
        'enrolled':        enrolled_count,
        'avg_score':       round(avg_score,    1),
        'progress':        round(avg_progress, 1),
        'exams_done':      exams_done,
        'recent_activity': all_activity[:10],
    })


# ============================================================================
# BUG-6 NOTE: Exam config (30 questions / 30 marks / 15 mins)
# ============================================================================
# This is a UI-level default, not a database constraint.
# To enforce it, add these defaults to your ExamSerializer or ExamFormPage:
#
#   class ExamSerializer(serializers.ModelSerializer):
#       duration_mins = serializers.IntegerField(default=15)
#       total_marks   = serializers.IntegerField(default=30)
#
# And on the frontend ExamManagePage / ExamEditPage, pre-fill the form:
#   duration_mins: 15
#   total_marks:   30
#
# The "30 questions" check belongs in ExamManagePage — disable publish/start
# if questionApi.getByExam() returns fewer than 30 items.
# ============================================================================