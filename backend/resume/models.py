from django.db import models


class Resume(models.Model):
    file = models.FileField(upload_to="resumes/")
    extracted_text = models.TextField(blank=True)
    extracted_data = models.JSONField(default=dict, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name


class InterviewSession(models.Model):
    resume = models.ForeignKey(
        Resume,
        on_delete=models.CASCADE,
        related_name="interview_sessions"
    )
    interview_type = models.CharField(max_length=20)
    num_questions = models.IntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.interview_type} - Resume {self.resume.id}"

class InterviewQuestion(models.Model):
    session = models.ForeignKey(
        InterviewSession,
        on_delete=models.CASCADE,
        related_name="questions",
        null=True,
        blank=True
    )
    question = models.TextField()
    category = models.CharField(max_length=50)
    difficulty = models.CharField(max_length=20, default="medium")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.question


class InterviewAnswer(models.Model):
    question = models.OneToOneField(
        InterviewQuestion,
        on_delete=models.CASCADE,
        related_name="answer"
    )

    answer = models.TextField(blank=True)

    score = models.FloatField(null=True, blank=True)

    feedback = models.TextField(blank=True)

    strengths = models.JSONField(default=list, blank=True)

    improvements = models.JSONField(default=list, blank=True)

    evaluated = models.BooleanField(default=False)

    answered_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Answer - Question {self.question.id}"