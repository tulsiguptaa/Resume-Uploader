import json

from mistralai.client import Mistral
from django.conf import settings


client = Mistral(
    api_key=settings.MISTRAL_API_KEY
)


def evaluate_answer(question, answer):

    prompt = f"""
You are an expert technical and HR interviewer.

Evaluate the candidate's answer to the interview question.

QUESTION:
{question.question}

CATEGORY:
{question.category}

DIFFICULTY:
{question.difficulty}

CANDIDATE ANSWER:
{answer}

Evaluate based on:

1. Correctness
2. Relevance
3. Understanding
4. Depth
5. Communication clarity
6. Technical accuracy where applicable

Give a score from 0 to 10.

Return ONLY valid JSON:

{{
    "score": 0,
    "feedback": "",
    "strengths": [],
    "improvements": []
}}

Rules:

- score must be between 0 and 10.
- Do not give a high score just because the answer is long.
- Do not penalize a concise but correct answer.
- For HR questions, evaluate communication and substance.
- For technical questions, prioritize correctness and understanding.
- If the answer is empty, score it 0.
- Never invent information about the candidate.
"""

    try:
        response = client.chat.complete(
            model="mistral-small-latest",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert interview evaluator. Return only valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2,
        )

        content = response.choices[0].message.content.strip()

        if content.startswith("```"):
            content = content.replace("```json", "")
            content = content.replace("```", "")
            content = content.strip()

        return json.loads(content)

    except json.JSONDecodeError:
        raise Exception("AI returned invalid evaluation JSON.")

    except Exception as e:
        raise Exception(
            f"Answer evaluation failed: {str(e)}"
        )