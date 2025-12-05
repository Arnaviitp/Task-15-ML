from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, create_engine, select
from typing import List
from models import Post, GeneratedComment, Settings
from nlp_engine import CommentGenerator
from datetime import datetime

app = FastAPI(title="Social Media Comment Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Setup
sqlite_file_name = "database_v2.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Initialize NLP Engine
nlp_engine = CommentGenerator()

# Mock Data Fetcher
def fetch_mock_posts():
    return [
        {
            "platform": "LinkedIn",
            "content": "Excited to announce our new partnership with Acme Corp! This collaboration will bring innovative solutions to the market. #Partnership #Innovation",
            "author": "John Doe",
            "url": "https://linkedin.com/post/123"
        },
        {
            "platform": "Twitter",
            "content": "Just had the best coffee at The Daily Grind! ☕️ #CoffeeLover #MorningVibes",
            "author": "JaneSmith",
            "url": "https://twitter.com/post/456"
        },
        {
            "platform": "Instagram",
            "content": "Sunset vibes in Bali. 🌅 Take me back! #Travel #Sunset #Bali",
            "author": "TravelBug",
            "url": "https://instagram.com/post/789"
        }
    ]

@app.post("/posts/fetch", response_model=List[Post])
def fetch_posts(session: Session = Depends(get_session)):
    """
    Simulates fetching posts from social media.
    """
    mock_data = fetch_mock_posts()
    new_posts = []
    for data in mock_data:
        # Check if exists (simple check by URL)
        existing = session.exec(select(Post).where(Post.url == data["url"])).first()
        if not existing:
            post = Post(**data)
            session.add(post)
            new_posts.append(post)
    session.commit()
    for post in new_posts:
        session.refresh(post)
    return new_posts

@app.get("/posts", response_model=List[Post])
def get_posts(session: Session = Depends(get_session)):
    return session.exec(select(Post)).all()

@app.post("/posts/create", response_model=Post)
def create_post(post: Post, session: Session = Depends(get_session)):
    session.add(post)
    session.commit()
    session.refresh(post)
    return post

@app.post("/comments/generate/{post_id}", response_model=GeneratedComment)
def generate_comment_for_post(post_id: int, tone: str = "casual", length: str = "medium", include_question: bool = False, session: Session = Depends(get_session)):
    # Rate Limiting: Check comments generated in the last hour
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(hours=1)
    
    recent_count = session.query(GeneratedComment).filter(GeneratedComment.created_at > cutoff).count()
    if recent_count >= 15:
        raise HTTPException(status_code=429, detail="Rate limit exceeded: Maximum 15 comments per hour.")

    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    result = nlp_engine.generate_comment(post.content, tone, length, include_question)
    
    comment = GeneratedComment(
        post_id=post.id,
        content=result["comment"],
        tone=tone,
        sentiment_score=result["analysis"]["sentiment"],
        status="pending"
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment

@app.get("/comments", response_model=List[GeneratedComment])
def get_comments(session: Session = Depends(get_session)):
    return session.exec(select(GeneratedComment)).all()

@app.put("/comments/{comment_id}/status")
def update_comment_status(comment_id: int, status: str, session: Session = Depends(get_session)):
    comment = session.get(GeneratedComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if status not in ["approved", "rejected", "posted", "scheduled"]:
         raise HTTPException(status_code=400, detail="Invalid status")
    
    comment.status = status
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment

@app.put("/comments/{comment_id}/content")
def update_comment_content(comment_id: int, content: str, session: Session = Depends(get_session)):
    comment = session.get(GeneratedComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    comment.content = content
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment

@app.put("/comments/{comment_id}/schedule")
def schedule_comment(comment_id: int, scheduled_time: datetime, session: Session = Depends(get_session)):
    comment = session.get(GeneratedComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    comment.status = "scheduled"
    comment.scheduled_at = scheduled_time
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment

@app.get("/analytics")
def get_analytics(session: Session = Depends(get_session)):
    total_posts = session.query(Post).count()
    total_comments = session.query(GeneratedComment).count()
    approved_comments = session.query(GeneratedComment).filter(GeneratedComment.status == "approved").count()
    
    return {
        "total_posts_analyzed": total_posts,
        "total_comments_generated": total_comments,
        "approval_rate": (approved_comments / total_comments * 100) if total_comments > 0 else 0
    }

from fastapi.responses import StreamingResponse
import io
import csv

@app.get("/analytics/export")
def export_analytics(session: Session = Depends(get_session)):
    comments = session.exec(select(GeneratedComment)).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Post ID", "Content", "Tone", "Sentiment", "Status", "Created At", "Scheduled At"])
    
    for c in comments:
        writer.writerow([c.id, c.post_id, c.content, c.tone, c.sentiment_score, c.status, c.created_at, c.scheduled_at])
        
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=analytics_report.csv"})
