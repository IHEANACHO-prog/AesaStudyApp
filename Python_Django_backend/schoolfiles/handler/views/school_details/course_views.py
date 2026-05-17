# handler/views/school_details/course_views.py

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from handler.models import Course, Department, Level, Instructor, Enrollment, Student
from handler.serializers import CourseSerializer, EnrollmentSerializer
from handler.views.users.role_auth import IsInstructor


@api_view(['GET'])
def get_courses(request, level_id, department_id):
    courses = Course.objects.filter(department=department_id, level=level_id)
    serializer = CourseSerializer(courses, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def get_course_by_id(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    serializer = CourseSerializer(course)
    return Response(serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# FIX: count_my_courses
#
# BEFORE: Blindly accessed request.user.instructor_profile — crashed with
#         RelatedObjectDoesNotExist for any student or admin user.
#
# AFTER:  Role-aware. Instructors get their course count. Students and admins
#         get 0 (safe default). No 500 errors for any user type.
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def count_my_courses(request):
    user = request.user

    if user.role == 'instructor' and hasattr(user, 'instructor_profile'):
        count = Course.objects.filter(instructor=user.instructor_profile).count()
    elif user.role == 'student' and hasattr(user, 'student_profile'):
        # Count courses the student is enrolled in
        count = Enrollment.objects.filter(student=user.student_profile).count()
    else:
        count = 0

    return Response({'count': count, 'role': user.role})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enroll_in_course(request, course_id):
    course = get_object_or_404(Course, id=course_id)
    student = get_object_or_404(Student, user=request.user)

    if Enrollment.objects.filter(student=student, course=course).exists():
        return Response(
            {'error': 'You are already enrolled in this course.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    enrollment = Enrollment.objects.create(student=student, course=course)
    serializer = EnrollmentSerializer(enrollment)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_enrollments(request):
    student = get_object_or_404(Student, user=request.user)
    enrolled_courses = Enrollment.objects.filter(student=student).select_related('course')
    serializer = EnrollmentSerializer(enrolled_courses, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsInstructor])
def create_course(request, level_id, department_id):
    department = get_object_or_404(Department, id=department_id)
    level = get_object_or_404(Level, id=level_id)
    instructor = get_object_or_404(Instructor, user=request.user)

    if instructor.department != department:
        return Response(
            {'detail': 'Forbidden: You do not belong to this department.'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = CourseSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(department=department, level=level, instructor=instructor)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def get_course(request, level_id, department_id, course_id):
    """Legacy 3-arg version — kept for backward compatibility."""
    course = get_object_or_404(
        Course,
        id=course_id,
        level_id=level_id,
        department_id=department_id
    )
    serializer = CourseSerializer(course)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsInstructor])
def update_course(request, level_id, department_id, course_id):
    instructor = get_object_or_404(Instructor, user=request.user)
    department = get_object_or_404(Department, id=department_id)

    if instructor.department != department:
        return Response(
            {'detail': 'Forbidden: Department mismatch.'},
            status=status.HTTP_403_FORBIDDEN
        )

    course = get_object_or_404(
        Course,
        id=course_id,
        department_id=department.id,
        level_id=level_id
    )
    serializer = CourseSerializer(course, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsInstructor])
def delete_course(request, level_id, department_id, course_id):
    instructor = get_object_or_404(Instructor, user=request.user)
    department = get_object_or_404(Department, id=department_id)

    if instructor.department != department:
        return Response(
            {'detail': 'Forbidden: Department mismatch.'},
            status=status.HTTP_403_FORBIDDEN
        )

    course = get_object_or_404(
        Course,
        id=course_id,
        department_id=department.id,
        level_id=level_id
    )
    course.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)