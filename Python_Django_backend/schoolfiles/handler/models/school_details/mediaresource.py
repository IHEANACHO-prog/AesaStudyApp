from django.db import models
from .topic import Topic
from ..users.user import User


class MediaResource(models.Model):
    MEDIA_TYPE_CHOICES = (
        ('image',      'Image'),
        ('pdf',        'PDF'),
        ('video_link', 'Video Link'),
    )
    topic       = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='media_resources')
    media_type  = models.CharField(max_length=20, choices=MEDIA_TYPE_CHOICES)
    title       = models.CharField(max_length=255)
    file        = models.FileField(upload_to='media_resources/', blank=True, null=True)
    url         = models.URLField(blank=True, null=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.media_type}: {self.title} ({self.topic.name})'
