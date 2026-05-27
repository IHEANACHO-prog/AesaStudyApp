# handler/serializers/users/instructor_course_serializer.py

from rest_framework import serializers
from ...models.users.instructor_course import InstructorCourse
from ...models import Enrollment


class InstructorCourseSerializer(serializers.ModelSerializer):
    """
    Returned when listing an instructor's assignments.
    Embeds basic course info so the frontend doesn't need a second call.
    """
    course_id    = serializers.IntegerField(source='course.id',         read_only=True)
    course_code  = serializers.CharField(source='course.code',          read_only=True)
    course_title = serializers.CharField(source='course.title',         read_only=True)
    semester     = serializers.CharField(source='course.semester',      read_only=True)
    level_name   = serializers.CharField(source='course.level.name',    read_only=True)
    dept_name    = serializers.CharField(source='course.department.name', read_only=True)
    enrolled_count = serializers.SerializerMethodField()

    class Meta:
        model  = InstructorCourse
        fields = [
            'id',
            'course_id',
            'course_code',
            'course_title',
            'semester',
            'level_name',
            'dept_name',
            'enrolled_count',
            'assigned_at',
        ]

    def get_enrolled_count(self, obj):
        return Enrollment.objects.filter(course=obj.course).count()


class EnrolledStudentSerializer(serializers.Serializer):
    """
    Lightweight student summary for the instructor's "View Details" modal.
    """
    student_id    = serializers.IntegerField(source='student.id')
    full_name     = serializers.SerializerMethodField()
    matric_number = serializers.CharField(source='student.matric_number')
    level         = serializers.CharField(source='student.level.name',  default='')
    department    = serializers.CharField(source='student.department.name', default='')
    enrolled_at   = serializers.DateTimeField(source='enrolled_on', default=None)

    def get_full_name(self, obj):
        u = obj.student.user
        return f"{u.first_name} {u.last_name}".strip() or u.username