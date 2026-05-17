from rest_framework import serializers
from ...models import SelfAssessmentQuestion, SelfAssessmentOption, SelfAssessmentAttempt


class SAOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SelfAssessmentOption
        fields = ['id', 'option_text', 'is_correct']


class SAQuestionSerializer(serializers.ModelSerializer):
    options = SAOptionSerializer(many=True, read_only=True)

    class Meta:
        model  = SelfAssessmentQuestion
        fields = ['id', 'course', 'question_text', 'question_type', 'order', 'options']


class SAAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SelfAssessmentAttempt
        fields = ['id', 'student', 'course', 'score', 'total', 'completed_at']
        read_only_fields = ['student', 'completed_at']
