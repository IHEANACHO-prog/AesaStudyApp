from rest_framework import serializers
from ...models import QuestionForum
from ..users import UserSerializer
from ..school_details import CourseSerializer

class QuestionFormSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    course = CourseSerializer(read_only = True)
    class Meta:
        model = QuestionForum
        fields = ['id', 'user','title', 'body', 'course', 'created_at']
