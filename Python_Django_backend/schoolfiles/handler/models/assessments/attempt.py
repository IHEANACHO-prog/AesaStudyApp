from django.db import models
from django.utils import timezone

class Attempt(models.Model):
    student = models.ForeignKey("handler.Student", on_delete=models.CASCADE)
    exam = models.ForeignKey("handler.Exam", on_delete=models.CASCADE)
    score = models.FloatField(default=0)
    start_time = models.DateTimeField() # You might want auto_now_add=True here later
    end_time = models.DateTimeField(null=True, blank=True)
    is_submitted = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.student} - {self.exam} (Score: {self.score})"

    def save(self, *args, **kwargs):
        # 1. Save the attempt first so it exists in the DB
        super().save(*args, **kwargs)

        # 2. Trigger the performance update if the student has submitted
        if self.is_submitted:
            self.update_performance_record()

    def update_performance_record(self):
        # Local import to prevent circular import errors
        from .performance import Performance 

        # Find or create the performance entry for this student + course
        # Note: We get the course via the exam relationship
        perf, created = Performance.objects.get_or_create(
            student=self.student,
            course=self.exam.course
        )

        # Grab all submitted attempts for this student in this specific course
        all_course_attempts = Attempt.objects.filter(
            student=self.student,
            exam__course=self.exam.course,
            is_submitted=True
        )

        # Perform the calculations
        count = all_course_attempts.count()
        total_score = sum(attr.score for attr in all_course_attempts)
        highest_score = max(attr.score for attr in all_course_attempts)

        # Update the performance fields
        perf.average_score = total_score / count
        perf.total_attempts = count
        perf.best_score = max(perf.best_score, highest_score)
        perf.last_attempt_date = timezone.now()
        
        perf.save()
