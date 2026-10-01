import fitz
import pytesseract

from PIL import Image
from pdf2image import convert_from_path

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

    # First try normal PDF text extraction
       pdf = fitz.open(resume.file.path)

       for page in pdf:
        extracted_text += page.get_text()

       pdf.close()

    # If no text was found, treat it as a scanned PDF
       if not extracted_text.strip():

           print("No text found. Running OCR on scanned PDF...")

           pages = convert_from_path(
            resume.file.path,
            poppler_path=r"C:\Users\tulsi\Downloads\Release-26.09.0-0\poppler-26.09.0\Library\bin"
            )

           for page in pages:
               extracted_text += pytesseract.image_to_string(page)

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

@api_view(["GET"])
def resume_list(request):
    resumes = Resume.objects.all().order_by("-uploaded_at")

    data = []

    for resume in resumes:
        data.append({
            "id": resume.id,
            "file": resume.file.url,
            "uploaded_at": resume.uploaded_at,
            "extracted_data": resume.extracted_data,
        })

    return Response(data)