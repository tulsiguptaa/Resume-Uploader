import os
import json
from mistralai.client import Mistral

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