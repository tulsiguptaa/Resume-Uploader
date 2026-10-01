import os
from dotenv import load_dotenv
from mistralai.client import Mistral

load_dotenv()

api_key = os.getenv("MISTRAL_API_KEY")

print("API key found:", bool(api_key))

client = Mistral(api_key=api_key)

response = client.chat.complete(
    model="codestral-2508",
    messages=[
        {
            "role": "user",
            "content": "Reply with exactly: Mistral is working"
        }
    ]
)

print(response.choices[0].message.content)