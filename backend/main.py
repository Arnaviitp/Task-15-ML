from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlmodel import SQLModel, Session, create_engine, select
from typing import List, Optional
from models import Post, GeneratedComment, Settings, ActivityLog, AutomationTask, ConnectedAccount
from nlp_engine import CommentGenerator
from datetime import datetime, timedelta
from pydantic import BaseModel
import io
import csv
import asyncio
import threading
import time

app = FastAPI(
    title="AI-Powered Social Media Comment Generator API",
    description="Generate contextually relevant, engaging comments for social media posts",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Setup
sqlite_file_name = "database_v4.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# Initialize NLP Engine
nlp_engine = CommentGenerator()

# Default Settings
DEFAULT_SETTINGS = {
    "rate_limit_per_hour": "15",
    "min_delay_seconds": "60",
    "max_delay_seconds": "120",
    "auto_generate_enabled": "false",
    "auto_post_enabled": "false",
    "default_tone": "casual",
    "default_length": "medium",
    "include_questions": "true",
    "selected_platforms": "twitter,linkedin,instagram"
}

def log_activity(session: Session, action: str, details: str):
    """Log an activity to the database."""
    log = ActivityLog(action=action, details=details)
    session.add(log)
    session.commit()

def get_setting(session: Session, key: str) -> str:
    """Get a setting value or return default."""
    setting = session.exec(select(Settings).where(Settings.key == key)).first()
    if setting:
        return setting.value
    return DEFAULT_SETTINGS.get(key, "")

def set_setting(session: Session, key: str, value: str):
    """Set a setting value."""
    setting = session.exec(select(Settings).where(Settings.key == key)).first()
    if setting:
        setting.value = value
        setting.updated_at = datetime.utcnow()
    else:
        setting = Settings(key=key, value=value)
    session.add(setting)
    session.commit()

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    # Initialize default settings
    with Session(engine) as session:
        for key, value in DEFAULT_SETTINGS.items():
            existing = session.exec(select(Settings).where(Settings.key == key)).first()
            if not existing:
                session.add(Settings(key=key, value=value))
        session.commit()

# ==================== POST ENDPOINTS ====================

class PostCreate(BaseModel):
    platform: str
    content: str
    author: str
    url: str
    hashtags: List[str] = []
    mentions: List[str] = []
    image_description: Optional[str] = None
    likes: int = 0
    comments_count: int = 0
    shares: int = 0

# Mock Data Fetcher with enhanced data
def fetch_mock_posts():
    return [
        {
            "platform": "LinkedIn",
            "content": "Excited to announce our new partnership with Acme Corp! This collaboration will bring innovative solutions to the market. #Partnership #Innovation #BusinessGrowth",
            "author": "John Doe",
            "url": "https://linkedin.com/post/123",
            "hashtags": ["Partnership", "Innovation", "BusinessGrowth"],
            "mentions": [],
            "likes": 245,
            "comments_count": 32,
            "shares": 18
        },
        {
            "platform": "Twitter",
            "content": "Just had the best coffee at The Daily Grind! ☕️ Anyone else tried their new oat milk latte? #CoffeeLover #MorningVibes @TheDailyGrind",
            "author": "JaneSmith",
            "url": "https://twitter.com/post/456",
            "hashtags": ["CoffeeLover", "MorningVibes"],
            "mentions": ["TheDailyGrind"],
            "likes": 89,
            "comments_count": 15,
            "shares": 3
        },
        {
            "platform": "Instagram",
            "content": "Sunset vibes in Bali. 🌅 Take me back! This trip changed my perspective on life. #Travel #Sunset #Bali #Wanderlust #BeachLife",
            "author": "TravelBug",
            "url": "https://instagram.com/post/789",
            "hashtags": ["Travel", "Sunset", "Bali", "Wanderlust", "BeachLife"],
            "mentions": [],
            "image_description": "Beautiful orange and pink sunset over the ocean with palm trees silhouetted",
            "likes": 1523,
            "comments_count": 87,
            "shares": 45
        },
        {
            "platform": "LinkedIn",
            "content": "After 10 years of hard work, I'm thrilled to share that I've been promoted to VP of Engineering! 🎉 Thank you to everyone who believed in me. #CareerGrowth #Leadership #Engineering",
            "author": "Sarah Chen",
            "url": "https://linkedin.com/post/101",
            "hashtags": ["CareerGrowth", "Leadership", "Engineering"],
            "mentions": [],
            "likes": 892,
            "comments_count": 156,
            "shares": 23
        },
        {
            "platform": "Twitter",
            "content": "Hot take: AI will create more jobs than it destroys. The key is upskilling and adapting. What do you think? 🤔 #AI #FutureOfWork #TechTrends",
            "author": "TechGuru",
            "url": "https://twitter.com/post/202",
            "hashtags": ["AI", "FutureOfWork", "TechTrends"],
            "mentions": [],
            "likes": 342,
            "comments_count": 78,
            "shares": 56
        }
    ]

@app.post("/posts/fetch", response_model=List[Post])
def fetch_posts(session: Session = Depends(get_session)):
    """Simulates fetching posts from social media platforms."""
    mock_data = fetch_mock_posts()
    new_posts = []
    for data in mock_data:
        existing = session.exec(select(Post).where(Post.url == data["url"])).first()
        if not existing:
            post = Post(**data)
            session.add(post)
            new_posts.append(post)
    session.commit()
    for post in new_posts:
        session.refresh(post)
    
    if new_posts:
        log_activity(session, "posts_fetched", f"Fetched {len(new_posts)} new posts from social media")
    
    return new_posts

@app.get("/posts", response_model=List[Post])
def get_posts(
    platform: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    session: Session = Depends(get_session)
):
    """Get all posts, optionally filtered by platform."""
    query = select(Post)
    if platform:
        query = query.where(Post.platform == platform)
    query = query.order_by(Post.fetched_at.desc()).limit(limit)
    return session.exec(query).all()

@app.post("/posts/create", response_model=Post)
def create_post(post_data: PostCreate, session: Session = Depends(get_session)):
    """Create a new post manually."""
    post = Post(**post_data.dict())
    session.add(post)
    session.commit()
    session.refresh(post)
    log_activity(session, "post_created", f"Created manual post: {post.content[:50]}...")
    return post

@app.get("/posts/{post_id}", response_model=Post)
def get_post(post_id: int, session: Session = Depends(get_session)):
    """Get a specific post by ID."""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@app.delete("/posts/{post_id}")
def delete_post(post_id: int, session: Session = Depends(get_session)):
    """Delete a post."""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    session.delete(post)
    session.commit()
    log_activity(session, "post_deleted", f"Deleted post ID: {post_id}")
    return {"message": "Post deleted successfully"}

# ==================== COMMENT ENDPOINTS ====================

class CommentGenerateRequest(BaseModel):
    tone: str = "casual"
    length: str = "medium"
    include_question: bool = False

@app.post("/comments/generate/{post_id}", response_model=GeneratedComment)
def generate_comment_for_post(
    post_id: int,
    tone: str = "casual",
    length: str = "medium",
    include_question: bool = False,
    session: Session = Depends(get_session)
):
    """Generate a comment for a specific post."""
    # Rate Limiting Check
    rate_limit = int(get_setting(session, "rate_limit_per_hour"))
    cutoff = datetime.utcnow() - timedelta(hours=1)
    recent_count = session.query(GeneratedComment).filter(GeneratedComment.created_at > cutoff).count()
    
    if recent_count >= rate_limit:
        raise HTTPException(
            status_code=429, 
            detail=f"Rate limit exceeded: Maximum {rate_limit} comments per hour. Try again later."
        )

    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Generate comment using enhanced NLP engine
    result = nlp_engine.generate_comment(
        post.content, 
        tone, 
        length, 
        include_question,
        post.platform
    )
    
    if result.get("flagged"):
        raise HTTPException(status_code=400, detail=result["comment"])
    
    comment = GeneratedComment(
        post_id=post.id,
        content=result["comment"],
        tone=tone,
        length=length,
        sentiment_score=result["analysis"]["sentiment"],
        subjectivity_score=result["analysis"]["subjectivity"],
        topics_extracted=result["analysis"]["topics"],
        has_question=include_question,
        status="pending"
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)
    
    log_activity(session, "comment_generated", f"Generated {tone} comment for post ID: {post_id}")
    
    return comment

@app.post("/comments/generate-variations/{post_id}")
def generate_comment_variations(
    post_id: int,
    count: int = 3,
    tone: str = "casual",
    session: Session = Depends(get_session)
):
    """Generate multiple comment variations for A/B testing."""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    variations = nlp_engine.generate_multiple_variations(
        post.content, 
        tone, 
        count,
        post.platform
    )
    
    return {"post_id": post_id, "variations": variations}

@app.get("/comments", response_model=List[GeneratedComment])
def get_comments(
    status: Optional[str] = None,
    post_id: Optional[int] = None,
    limit: int = Query(default=50, le=100),
    session: Session = Depends(get_session)
):
    """Get all comments with optional filtering."""
    query = select(GeneratedComment)
    if status:
        query = query.where(GeneratedComment.status == status)
    if post_id:
        query = query.where(GeneratedComment.post_id == post_id)
    query = query.order_by(GeneratedComment.created_at.desc()).limit(limit)
    return session.exec(query).all()

@app.put("/comments/{comment_id}/status")
def update_comment_status(
    comment_id: int, 
    status: str,
    session: Session = Depends(get_session)
):
    """Update comment status (approve, reject, etc.)."""
    comment = session.get(GeneratedComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    valid_statuses = ["pending", "approved", "rejected", "posted", "scheduled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    old_status = comment.status
    comment.status = status
    
    if status == "posted":
        comment.posted_at = datetime.utcnow()
    
    session.add(comment)
    session.commit()
    session.refresh(comment)
    
    log_activity(session, f"comment_{status}", f"Comment ID {comment_id} status changed: {old_status} -> {status}")
    
    return comment

@app.put("/comments/{comment_id}/content")
def update_comment_content(
    comment_id: int, 
    content: str,
    session: Session = Depends(get_session)
):
    """Edit comment content."""
    comment = session.get(GeneratedComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Validate the new content
    validation = nlp_engine.validate_comment(content)
    if not validation["valid"]:
        raise HTTPException(status_code=400, detail=f"Invalid content: {', '.join(validation['issues'])}")
    
    comment.content = content
    session.add(comment)
    session.commit()
    session.refresh(comment)
    
    log_activity(session, "comment_edited", f"Comment ID {comment_id} content updated")
    
    return comment

@app.put("/comments/{comment_id}/schedule")
def schedule_comment(
    comment_id: int, 
    scheduled_time: datetime,
    session: Session = Depends(get_session)
):
    """Schedule a comment for future posting."""
    comment = session.get(GeneratedComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if scheduled_time <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
    
    comment.status = "scheduled"
    comment.scheduled_at = scheduled_time
    session.add(comment)
    session.commit()
    session.refresh(comment)
    
    log_activity(session, "comment_scheduled", f"Comment ID {comment_id} scheduled for {scheduled_time}")
    
    return comment

@app.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, session: Session = Depends(get_session)):
    """Delete a comment."""
    comment = session.get(GeneratedComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    session.delete(comment)
    session.commit()
    log_activity(session, "comment_deleted", f"Deleted comment ID: {comment_id}")
    return {"message": "Comment deleted successfully"}

@app.post("/comments/validate")
def validate_comment(content: str):
    """Validate a comment before sending."""
    validation = nlp_engine.validate_comment(content)
    return validation

# ==================== ANALYTICS ENDPOINTS ====================

@app.get("/analytics")
def get_analytics(session: Session = Depends(get_session)):
    """Get comprehensive analytics."""
    total_posts = session.query(Post).count()
    total_comments = session.query(GeneratedComment).count()
    
    # Status breakdown
    pending_comments = session.query(GeneratedComment).filter(GeneratedComment.status == "pending").count()
    approved_comments = session.query(GeneratedComment).filter(GeneratedComment.status == "approved").count()
    rejected_comments = session.query(GeneratedComment).filter(GeneratedComment.status == "rejected").count()
    posted_comments = session.query(GeneratedComment).filter(GeneratedComment.status == "posted").count()
    scheduled_comments = session.query(GeneratedComment).filter(GeneratedComment.status == "scheduled").count()
    
    # Platform breakdown
    platform_stats = {}
    platforms = session.exec(select(Post.platform).distinct()).all()
    for platform in platforms:
        count = session.query(Post).filter(Post.platform == platform).count()
        platform_stats[platform] = count
    
    # Tone breakdown
    tone_stats = {}
    tones = session.exec(select(GeneratedComment.tone).distinct()).all()
    for tone in tones:
        count = session.query(GeneratedComment).filter(GeneratedComment.tone == tone).count()
        tone_stats[tone] = count
    
    # Average sentiment
    comments = session.exec(select(GeneratedComment)).all()
    avg_sentiment = sum(c.sentiment_score for c in comments) / len(comments) if comments else 0
    
    # Comments in last 24 hours
    last_24h = datetime.utcnow() - timedelta(hours=24)
    recent_comments = session.query(GeneratedComment).filter(GeneratedComment.created_at > last_24h).count()
    
    return {
        "total_posts_analyzed": total_posts,
        "total_comments_generated": total_comments,
        "comments_by_status": {
            "pending": pending_comments,
            "approved": approved_comments,
            "rejected": rejected_comments,
            "posted": posted_comments,
            "scheduled": scheduled_comments
        },
        "approval_rate": (approved_comments / total_comments * 100) if total_comments > 0 else 0,
        "post_rate": ((approved_comments + posted_comments) / total_comments * 100) if total_comments > 0 else 0,
        "posts_by_platform": platform_stats,
        "comments_by_tone": tone_stats,
        "average_sentiment": round(avg_sentiment, 3),
        "comments_last_24h": recent_comments
    }

@app.get("/analytics/export")
def export_analytics(session: Session = Depends(get_session)):
    """Export analytics data as CSV."""
    comments = session.exec(select(GeneratedComment)).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Post ID", "Content", "Tone", "Length", "Sentiment", 
        "Subjectivity", "Has Question", "Status", "Created At", "Scheduled At", "Posted At"
    ])
    
    for c in comments:
        writer.writerow([
            c.id, c.post_id, c.content, c.tone, c.length, c.sentiment_score,
            c.subjectivity_score, c.has_question, c.status, c.created_at, 
            c.scheduled_at, c.posted_at
        ])
        
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()), 
        media_type="text/csv", 
        headers={"Content-Disposition": "attachment; filename=comment_analytics.csv"}
    )

@app.get("/activity-logs")
def get_activity_logs(
    limit: int = Query(default=50, le=200),
    session: Session = Depends(get_session)
):
    """Get recent activity logs."""
    logs = session.exec(
        select(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(limit)
    ).all()
    return logs

# ==================== SETTINGS ENDPOINTS ====================

@app.get("/settings")
def get_all_settings(session: Session = Depends(get_session)):
    """Get all settings."""
    settings = {}
    for key in DEFAULT_SETTINGS.keys():
        settings[key] = get_setting(session, key)
    return settings

@app.put("/settings/{key}")
def update_setting(
    key: str, 
    value: str,
    session: Session = Depends(get_session)
):
    """Update a setting."""
    if key not in DEFAULT_SETTINGS:
        raise HTTPException(status_code=400, detail=f"Invalid setting key: {key}")
    
    set_setting(session, key, value)
    log_activity(session, "setting_updated", f"Setting '{key}' updated to '{value}'")
    
    return {"key": key, "value": value}

@app.post("/settings/reset")
def reset_settings(session: Session = Depends(get_session)):
    """Reset all settings to defaults."""
    for key, value in DEFAULT_SETTINGS.items():
        set_setting(session, key, value)
    
    log_activity(session, "settings_reset", "All settings reset to defaults")
    return {"message": "Settings reset to defaults", "settings": DEFAULT_SETTINGS}

# ==================== AUTOMATION ENDPOINTS ====================

@app.post("/automation/simulate-post/{comment_id}")
def simulate_post_comment(
    comment_id: int,
    session: Session = Depends(get_session)
):
    """Simulate posting a comment (with delay to mimic human behavior)."""
    comment = session.get(GeneratedComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment.status != "approved":
        raise HTTPException(status_code=400, detail="Only approved comments can be posted")
    
    # Simulate delay (would be actual API call in production)
    min_delay = int(get_setting(session, "min_delay_seconds"))
    max_delay = int(get_setting(session, "max_delay_seconds"))
    
    # Update status
    comment.status = "posted"
    comment.posted_at = datetime.utcnow()
    session.add(comment)
    session.commit()
    
    log_activity(session, "comment_posted", f"Comment ID {comment_id} posted (simulated)")
    
    return {
        "message": f"Comment posted successfully (simulated with {min_delay}-{max_delay}s delay)",
        "comment": comment
    }

@app.get("/automation/scheduled")
def get_scheduled_comments(session: Session = Depends(get_session)):
    """Get all scheduled comments that are due."""
    now = datetime.utcnow()
    due_comments = session.exec(
        select(GeneratedComment)
        .where(GeneratedComment.status == "scheduled")
        .where(GeneratedComment.scheduled_at <= now)
    ).all()
    
    return {
        "due_count": len(due_comments),
        "comments": due_comments
    }

@app.post("/automation/process-scheduled")
def process_scheduled_comments(session: Session = Depends(get_session)):
    """Process all due scheduled comments."""
    now = datetime.utcnow()
    due_comments = session.exec(
        select(GeneratedComment)
        .where(GeneratedComment.status == "scheduled")
        .where(GeneratedComment.scheduled_at <= now)
    ).all()
    
    processed = []
    for comment in due_comments:
        comment.status = "posted"
        comment.posted_at = datetime.utcnow()
        session.add(comment)
        processed.append(comment.id)
        log_activity(session, "scheduled_comment_posted", f"Scheduled comment ID {comment.id} auto-posted")
    
    session.commit()
    
    return {
        "processed_count": len(processed),
        "processed_ids": processed
    }

# ==================== BATCH OPERATIONS ====================

@app.post("/batch/approve-all")
def batch_approve_comments(session: Session = Depends(get_session)):
    """Approve all pending comments."""
    pending_comments = session.exec(
        select(GeneratedComment).where(GeneratedComment.status == "pending")
    ).all()
    
    approved_ids = []
    for comment in pending_comments:
        comment.status = "approved"
        session.add(comment)
        approved_ids.append(comment.id)
    
    session.commit()
    log_activity(session, "batch_approve", f"Batch approved {len(approved_ids)} comments")
    
    return {
        "approved_count": len(approved_ids),
        "approved_ids": approved_ids
    }

@app.post("/batch/reject-all")
def batch_reject_comments(session: Session = Depends(get_session)):
    """Reject all pending comments."""
    pending_comments = session.exec(
        select(GeneratedComment).where(GeneratedComment.status == "pending")
    ).all()
    
    rejected_ids = []
    for comment in pending_comments:
        comment.status = "rejected"
        session.add(comment)
        rejected_ids.append(comment.id)
    
    session.commit()
    log_activity(session, "batch_reject", f"Batch rejected {len(rejected_ids)} comments")
    
    return {
        "rejected_count": len(rejected_ids),
        "rejected_ids": rejected_ids
    }

@app.post("/batch/generate-all")
def batch_generate_comments(
    tone: str = "casual",
    length: str = "medium",
    limit: int = 10,
    session: Session = Depends(get_session)
):
    """Generate comments for all posts that don't have comments yet."""
    # Get posts without comments
    posts_with_comments = session.exec(
        select(GeneratedComment.post_id).distinct()
    ).all()
    
    posts = session.exec(
        select(Post).where(~Post.id.in_(posts_with_comments) if posts_with_comments else True)
        .limit(limit)
    ).all()
    
    generated = []
    errors = []
    
    for post in posts:
        try:
            result = nlp_engine.generate_comment(
                post.content, tone, length, False, post.platform
            )
            
            if not result.get("flagged"):
                comment = GeneratedComment(
                    post_id=post.id,
                    content=result["comment"],
                    tone=tone,
                    length=length,
                    sentiment_score=result["analysis"]["sentiment"],
                    subjectivity_score=result["analysis"]["subjectivity"],
                    topics_extracted=result["analysis"]["topics"],
                    has_question=False,
                    status="pending"
                )
                session.add(comment)
                generated.append({"post_id": post.id, "comment": result["comment"][:50] + "..."})
        except Exception as e:
            errors.append({"post_id": post.id, "error": str(e)})
    
    session.commit()
    log_activity(session, "batch_generate", f"Batch generated {len(generated)} comments")
    
    return {
        "generated_count": len(generated),
        "generated": generated,
        "errors": errors
    }

@app.post("/batch/post-approved")
def batch_post_approved_comments(session: Session = Depends(get_session)):
    """Post all approved comments."""
    approved_comments = session.exec(
        select(GeneratedComment).where(GeneratedComment.status == "approved")
    ).all()
    
    posted_ids = []
    for comment in approved_comments:
        comment.status = "posted"
        comment.posted_at = datetime.utcnow()
        session.add(comment)
        posted_ids.append(comment.id)
    
    session.commit()
    log_activity(session, "batch_post", f"Batch posted {len(posted_ids)} approved comments")
    
    return {
        "posted_count": len(posted_ids),
        "posted_ids": posted_ids
    }

@app.get("/automation/status")
def get_automation_status(session: Session = Depends(get_session)):
    """Get current automation status and statistics."""
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    last_hour = now - timedelta(hours=1)
    
    # Get various counts
    pending_count = session.query(GeneratedComment).filter(GeneratedComment.status == "pending").count()
    approved_count = session.query(GeneratedComment).filter(GeneratedComment.status == "approved").count()
    scheduled_count = session.query(GeneratedComment).filter(GeneratedComment.status == "scheduled").count()
    
    # Due scheduled comments
    due_comments = session.query(GeneratedComment).filter(
        GeneratedComment.status == "scheduled",
        GeneratedComment.scheduled_at <= now
    ).count()
    
    # Rate limit status
    rate_limit = int(get_setting(session, "rate_limit_per_hour"))
    recent_count = session.query(GeneratedComment).filter(GeneratedComment.created_at > last_hour).count()
    
    # Recent activity
    recent_posts = session.query(Post).filter(Post.fetched_at > last_24h).count()
    recent_comments = session.query(GeneratedComment).filter(GeneratedComment.created_at > last_24h).count()
    recent_posted = session.query(GeneratedComment).filter(
        GeneratedComment.status == "posted",
        GeneratedComment.posted_at > last_24h
    ).count()
    
    return {
        "current_time": now.isoformat(),
        "queue_status": {
            "pending": pending_count,
            "approved": approved_count,
            "scheduled": scheduled_count,
            "due_for_posting": due_comments
        },
        "rate_limit": {
            "limit_per_hour": rate_limit,
            "used_this_hour": recent_count,
            "remaining": max(0, rate_limit - recent_count)
        },
        "last_24h_activity": {
            "posts_fetched": recent_posts,
            "comments_generated": recent_comments,
            "comments_posted": recent_posted
        },
        "automation_settings": {
            "auto_generate_enabled": get_setting(session, "auto_generate_enabled") == "true",
            "auto_post_enabled": get_setting(session, "auto_post_enabled") == "true"
        }
    }

# ==================== CONNECTED ACCOUNTS ====================

@app.get("/accounts", response_model=List[ConnectedAccount])
def get_connected_accounts(session: Session = Depends(get_session)):
    """Get all connected social media accounts."""
    return session.exec(select(ConnectedAccount)).all()

class ConnectAccountRequest(BaseModel):
    platform: str
    username: str

@app.post("/accounts/connect")
def connect_account(
    request: ConnectAccountRequest,
    session: Session = Depends(get_session)
):
    """Simulate connecting a social media account."""
    # In a real app, this would handle OAuth callbacks or generate auth URLs
    # For this demo, we'll simulate a successful connection
    
    # Check if already connected
    existing = session.exec(
        select(ConnectedAccount)
        .where(ConnectedAccount.platform == request.platform)
        .where(ConnectedAccount.username == request.username)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Account already connected")
    
    account = ConnectedAccount(
        platform=request.platform,
        username=request.username,
        display_name=request.username,  # Using username as display name for demo
        profile_image_url=f"https://ui-avatars.com/api/?name={request.username}&background=random",
        access_token="mock_token_" + datetime.utcnow().isoformat(),
        scopes=["read", "write"],
        is_active=True
    )
    
    session.add(account)
    session.commit()
    session.refresh(account)
    
    log_activity(session, "account_connected", f"Connected {request.platform} account: {request.username}")
    
    return account

@app.delete("/accounts/{account_id}")
def disconnect_account(account_id: int, session: Session = Depends(get_session)):
    """Disconnect a social media account."""
    account = session.get(ConnectedAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    session.delete(account)
    session.commit()
    
    log_activity(session, "account_disconnected", f"Disconnected {account.platform} account: {account.username}")
    
    return {"message": "Account disconnected successfully"}

# ==================== HEALTH CHECK ====================

@app.get("/")
def root():
    """API Health Check and Info."""
    return {
        "name": "AI-Powered Social Media Comment Generator",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
        "features": [
            "Multi-platform comment generation (Twitter, LinkedIn, Instagram)",
            "Sentiment analysis and context-aware responses",
            "Multiple tone options (professional, casual, enthusiastic, supportive)",
            "Rate limiting and anti-spam protection",
            "Comment scheduling and automation",
            "Analytics and activity logging",
            "CSV export functionality"
        ]
    }

@app.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
