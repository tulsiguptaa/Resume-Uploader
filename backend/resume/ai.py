import os
import json
from mistralai.client import Mistral
from .models import Resume, InterviewQuestion, InterviewSession

client = Mistral(
    api_key=os.getenv("MISTRAL_API_KEY")
)


def analyze_resume(resume_text):

    prompt = f"""
You are a professional resume parser.

Analyze the resume below and return ONLY valid JSON.

You MUST follow this exact structure:

{{
    "name": "",
    "email": "",
    "phone": "",

    "skills": [],

    "education": [
        {{
            "degree": "",
            "institution": "",
            "year": "",
            "description": ""
        }}
    ],

    "experience": [
        {{
            "role": "",
            "company": "",
            "duration": "",
            "description": ""
        }}
    ],

    "projects": [
        {{
            "name": "",
            "tech_stack": [],
            "description": ""
        }}
    ],

    "certifications": []
}}

RULES:

1. Do not invent information.
2. If information is missing, use an empty string or empty list.
3. skills MUST always be a list of strings.
4. education MUST always be a list of objects using exactly:
   degree, institution, year, description
5. experience MUST always be a list of objects using exactly:
   role, company, duration, description
6. projects MUST always be a list of objects using exactly:
   name, tech_stack, description
7. tech_stack MUST always be a list of strings.
8. certifications MUST always be a list of strings.
9. Do not add extra fields.
10. Return ONLY JSON. Do not include markdown or explanations.

RESUME:

{resume_text}
"""

    response = client.chat.complete(
        model="codestral-2508",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        response_format={
            "type": "json_object"
        }
    )

    result = response.choices[0].message.content

    data = json.loads(result)

    return validate_resume_data(data)

def validate_resume_data(data):

    required_fields = [
        "name",
        "email",
        "phone",
        "skills",
        "education",
        "experience",
        "projects",
        "certifications",
    ]

    # Make sure all required fields exist
    for field in required_fields:
        if field not in data:
            data[field] = [] if field in [
                "skills",
                "education",
                "experience",
                "projects",
                "certifications"
            ] else ""

    # Make sure list fields are actually lists
    list_fields = [
        "skills",
        "education",
        "experience",
        "projects",
        "certifications"
    ]

    for field in list_fields:
        if not isinstance(data[field], list):
            data[field] = []

    return data

def generate_questions(resume_data, interview_type, num_questions=5):
    skills = resume_data.get("skills", [])
    projects = resume_data.get("projects", [])
    experience = resume_data.get("experience", [])
    if interview_type == "technical":
        interview_rules = """
- Focus mainly on technical skills, technologies, projects, and technical experience.
- Questions should cover multiple technologies when possible.
- Include questions about the candidate's projects.
- If experience is available, include questions about technical experience.
- Avoid generating all questions from only one skill.
"""

    elif interview_type == "hr":
       interview_rules = """
- Focus on background, education, experience, projects, strengths, weaknesses, motivation, and career goals.
- Do not ask deep technical questions.
- Cover different aspects of the candidate's background.
- Avoid asking multiple questions that test the same thing.
"""

    elif interview_type == "mock":
        interview_rules = """
- Create a realistic mixture of technical and HR questions.
- Cover skills, projects, experience, background, and career goals.
- Avoid generating all questions from only one area.
- Make the interview feel similar to a real company interview.
"""

    else:
        interview_rules = """
- Generate general resume-based interview questions.
"""

    prompt = f"""
    Interview Type:
{interview_type}
    Generate exactly {num_questions} questions.
You are a professional technical interviewer.

Generate 5 technical interview questions based ONLY on these skills:

Skills:
{skills}
Projects:
{projects}
Experience:
{experience}
Interview-specific rules:
{interview_rules}

Rules:
1. Questions must be relevant to the provided resume data and selected interview type.
2. Do not invent skills.
3. Questions should test understanding, not just definitions.
4. Return ONLY valid JSON.
5. Use exactly this structure
{{
    "questions": [
        {{
            "question": "",
            "category": "technical",
            "difficulty": "easy"
        }}
    ]
}}
6. difficulty MUST be one of: easy, medium, hard.
7. Use easy for basic understanding questions.
8. Use medium for practical/application questions.
9. Use hard for deeper reasoning or problem-solving questions.
10. At least 2 questions must be directly related to the candidate's projects.
11. If experience is available, generate at least 1 question directly related to the candidate's experience.
12. Generate exactly the requested number of questions. Do not generate more or fewer.:


"""

    response = client.chat.complete(
        model="codestral-2508",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        response_format={
            "type": "json_object"
        }
    )

    result = response.choices[0].message.content

    data = json.loads(result)

    return data

def generate_resume_questions(resume_id, interview_type, num_questions=5):

    resume = Resume.objects.get(id=resume_id)
    session = InterviewSession.objects.create(
    resume=resume,
    interview_type=interview_type,
    num_questions=num_questions
)

    resume_data = resume.extracted_data

    questions_data = generate_questions(resume_data, interview_type,  num_questions)

    for item in questions_data.get("questions", []):
        InterviewQuestion.objects.create(
    session=session,
    question=item["question"],
    category=item["category"],
    difficulty=item["difficulty"]
)

    return {
    "session_id": session.id,
    "interview_type": session.interview_type,
    "questions": questions_data.get("questions", [])
}