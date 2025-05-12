from dotenv import load_dotenv
import os
import time
from twitter_bot import fetch_my_recent_tweet

# 🌿 환경변수 로드
load_dotenv()

# 💡 필요시 환경변수 불러오기 예시
openai_key = os.getenv("OPENAI_API_KEY")
twitter_token = os.getenv("TWITTER_BEARER_TOKEN")

if __name__ == "__main__":
    while True:
        try:
            fetch_my_recent_tweet()
        except Exception as e:
            print(f"❌ 오류 발생: {e}")

        print("⏳ 15분 대기 중...")
        time.sleep(900)  # 15분(900초)마다 반복 실행
