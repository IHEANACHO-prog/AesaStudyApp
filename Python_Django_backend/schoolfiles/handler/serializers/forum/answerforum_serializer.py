from rest_framework import serializers
from ...models import AnswerForum
from .questionforum_serializer import QuestionFormSerializer
from ..users import UserSerializer

class AnswerForumSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = AnswerForum
        fields = ['id', 'user','answer', 'created_at']
