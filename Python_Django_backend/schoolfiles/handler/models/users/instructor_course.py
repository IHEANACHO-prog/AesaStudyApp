from django.db import models

class InstructorCourse(models.Model):
    instructor = models.ForeignKey(
        "handler.Instructor",
        on_delete=models.CASCADE,
        related_name="course_assignments",
    )
    course = models.ForeignKey(
        "handler.Course",
        on_delete=models.CASCADE,
        related_name="instructor_assignments",
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("instructor", "course")
        ordering = ["-assigned_at"]

    def __str__(self):
        return f"{self.instructor} → {self.course}"