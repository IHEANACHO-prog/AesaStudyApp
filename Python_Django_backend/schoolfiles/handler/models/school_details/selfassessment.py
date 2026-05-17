from django.db import models
from .course import Course
from ..users.user import User


class SelfAssessmentQuestion(models.Model):
    QUESTION_TYPE = (
        ('mcq',        'MCQ'),
        ('true_false', 'True/False'),
    )
    course        = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='sa_questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE)
    order         = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'{self.question_text[:60]}'


class SelfAssessmentOption(models.Model):
    question    = models.ForeignKey(SelfAssessmentQuestion, on_delete=models.CASCADE, related_name='options')
    option_text = models.CharField(max_length=500)
    is_correct  = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.option_text} ({"✓" if self.is_correct else "✗"})'


class SelfAssessmentAttempt(models.Model):
    student      = models.ForeignKey(User, on_delete=models.CASCADE)
    course       = models.ForeignKey(Course, on_delete=models.CASCADE)
    score        = models.FloatField(default=0)
    total        = models.PositiveIntegerField(default=100)
    completed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.student.username} — {self.course.code} — {self.score}/{self.total}'
