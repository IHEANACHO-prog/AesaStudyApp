from rest_framework import serializers
from ...models import Attempt

class AttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attempt
        # Added 'student' and 'exam' to provide context
        fields = [
            'id', 
            'student', 
            'exam', 
            'score', 
            'start_time', 
            'end_time', 
            'is_submitted'
        ]
        # Ensure score is usually not manually editable by the user
        read_only_fields = ['score']
