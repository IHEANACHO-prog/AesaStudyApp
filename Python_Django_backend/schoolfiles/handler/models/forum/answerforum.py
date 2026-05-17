from django.db import models
from ..users import User
from .questionforum import QuestionForum

class AnswerForum(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    question = models.ForeignKey("handler.QuestionForum", on_delete=models.CASCADE)
    answer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
