from rest_framework import serializers
from ...models import Performance

class PerformanceSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Performance
        fields = [
            'id', 
            'student',
            'course', 
            'average_score', 
            'total_attempts', 
            'best_score', 
            'last_attempt_date'
        ]

    def to_representation(self, instance):
        """
        Dynamically import to fix the 'CourseSerializer' error 
        and prevent circular import crashes.
        """
        from ..school_details.course_serializer import CourseSerializer
        from ..users.student_serializer import StudentSerializer
        
        self.fields['course'] = CourseSerializer(read_only=True)
        self.fields['student'] = StudentSerializer(read_only=True)
        
        return super().to_representation(instance)

        
