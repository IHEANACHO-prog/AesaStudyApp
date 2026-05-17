from rest_framework import serializers
from ...models import Instructor, Department, Level, User
from .user_serializer import UserSerializer


class InstructorSerializer(serializers.ModelSerializer):
    # READ — nested objects returned in GET responses
    user = UserSerializer(read_only=True)

    # WRITE — accept integer PKs from the frontend
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all()
    )
    level = serializers.PrimaryKeyRelatedField(
        queryset=Level.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model  = Instructor
        fields = [
            'id',
            'user',
            'staff_id',
            'department',
            'level',
        ]

    def to_representation(self, instance):
        """Return full nested objects on read."""
        from ..school_details import LevelSerializer, DepartmentSerializer
        self.fields['department'] = DepartmentSerializer(read_only=True)
        self.fields['level']      = LevelSerializer(read_only=True, many=True)
        return super().to_representation(instance)

    def update(self, instance, validated_data):
        level = validated_data.pop('level', None)

        if 'department' in validated_data:
            instance.department = validated_data.pop('department')

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if level is not None:
            instance.level.set(level)

        instance.save()
        return instance