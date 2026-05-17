from django.db import models

class Exam(models.Model):
    EXAM_TYPE = (
        ('self_assessment', 'Self-Assessment'),
        ('test', 'Test'),
        ('exam', 'Exam')
    )
    exam_type = models.CharField(max_length=20, choices=EXAM_TYPE)
    course = models.ForeignKey("handler.Course", on_delete=models.CASCADE)
    instructor = models.ForeignKey("handler.Instructor", on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=100)
    duration_mins = models.IntegerField()
    total_marks = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.get_exam_type_display()})"
