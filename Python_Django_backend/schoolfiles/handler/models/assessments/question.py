from django.db import models

class Question(models.Model):
    QUESTION_TYPE = (
        ('mcq', 'Multiple Choice'),
        ('theory', 'Theory'),
        ('true_false', 'True/False')
    )

    exam = models.ForeignKey("handler.Exam", on_delete=models.CASCADE)
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE, default='mcq')
    mark = models.IntegerField(default=1)

    def __str__(self):
        # Using get_question_type_display() makes it look cleaner in the Admin
        return f"{self.question_text[:50]}... ({self.get_question_type_display()})"
