from rest_framework import serializers
from ...models import LectureNote


class LectureNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = LectureNote
        fields = ['id', 'topic', 'content', 'pdf_file', 'created_by', 'updated_by', 'created_at', 'updated_at']
        read_only_fields = ['created_by', 'updated_by', 'created_at', 'updated_at']
