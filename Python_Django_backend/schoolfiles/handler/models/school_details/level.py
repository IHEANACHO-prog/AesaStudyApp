from django.db import models

class Level(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name
