from django.db import models

class Answer(models.Model):
    attempt = models.ForeignKey("handler.Attempt", on_delete=models.CASCADE)
    question = models.ForeignKey("handler.Question", on_delete=models.CASCADE)
    selected_option = models.ForeignKey("handler.Option", on_delete=models.CASCADE)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return f"Answer to {self.question} ({'Correct' if self.is_correct else 'Incorrect'})"
