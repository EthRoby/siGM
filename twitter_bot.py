import os
import openai
import tweepy
import time
from dotenv import load_dotenv
from gpt_comment_generator import generate_comment

load_dotenv()

client = tweepy.Client(bearer_token=os.getenv("BEARER_TOKEN"))

TARGET_USERNAME = "EthRoby"
replied_tweet_ids = set()

def fetch_my_recent_tweet():
    try:
        user = client.get_user(username=TARGET_USERNAME).data
        user_id = user.id
        response = client.get_users_tweets(id=user_id, max_results=5, tweet_fields=["in_reply_to_user_id"])

        if not response.data:
            print("🙈 새로운 트윗 없음.")
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

if __name__ == "__main__":
    print("🤖 요고봇 실행 시작. 앞으로 작성하는 트윗을 감시 중...🐾")
    while True:
        fetch_my_recent_tweet()
        print("🕒 5분 대기 후 재탐색 중...")
        time.sleep(60 * 5)  # 5분마다 체크
