# handler/views/school_details/assignment_views.py
#
# Endpoints
# ─────────────────────────────────────────────────────────────
#  POST   /api/courses/<course_id>/assign/           — claim a course
#  DELETE /api/courses/<course_id>/unassign/         — unclaim a course
#  GET    /api/courses/my-assignments/               — all my assigned courses
#  GET    /api/courses/<course_id>/enrolled-students/ — students in a course
#  GET    /api/instructor/dashboard/                 — dashboard summary stats
# ─────────────────────────────────────────────────────────────

from django.db.models import Count
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from handler.models import Course, Enrollment, Instructor
from handler.models.users.instructor_course import InstructorCourse
from handler.serializers.users.instructor_course_serializer import (
    InstructorCourseSerializer,
    EnrolledStudentSerializer,
)
from handler.views.users.role_auth import IsInstructor


# ── helper ────────────────────────────────────────────────────────────────────

def _get_instructor(request):
    return get_object_or_404(Instructor, user=request.user)


# ── POST /api/courses/<course_id>/assign/ ─────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsInstructor])
def assign_course(request, course_id):
    """
    Instructor claims a course.
    Only allowed if the course belongs to the instructor's department.
    """
    instructor = _get_instructor(request)
    course     = get_object_or_404(Course, id=course_id)

    if course.department_id != instructor.department_id:
        return Response(
            {'detail': 'You can only assign courses in your own department.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    assignment, created = InstructorCourse.objects.get_or_create(
        instructor=instructor,
        course=course,
    )

    if not created:
        return Response(
            {'detail': 'You are already assigned to this course.'},
            status=status.HTTP_200_OK,
        )

    return Response(
        {
            'message':    'Course assigned successfully.',
            'assignment': InstructorCourseSerializer(assignment).data,
        },
        status=status.HTTP_201_CREATED,
    )


# ── DELETE /api/courses/<course_id>/unassign/ ─────────────────────────────────

@api_view(['DELETE'])
@permission_classes([IsInstructor])
def unassign_course(request, course_id):
    """
    Instructor removes themselves from a course.
    """
    instructor = _get_instructor(request)
    course     = get_object_or_404(Course, id=course_id)

    deleted, _ = InstructorCourse.objects.filter(
        instructor=instructor,
        course=course,
    ).delete()

    if not deleted:
        return Response(
            {'detail': 'Assignment not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response({'message': 'Course unassigned.'}, status=status.HTTP_200_OK)


# ── GET /api/courses/my-assignments/ ─────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsInstructor])
def my_assignments(request):
    """
    Returns all InstructorCourse rows for the current instructor,
    with enrolled_count embedded per course.
    """
    instructor  = _get_instructor(request)
    assignments = (
        InstructorCourse.objects
        .filter(instructor=instructor)
        .select_related('course', 'course__level', 'course__department')
    )
    return Response(InstructorCourseSerializer(assignments, many=True).data)


# ── GET /api/courses/<course_id>/enrolled-students/ ───────────────────────────

@api_view(['GET'])
@permission_classes([IsInstructor])
def enrolled_students(request, course_id):
    """
    Returns the list of students enrolled in a specific course.
    Only the instructors assigned to that course can call this.
    """
    instructor = _get_instructor(request)
    course     = get_object_or_404(Course, id=course_id)

    # Verify the instructor is assigned to this course
    if not InstructorCourse.objects.filter(instructor=instructor, course=course).exists():
        return Response(
            {'detail': 'You are not assigned to this course.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    enrollments = (
        Enrollment.objects
        .filter(course=course)
        .select_related(
            'student',
            'student__user',
            'student__level',
            'student__department',
        )
    )

    serializer = EnrolledStudentSerializer(enrollments, many=True)
    return Response({
        'course_id':    course.id,
        'course_code':  course.code,
        'course_title': course.title,
        'count':        enrollments.count(),
        'students':     serializer.data,
    })


# ── GET /api/instructor/dashboard/ ───────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsInstructor])
def instructor_dashboard(request):
    """
    Returns the instructor dashboard stats:
    - total unique enrolled students across all assigned courses
    - per-course breakdown with enrolled count
    - total submissions (exam attempts by enrolled students)
    """
    instructor  = _get_instructor(request)
    assignments = (
        InstructorCourse.objects
        .filter(instructor=instructor)
        .select_related('course', 'course__level', 'course__department')
        .prefetch_related('course__enrollments')
    )

    assigned_course_ids = [a.course_id for a in assignments]

    # Total unique students across all assigned courses
    total_students = (
        Enrollment.objects
        .filter(course_id__in=assigned_course_ids)
        .values('student_id')
        .distinct()
        .count()
    )

    # Per-course breakdown
    courses_breakdown = []
    for a in assignments:
        count = Enrollment.objects.filter(course=a.course).count()
        courses_breakdown.append({
            'course_id':    a.course.id,
            'course_code':  a.course.code,
            'course_title': a.course.title,
            'semester':     a.course.semester,
            'level':        a.course.level.name   if a.course.level       else '',
            'department':   a.course.department.name if a.course.department else '',
            'enrolled_count': count,
        })

    return Response({
        'total_assigned_courses': len(assigned_course_ids),
        'total_enrolled_students': total_students,
        'courses': courses_breakdown,
    })