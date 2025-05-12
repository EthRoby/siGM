import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY")

def generate_comment(post_text):
    prompt = f"""
You are a helpful and encouraging assistant. Read the post below and write a kind and thoughtful comment in reply.

Post: "{post_text}"

Comment (keep it short, friendly, and insightful):
"""

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=60,
            temperature=0.8
        )
        return response.choices[0].message["content"].strip()
    except Exception as e:
        return f"[Error generating comment] {str(e)}"
