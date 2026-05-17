from rest_framework import serializers
from ...models import Student, Department, Level, User
from .user_serializer import UserSerializer


class StudentSerializer(serializers.ModelSerializer):
    # READ — nested objects returned in GET responses
    user = UserSerializer(read_only=True)

    # WRITE — accept integer PKs from the frontend (what AuthPage now sends)
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all()
    )
    level = serializers.PrimaryKeyRelatedField(
        queryset=Level.objects.all()
    )

    class Meta:
        model  = Student
        fields = [
            'id',
            'user',
            'department',
            'level',
            'matric_number',
        ]

    def to_representation(self, instance):
        """Return full nested objects on read."""
        from ..school_details import LevelSerializer, DepartmentSerializer
        self.fields['department'] = DepartmentSerializer(read_only=True)
        self.fields['level']      = LevelSerializer(read_only=True)
        return super().to_representation(instance)