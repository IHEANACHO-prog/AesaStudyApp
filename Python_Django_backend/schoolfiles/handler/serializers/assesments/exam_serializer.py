from rest_framework import serializers
from ...models import Exam

class ExamSerializer(serializers.ModelSerializer):
    # Optional: If you want to show the human-readable name of the type (e.g., "Self-Assessment")
    exam_type_display = serializers.CharField(source='get_exam_type_display', read_only=True)

    class Meta:
        model = Exam
        fields = [
            'id', 
            'exam_type', 
            'exam_type_display', 
            'title', 
            'duration_mins', 
            'total_marks', 
            'created_at'
        ]
