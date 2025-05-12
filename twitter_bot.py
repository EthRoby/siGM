import os
import time
import tweepy
from dotenv import load_dotenv
from gpt_comment_generator import generate_comment

# 🌱 환경변수 로드
load_dotenv()

# 🛠 OAuth1 설정
auth = tweepy.OAuth1UserHandler(
    consumer_key=os.getenv("TWITTER_API_KEY"),
    consumer_secret=os.getenv("TWITTER_API_SECRET"),
    access_token=os.getenv("TWITTER_ACCESS_TOKEN"),
    access_token_secret=os.getenv("TWITTER_ACCESS_SECRET")
)
api = tweepy.API(auth)

TARGET_USERNAME = os.getenv("TARGET_USERNAME")  # .env에 @ 없이 저장
replied_tweet_ids = set()

def fetch_my_recent_tweet():
    try:
        tweets = api.user_timeline(
            screen_name=TARGET_USERNAME,
            count=5,
            tweet_mode="extended",
            exclude_replies=False,
            include_rts=False
        )

        if not tweets:
            print("🥲 새로운 트윗 없음.")
            return

        for tweet in tweets:
            if tweet.id in replied_tweet_ids:
                continue
            if tweet.in_reply_to_status_id is not None:
                continue

            print(f"✅ 감지된 트윗: {tweet.full_text}")
            reply_text = generate_comment(tweet.full_text)

            api.update_status(
                status=f"@{TARGET_USERNAME} {reply_text}",
                in_reply_to_status_id=tweet.id,
                auto_populate_reply_metadata=True
            )

            print("💬 댓글 작성 완료!")
            replied_tweet_ids.add(tweet.id)

    except Exception as e:
        print(f"❌ 오류 발생: {e}")

# 🕐 루프
if __name__ == "__main__":
    print("📡 데일리필 봇 실행 시작: 앞으로 작성하는 트윗을 감시 중...🧡")
    while True:
        fetch_my_recent_tweet()
        print("⏳ 5분 대기 후 재탐색 중...")
        time.sleep(60 * 5)  # 5분 간격

