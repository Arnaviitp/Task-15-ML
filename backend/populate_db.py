from sqlmodel import Session, create_engine, select
import datetime
from models import Post, ConnectedAccount, Settings
from main import get_session

# Update this path if needed to point to your actual DB file
sqlite_url = "sqlite:///database_v4.db"
engine = create_engine(sqlite_url)

def populate_dummy_data():
    with Session(engine) as session:
        print("Checking accounts...")
        # ensure we have at least one account for "Simulation"
        account = session.exec(select(ConnectedAccount).where(ConnectedAccount.platform == "Twitter")).first()
        if not account:
            print("Creating dummy account...")
            account = ConnectedAccount(
                platform="Twitter",
                username="simulation_user",
                display_name="Simulation User",
                access_token="mock_token_123", # Signals simulation mode if logic supports it, or just placeholder
                is_active=True
            )
            session.add(account)
            session.commit()
            session.refresh(account)
        
        print("Creating dummy posts...")
        posts = [
            Post(
                platform="Twitter",
                content="Just launched our new product! 🚀 Can't wait for everyone to see what we've been building. #tech #launch",
                author="simulation_user",
                url="https://twitter.com/example/1",
                hashtags=["tech", "launch"],
                mentions=[],
                likes=42,
                comments_count=5,
                shares=10,
                fetched_at=datetime.datetime.utcnow()
            ),
            Post(
                platform="LinkedIn",
                content="Excited to share my thoughts on the future of AI in marketing. It's not just about automation, it's about augmentation. Read more in the comments below.",
                author="John Doe",
                url="https://linkedin.com/post/123",
                hashtags=["AI", "Marketing"],
                mentions=[],
                likes=150,
                comments_count=23,
                shares=4,
                fetched_at=datetime.datetime.utcnow()
            ),
            Post(
                platform="Instagram",
                content="Beautiful sunset at the beach today! 🌅 #nature #peace",
                author="travel_blogger",
                url="https://instagram.com/p/123",
                hashtags=["nature", "peace"],
                image_description="Sunset over ocean",
                likes=890,
                comments_count=45,
                shares=0,
                fetched_at=datetime.datetime.utcnow()
            )
        ]
        
        for p in posts:
            session.add(p)
            
        session.commit()
        print(f"Added {len(posts)} posts to the database.")

if __name__ == "__main__":
    populate_dummy_data()
