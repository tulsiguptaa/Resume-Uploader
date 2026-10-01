import os
import json

from mistralai.client import Mistral


client = Mistral(
    api_key=os.getenv("MISTRAL_API_KEY")
)


def analyze_resume(resume_text):

    prompt = f"""
You are a resume parser.

Analyze the following resume and return ONLY valid JSON.

Extract these fields:

- name
- email
- phone
- skills
- education
- experience
- projects
- certifications

Rules:
- If information is not available, use an empty string or empty list.
- Do not invent information.
- skills must be a list of strings.
- education must be a list.
- experience must be a list.
- projects must be a list.
- certifications must be a list.

Resume:

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

    return json.loads(result)