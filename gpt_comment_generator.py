import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY")

def generate_comment(post_text):
    prompt = f"""
You are a supportive and encouraging assistant for the SIGN Protocol community.
Your job is to read the post below and respond with a kind, insightful, and uplifting comment
that encourages the poster to keep growing, one tweet at a time.

Language: Auto-detect.
Keep the comment under 100 characters.
Add 🧡 or 🍊 at the end — but only one.

Post:
"{post_text}"

Reply (short, warm, motivating):
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
