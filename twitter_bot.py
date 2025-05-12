import os
import openai
import tweepy
import time
from dotenv import load_dotenv
from gpt_comment_generator import generate_comment

# 🌱 환경변수 로드
load_dotenv()

# 🔑 트위터 API 인증
client = tweepy.Client(
    consumer_key=os.getenv("TWITTER_API_KEY"),
    consumer_secret=os.getenv("TWITTER_API_SECRET"),
    access_token=os.getenv("TWITTER_ACCESS_TOKEN"),
    access_token_secret=os.getenv("TWITTER_ACCESS_SECRET")
)

TARGET_USERNAME = "EthRoby"
replied_tweet_ids = set()

# 📡 최신 트윗 감지 및 리플라이
def fetch_my_recent_tweet():
    try:
        user = client.get_user(username=TARGET_USERNAME).data
        user_id = user.id
        response = client.get_users_tweets(id=user_id, max_results=5, tweet_fields=["in_reply_to_user_id"])

        if not response.data:
            print("🥀 새로운 트윗 없음.")
            return

        for tweet in response.data:
            if tweet.id in replied_tweet_ids:
                continue
            if tweet.in_reply_to_user_id is not None:
                continue

            print(f"✅ 감지된 트윗: {tweet.text}")
            reply_text = generate_comment(tweet.text)

            client.create_tweet(
                text=f"@{TARGET_USERNAME} {reply_text}",
                in_reply_to_tweet_id=tweet.id
            )

            print("💬 댓글 작성 완료!")
            replied_tweet_ids.add(tweet.id)

    except Exception as e:
        print(f"❌ 오류 발생: {e}")

# 🕐 루프
if __name__ == "__main__":
    print("📡 요고봇 실행 시작: 앞으로 작성하는 트윗을 감시 중...🧡")
    while True:
        fetch_my_recent_tweet()
        print("⏳ 5분 대기 후 재탐색 중...")
        time.sleep(60 * 5)  # 5분 간격
