import fitz
import pytesseract

from PIL import Image
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Resume
from .ai import analyze_resume


@api_view(["POST"])
def upload_resume(request):
    file = request.FILES.get("file")

    if not file:
        return Response(
            {"error": "No file uploaded"},
            status=status.HTTP_400_BAD_REQUEST
        )

    resume = Resume.objects.create(file=file)

    extracted_text = ""

    # PDF
    if file.name.lower().endswith(".pdf"):
        pdf = fitz.open(resume.file.path)

        for page in pdf:
            extracted_text += page.get_text()

        pdf.close()

    # Image
    elif file.name.lower().endswith(
        (".png", ".jpg", ".jpeg")
    ):
        image = Image.open(resume.file.path)
        extracted_text = pytesseract.image_to_string(image)

    else:
        resume.delete()

        return Response(
            {"error": "Only PDF, PNG and JPG files are supported."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not extracted_text.strip():
        return Response(
            {"error": "Could not extract text from the resume."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Save extracted text
    resume.extracted_text = extracted_text
    resume.save()

# Analyze with Mistral
    try:
       resume_data = analyze_resume(extracted_text)
       resume.extracted_data = resume_data
       resume.save()

    except Exception as e:
        print("Mistral API error:", e)
 
        return Response(
           {
            "error": "Resume text was extracted, but AI analysis is temporarily unavailable.",
            "details": str(e),
            "extracted_text": extracted_text,
          },
        status=status.HTTP_503_SERVICE_UNAVAILABLE
    )

    return Response(
    {
        "message": "Resume processed successfully",
        "id": resume.id,
        "file": resume.file.url,
        "extracted_text": extracted_text,
        "resume_data": resume_data,
    },
    status=status.HTTP_201_CREATED
)