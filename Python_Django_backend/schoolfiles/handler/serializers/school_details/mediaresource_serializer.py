from rest_framework import serializers
from ...models import MediaResource


class MediaResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MediaResource
        fields = ['id', 'topic', 'media_type', 'title', 'file', 'url', 'uploaded_by', 'created_at']
        read_only_fields = ['uploaded_by', 'created_at']
