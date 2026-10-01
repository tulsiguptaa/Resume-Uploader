from django.db import models


class Resume(models.Model):
    file = models.FileField(upload_to="resumes/")
    extracted_text = models.TextField(blank=True)
    extracted_data = models.JSONField(default=dict, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name