import fitz
import pytesseract

from PIL import Image
from pdf2image import convert_from_path
from django.views.decorators.csrf import csrf_exempt
from .models import InterviewQuestion, InterviewAnswer
from .services.interview_evaluator import evaluate_answer
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import Resume, InterviewQuestion, InterviewSession, InterviewAnswer
from .ai import analyze_resume, generate_resume_questions

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


@api_view(["DELETE"])
def delete_resume(request, resume_id):
    try:
        resume = Resume.objects.get(id=resume_id)
    except Resume.DoesNotExist:
        return Response(
            {"error": "Resume not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Delete the uploaded file
    if resume.file:
        resume.file.delete(save=False)

    # Delete database record
    resume.delete()

    return Response(
        {"message": "Resume deleted successfully"},
        status=status.HTTP_200_OK
    )

@api_view(["GET"])
def resume_detail(request, resume_id):
    try:
        resume = Resume.objects.get(id=resume_id)
    except Resume.DoesNotExist:
        return Response(
            {"error": "Resume not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response({
        "id": resume.id,
        "file": resume.file.url,
        "uploaded_at": resume.uploaded_at,
        "extracted_text": resume.extracted_text,
        "extracted_data": resume.extracted_data,
    })

@api_view(["POST"])
@csrf_exempt
def generate_questions_api(request, resume_id):
    interview_type = request.data.get("interview_type", "technical")
    num_questions = request.data.get(
    "num_questions",
    5
)
    allowed_types = ["technical", "hr", "mock"]

    if interview_type not in allowed_types:
        return Response(
        {
            "error": "Invalid interview type. Choose technical, hr, or mock."
        },
        status=status.HTTP_400_BAD_REQUEST
    )
    try:
         num_questions = int(num_questions)
    except (TypeError, ValueError):
        return Response(
        {
            "error": "num_questions must be a number."
        },
        status=status.HTTP_400_BAD_REQUEST
    )

    if num_questions < 1 or num_questions > 20:
        return Response(
        {
            "error": "num_questions must be between 1 and 20."
        },
        status=status.HTTP_400_BAD_REQUEST
    )
    try:
        questions = generate_resume_questions(resume_id, interview_type, num_questions)

        return Response(
    {
        "message": "Questions generated successfully",
        "session_id": questions["session_id"],
        "interview_type": questions["interview_type"],
        "questions": questions["questions"]
    },
    status=status.HTTP_200_OK
)

    except Resume.DoesNotExist:
        return Response(
            {"error": "Resume not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["GET"])
def get_session_questions(request, session_id):
    try:
        session = InterviewSession.objects.get(id=session_id)

        questions = InterviewQuestion.objects.filter(
            session=session
        ).order_by("created_at")

        data = []

        for question in questions:
            data.append({
                "id": question.id,
                "question": question.question,
                "category": question.category,
                "difficulty": question.difficulty,
                "created_at": question.created_at,
            })

        return Response(
            {
                "session_id": session.id,
                "interview_type": session.interview_type,
                "questions": data
            },
            status=status.HTTP_200_OK
        )

    except InterviewSession.DoesNotExist:
        return Response(
            {"error": "Interview session not found"},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(["GET"])
def get_resume_sessions(request, resume_id):
    try:
        resume = Resume.objects.get(id=resume_id)

        sessions = InterviewSession.objects.filter(
            resume=resume
        ).order_by("-created_at")

        data = []

        for session in sessions:
            data.append({
                "id": session.id,
                "interview_type": session.interview_type,
                "num_questions": session.num_questions,
                "created_at": session.created_at,
            })

        return Response(data, status=status.HTTP_200_OK)

    except Resume.DoesNotExist:
        return Response(
            {"error": "Resume not found"},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(["POST"])
@csrf_exempt
def save_interview_answer(request, question_id):

    try:
        question = InterviewQuestion.objects.get(
            id=question_id
        )

        answer_text = request.data.get("answer", "")

        answer, created = InterviewAnswer.objects.update_or_create(
            question=question,
            defaults={
                "answer": answer_text
            }
        )

        return Response(
            {
                "message": "Answer saved successfully",
                "answer_id": answer.id,
                "question_id": question.id,
                "answer": answer.answer,
                "created": created
            },
            status=status.HTTP_200_OK
        )

    except InterviewQuestion.DoesNotExist:
        return Response(
            {"error": "Question not found"},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(["POST"])
@csrf_exempt
def evaluate_interview_answer(request, question_id):
    try:
        question = InterviewQuestion.objects.get(
            id=question_id
        )

        answer_text = request.data.get("answer", "").strip()

        if not answer_text:
            return Response(
                {"error": "Answer cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Evaluate using AI
        evaluation = evaluate_answer(
            question,
            answer_text
        )

        # Save answer + evaluation
        answer, created = InterviewAnswer.objects.update_or_create(
            question=question,
            defaults={
                "answer": answer_text,
                "score": evaluation.get("score"),
                "feedback": evaluation.get("feedback", ""),
                "strengths": evaluation.get("strengths", []),
                "improvements": evaluation.get("improvements", []),
                "evaluated": True,
            }
        )

        return Response(
            {
                "message": "Answer evaluated successfully",
                "answer_id": answer.id,
                "question_id": question.id,
                "evaluation": {
                    "score": answer.score,
                    "feedback": answer.feedback,
                    "strengths": answer.strengths,
                    "improvements": answer.improvements,
                }
            },
            status=status.HTTP_200_OK
        )

    except InterviewQuestion.DoesNotExist:
        return Response(
            {"error": "Question not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["GET"])
def get_interview_report(request, session_id):

    try:
        session = InterviewSession.objects.get(
            id=session_id
        )

        questions = InterviewQuestion.objects.filter(
            session=session
        ).order_by("created_at")

        report = []
        total_score = 0
        evaluated_count = 0

        all_strengths = []
        all_improvements = []

        for question in questions:

            try:
                answer = question.answer
            except InterviewAnswer.DoesNotExist:
                answer = None

            item = {
                "question_id": question.id,
                "question": question.question,
                "category": question.category,
                "difficulty": question.difficulty,
                "answer": answer.answer if answer else "",
                "score": answer.score if answer else None,
                "feedback": answer.feedback if answer else "",
                "strengths": answer.strengths if answer else [],
                "improvements": answer.improvements if answer else [],
                "evaluated": answer.evaluated if answer else False,
            }

            report.append(item)

            if answer and answer.evaluated:
                total_score += answer.score or 0
                evaluated_count += 1

                all_strengths.extend(
                    answer.strengths or []
                )

                all_improvements.extend(
                    answer.improvements or []
                )

        average_score = (
            round(total_score / evaluated_count, 2)
            if evaluated_count
            else 0
        )

        return Response({
            "session_id": session.id,
            "interview_type": session.interview_type,
            "total_questions": questions.count(),
            "evaluated_questions": evaluated_count,
            "total_score": total_score,
            "average_score": average_score,
            "strengths": all_strengths,
            "improvements": all_improvements,
            "questions": report,
        })

    except InterviewSession.DoesNotExist:
        return Response(
            {"error": "Interview session not found"},
            status=status.HTTP_404_NOT_FOUND
        )