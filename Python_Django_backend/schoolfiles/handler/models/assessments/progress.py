from django.db import models
from ..users import User

class Progress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey("handler.Course", on_delete=models.CASCADE)
    completed_topics = models.ManyToManyField("handler.Topic", blank=True)
    total_topics = models.IntegerField(default=0)
    progress_percentage = models.FloatField(default=0)

    def __str__(self):
        return f"{self.user.username} - {self.course.title}: {self.progress_percentage}%"
