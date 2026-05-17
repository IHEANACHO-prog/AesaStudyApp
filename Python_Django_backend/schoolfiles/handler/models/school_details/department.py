from django.db import models

class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    faculty = models.CharField(max_length=200)

    def __str__(self):
        return f"{self.name} ({self.faculty})"
