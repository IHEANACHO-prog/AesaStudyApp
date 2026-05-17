from django.db import models
from .topic import Topic
from ..users.user import User


class LectureNote(models.Model):
    topic      = models.OneToOneField(Topic, on_delete=models.CASCADE, related_name='lecture_note')
    content    = models.TextField()
    pdf_file   = models.FileField(upload_to='lecture_pdfs/', blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='notes_created')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='notes_updated')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Note: {self.topic.name}'
