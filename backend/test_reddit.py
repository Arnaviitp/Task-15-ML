"""Test Reddit Integration"""
import json
from social_integrations import RedditIntegration

# Test the Reddit integration
reddit = RedditIntegration()

# Get the stored credentials from database
from sqlmodel import Session, create_engine, select
from models import ConnectedAccount

engine = create_engine("sqlite:///database_v4.db", connect_args={"check_same_thread": False})

with Session(engine) as session:
    accounts = session.exec(select(ConnectedAccount)).all()
    
    for acc in accounts:
        print(f"\n=== Account: {acc.platform} - {acc.username} ===")
        print(f"Token preview: {acc.access_token[:50] if acc.access_token else 'None'}...")
        
        if acc.platform.lower() == "reddit":
            try:
                creds = json.loads(acc.access_token)
                print(f"Parsed creds: {list(creds.keys())}")
                
                # Test fetch
                print("\nAttempting to fetch posts...")
                posts = reddit.fetch_posts(creds)
                print(f"Fetched {len(posts)} posts!")
                
                for i, post in enumerate(posts[:3]):
                    print(f"\n  Post {i+1}: {post['content'][:100]}...")
                    print(f"  Author: {post['author']}, Score: {post['likes']}")
                    
            except json.JSONDecodeError as e:
                print(f"JSON Error: {e}")
            except Exception as e:
                print(f"Error: {e}")
                import traceback
                traceback.print_exc()
