# handler/serializers/school_details/course_serializer.py

from rest_framework import serializers
from ...models import Course, Topic


# ── Inline mini-serializer so topics are embedded in every course response ──
class NestedTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Topic
        fields = ['id', 'name', 'description', 'order']


# ── Nested level / department / instructor shapes ──────────────────────────
class LevelSerializer(serializers.Serializer):
    id   = serializers.IntegerField()
    name = serializers.CharField()


class DepartmentSerializer(serializers.Serializer):
    id   = serializers.IntegerField()
    name = serializers.CharField()


class InstructorUserSerializer(serializers.Serializer):
    id         = serializers.IntegerField()
    first_name = serializers.CharField()
    last_name  = serializers.CharField()


class NestedInstructorSerializer(serializers.Serializer):
    id   = serializers.IntegerField()
    user = InstructorUserSerializer()


class CourseSerializer(serializers.ModelSerializer):
    """
    Returns full nested objects for level, department, instructor
    so the frontend can do course.level.name, course.department.name, etc.
    Also embeds topics so CourseDetailPage gets everything in one request.
    """

    # Nested read-only objects — frontend uses .name, .id on all of these
    level      = LevelSerializer(read_only=True)
    department = DepartmentSerializer(read_only=True)
    instructor = NestedInstructorSerializer(read_only=True)

    # Topics embedded — sorted by order (model Meta already enforces this)
    topics = NestedTopicSerializer(many=True, read_only=True)

    # Writable FK fields for create / update — accept integer IDs
    level_id      = serializers.PrimaryKeyRelatedField(
        queryset=__import__('handler.models', fromlist=['Level']).Level.objects.all(),
        source='level', write_only=True, required=False
    )
    department_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('handler.models', fromlist=['Department']).Department.objects.all(),
        source='department', write_only=True, required=False
    )
    instructor_id = serializers.PrimaryKeyRelatedField(
        queryset=__import__('handler.models', fromlist=['Instructor']).Instructor.objects.all(),
        source='instructor', write_only=True, required=False, allow_null=True
    )

    class Meta:
        model  = Course
        fields = [
            'id',
            'code',
            'title',
            'semester',
            # Read nested objects
            'level',
            'department',
            'instructor',
            # Write IDs (hidden from read responses)
            'level_id',
            'department_id',
            'instructor_id',
            # Embedded topics list
            'topics',
        ]