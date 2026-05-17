from rest_framework import serializers
from ...models import Answer, Option

class AnswerSerializer(serializers.ModelSerializer):
    # This allows the frontend to send just the ID of the option
    selected_option = serializers.PrimaryKeyRelatedField(
        queryset=Option.objects.all(), 
        write_only=True
    )
    
    class Meta:
        model = Answer
        # Added attempt and question for data integrity
        fields = ['id', 'attempt', 'question', 'selected_option', 'is_correct']
        # is_correct should be read-only so students can't "tell" the server they were right
        read_only_fields = ['is_correct']
