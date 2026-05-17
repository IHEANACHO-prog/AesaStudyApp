from django.db import models

class Enrollment(models.Model):
    student = models.ForeignKey("handler.student", on_delete=models.CASCADE)
    course = models.ForeignKey("handler.course", on_delete=models.CASCADE)
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['student', 'course']

    def __str__(self):
        return f"{self.student} enrolled in {self.course}"
