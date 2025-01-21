# Models to use with info.

from django.db import models


class LogRecords(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    message = models.TextField()
    name = models.CharField(max_length=255)  # Name of the logger used.
    process_id = models.IntegerField()
    traceback = models.TextField()

    formatted_name = None

    class Meta:
        verbose_name = "Log record"
        verbose_name_plural = "Log records"

    def __str__(self):
        return f"{self.created} - {self.name} - {self.message[:20]}..."
