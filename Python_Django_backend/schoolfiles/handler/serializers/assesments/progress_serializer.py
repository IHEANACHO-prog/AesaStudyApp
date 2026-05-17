from rest_framework import serializers
from ...models import Progress


class ProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Progress
        fields = [
            'id',
            'user',
            'course',
            'completed_topics',
            'total_topics',
            'progress_percentage',
        ]