from django.db import models

class Performance(models.Model):
    student = models.ForeignKey("handler.Student", on_delete=models.CASCADE)
    course = models.ForeignKey("handler.Course", on_delete=models.CASCADE)
    average_score = models.FloatField(default=0)
    best_score = models.FloatField(default=0)
    total_attempts = models.IntegerField(default=0)
    last_attempt_date = models.DateTimeField(null=True)

    def __str__(self):
        return f"Performance: {self.student} - {self.course}"
