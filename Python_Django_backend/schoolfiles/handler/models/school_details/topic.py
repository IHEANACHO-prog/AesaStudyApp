from django.db import models

class Topic(models.Model):
    name    = models.CharField(max_length=255)
    course  = models.ForeignKey('Course', on_delete=models.CASCADE, related_name='topics')

    # ADD THESE TWO NEW FIELDS ↓
    description = models.TextField(blank=True, default='')
    order       = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['course', 'order']   # auto-sorts everywhere in the app

    def __str__(self):
        return self.name
