from rest_framework import serializers
from ...models import Enrollment
from ..users import StudentSerializer
from ..school_details import CourseSerializer

class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseSerializer(read_only=True)
    student = StudentSerializer(read_only = True)
    
    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'course', 'enrolled_at']
        
