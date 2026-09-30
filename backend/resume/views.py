from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Resume


@api_view(["POST"])
def upload_resume(request):
    file = request.FILES.get("file")

    if not file:
        return Response(
            {"error": "No file uploaded"},
            status=status.HTTP_400_BAD_REQUEST
        )

    resume = Resume.objects.create(file=file)

    return Response(
        {
            "message": "Resume uploaded successfully",
            "id": resume.id,
            "file": resume.file.url,
        },
        status=status.HTTP_201_CREATED
    )