from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlmodel import SQLModel, Session, create_engine, select
from typing import List, Optional
from models import Post, GeneratedComment, Settings, ActivityLog, AutomationTask, ConnectedAccount
from nlp_engine import CommentGenerator
from social_integrations import SocialMediaFactory
from datetime import datetime, timedelta
from pydantic import BaseModel
import io
import csv
import asyncio
import threading
import time
import os
from dotenv import load_dotenv
import secrets
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# OAuth handlers import
try:
    from oauth_handlers import get_oauth_handler, OAuthHandler
    from oauth_config import is_oauth_configured, FRONTEND_URL
    OAUTH_AVAILABLE = True
except ImportError:
    OAUTH_AVAILABLE = False
    FRONTEND_URL = "http://localhost:5173"

# In-memory OAuth state storage (use Redis in production)
oauth_states = {}

app = FastAPI(
    title="AI-Powered Social Media Comment Generator API",
    description="Generate contextually relevant, engaging comments for social media posts",
    version="2.0.0"
)

# Parse allowed origins from env, default to local dev
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    "auto_fetch_enabled": "false",
    "auto_generate_enabled": "false",
    "auto_post_enabled": "false",
    "auto_approve_enabled": "false",
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

class PostFetchResponse(BaseModel):
    count: int
    posts: List[Post]
    message: Optional[str] = None

@app.post("/posts/fetch", response_model=PostFetchResponse)
def fetch_posts(session: Session = Depends(get_session)):
    """Fetches posts from social media platforms (Real or Mock)."""
    # Get connected accounts
    connected_accounts = session.exec(select(ConnectedAccount)).all()
    connected_platforms = {acc.platform.lower() for acc in connected_accounts}
    
    new_posts = []
    
    # 1. Fetch Real Posts from Connected Accounts
    for account in connected_accounts:
        try:
            # Determine method based on account data
            # oauth2 method is stored in platform_metadata
            # If access_token starts with "mock_", it is mock.
            # If access_token is "scraper", it is scraper.
            # Else, it is Real API (including OAuth).
            
            is_oauth = account.platform_metadata.get("oauth_method") == "oauth2" if account.platform_metadata else False
            
            method = "api"
            if account.access_token == "scraper":
                 method = "scraper"
            elif account.access_token and account.access_token.startswith("mock_token_"):
                 continue # Key handled by mock logic below
            
            # Auto-refresh OAuth token if expired
            if is_oauth and account.token_expires_at and OAUTH_AVAILABLE:
                if datetime.utcnow() >= account.token_expires_at:
                    logger.info(f"Token expired for {account.platform}:{account.username}, attempting refresh...")
                    try:
                        handler = get_oauth_handler(account.platform.lower())
                        if handler and account.refresh_token:
                            token_data = handler.refresh_token(account.refresh_token)
                            if "error" not in token_data:
                                account.access_token = token_data.get("access_token", account.access_token)
                                account.refresh_token = token_data.get("refresh_token", account.refresh_token)
                                if token_data.get("expires_in"):
                                    account.token_expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
                                account.last_used_at = datetime.utcnow()
                                session.add(account)
                                session.commit()
                                log_activity(session, "token_auto_refreshed", f"Auto-refreshed token for {account.platform}: {account.username}")
                            else:
                                logger.warning(f"Token refresh failed for {account.platform}:{account.username}: {token_data.get('error')}")
                        else:
                            logger.warning(f"Cannot refresh token for {account.platform}:{account.username} - no refresh token or handler")
                    except Exception as refresh_err:
                        logger.error(f"Token refresh error: {refresh_err}")
            
            integration = SocialMediaFactory.get_integration(account.platform, method=method)
            
            # For scraper, we might not need access_token but we pass what we have
            # For Reddit, parse JSON credentials
            if account.platform.lower() == "reddit":
                try:
                    import json
                    creds = json.loads(account.access_token)
                except (json.JSONDecodeError, TypeError):
                    creds = {"access_token": account.access_token, "username": account.username}
            else:
                creds = {"access_token": account.access_token, "username": account.username}
            real_posts = integration.fetch_posts(creds)
            
            # Update last_used_at
            account.last_used_at = datetime.utcnow()
            session.add(account)
            
            for post_data in real_posts:
                existing = session.exec(select(Post).where(Post.url == post_data["url"])).first()
                if not existing:
                    post = Post(**post_data)
                    session.add(post)
                    new_posts.append(post)
                    
            if real_posts:
                log_activity(session, "posts_fetched_real", f"Fetched {len(real_posts)} posts from {account.platform} via {method}{' (OAuth)' if is_oauth else ''}")
            
        except Exception as e:
            log_activity(session, "posts_fetch_error", f"Error fetching from {account.platform}: {str(e)}")
            print(f"Error fetching from {account.platform}: {e}")

    # 2. Fetch Mock Posts (fallback or for simulated accounts)
    # Only if we have no real accounts for a platform, OR we just want to mix them in (user preference?)
    # For now, we mix them in but filter by connected platforms as before
    
    mock_data = fetch_mock_posts()
    filtered_mock_data = [
        data for data in mock_data 
        if data["platform"].lower() in connected_platforms
    ]
    
    for data in filtered_mock_data:
        # Check if we already have this Mock URL
        existing = session.exec(select(Post).where(Post.url == data["url"])).first()
        if not existing:
            post = Post(**data)
            session.add(post)
            new_posts.append(post)

    session.commit()
    for post in new_posts:
        session.refresh(post)

    # Cleanup: Remove older posts to keep the feed fresh
    # We keep the latest 50 posts per platform and delete the rest (unless they have comments)
    try:
        LIMIT_PER_PLATFORM = 50
        for platform in connected_platforms:
            # Get posts for this platform, ordered newest first
            # Note: ilike ensures case-insensitive matching
            posts = session.exec(
                select(Post)
                .where(Post.platform.ilike(platform))
                .order_by(Post.fetched_at.desc())
            ).all()

            if len(posts) > LIMIT_PER_PLATFORM:
                to_delete = posts[LIMIT_PER_PLATFORM:]
                deleted_count = 0
                for old_post in to_delete:
                    # Protection: Check if post has any generated comments
                    # We don't want to delete posts that the user is working on or has posted to
                    has_comments = session.exec(
                        select(GeneratedComment).where(GeneratedComment.post_id == old_post.id)
                    ).first()
                    
                    if not has_comments:
                        session.delete(old_post)
                        deleted_count += 1
                
                if deleted_count > 0:
                    session.commit()
                    log_activity(session, "posts_cleanup", f"Removed {deleted_count} old posts for {platform}")

    except Exception as e:
        print(f"Error cleaning up old posts: {e}")
    
    message = None
    if not connected_platforms:
        message = "No connected accounts found. Please connect an account in Settings."
        log_activity(session, "posts_fetch_skipped", message)

    if new_posts:
        log_activity(session, "posts_fetched", f"Fetched {len(new_posts)} new posts total")

    return {"count": len(new_posts), "posts": new_posts, "message": message}

@app.get("/posts", response_model=List[Post])
def get_posts(
    platform: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    session: Session = Depends(get_session)
):
    """Get all posts, optionally filtered by platform and restricted to connected accounts."""
    # Get connected platforms
    connected_accounts = session.exec(select(ConnectedAccount)).all()
    connected_platforms = {acc.platform.lower() for acc in connected_accounts}
    
    # if not connected_platforms:
    #     return []

    query = select(Post)
    
    if platform:
        # Ensure the requested platform is actually connected
        if platform.lower() not in connected_platforms:
            return []
        query = query.where(Post.platform == platform)
    else:
        # Filter for all connected platforms
        # We need to match the case stored in DB. Mock data uses Title Case.
        # We'll construct a list of valid platform strings to query.
        # This handles the main ones. For "Manual" or others, they might be filtered out if not in this list, 
        # which adheres to "only show post of connected account".
        
        # Standardize known platforms
        standard_platforms = ["Twitter", "LinkedIn", "Instagram", "Facebook", "Reddit"]
        valid_db_platforms = [p for p in standard_platforms if p.lower() in connected_platforms]
        
        # Also allow exact case matches if stored differently (e.g. if user manually added "twitter")
        # But for SQLModel in_(), we need the exact strings. 
        # Let's add the lowercase versions too just in case manual posts used them.
        for p in connected_platforms:
            if p not in [sp.lower() for sp in valid_db_platforms]:
                valid_db_platforms.append(p)
                valid_db_platforms.append(p.capitalize())

        # query = query.where(Post.platform.in_(valid_db_platforms))
        pass

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
    """Post a comment (Real API if available, else Simulated)."""
    comment = session.get(GeneratedComment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment.status != "approved":
        raise HTTPException(status_code=400, detail="Only approved comments can be posted")
    
    # Use the posting queue helper to handle real or simulated posting
    # Note: _process_posting_queue is defined later in the file
    result = _process_posting_queue(session, [comment])
    
    if result["posted_count"] > 0:
        session.refresh(comment)
        msg = "Comment posted successfully"
        
        # Check metadata from result
        meta = result.get("results_data", {}).get(comment_id)
        if meta and meta.get("url"):
             msg += f" to {meta['url']}"
        else:
             msg += " (simulated)"

        log_activity(session, "comment_posted", f"Comment ID {comment_id} posted")
        
        return {
            "message": msg,
            "comment": comment
        }
    else:
        error_msg = result["errors"][0] if result["errors"] else "Unknown posting error"
        raise HTTPException(status_code=400, detail=error_msg)

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


def _process_posting_queue(session: Session, comments: List[GeneratedComment]):
    """Helper to post a list of comments to their respective platforms."""
    posted_ids = []
    errors = []
    # Track metadata for response (since GeneratedComment doesn't have metadata field yet)
    results_data = {} 
    
    # Get all connected accounts for lookups
    connected_accounts = session.exec(select(ConnectedAccount)).all()
    accounts_by_platform = {}
    for acc in connected_accounts:
        p_lower = acc.platform.lower()
        if p_lower not in accounts_by_platform:
             accounts_by_platform[p_lower] = []
        accounts_by_platform[p_lower].append(acc)
        
    for comment in comments:
        post = session.get(Post, comment.post_id)
        if not post:
            errors.append(f"Post {comment.post_id} not found for comment {comment.id}")
            continue
            
        platform = post.platform.lower()
        
        # Check if we have an account for this platform
        accounts = accounts_by_platform.get(platform)
        if not accounts:
            if platform == "reddit":
                 errors.append(f"No connected Reddit account found for comment {comment.id}")
                 continue 
            
            # For others/mock, simulate success
            comment.status = "posted"
            comment.posted_at = datetime.utcnow()
            session.add(comment)
            posted_ids.append(comment.id)
            results_data[comment.id] = {"url": f"https://mock.com/post/{comment.id}", "id": f"mock_{comment.id}"}
            continue
            
        # Use first account
        account = accounts[0]
        
        try:
            # Prepare credentials
            if platform == "reddit":
                import json
                try:
                    creds = json.loads(account.access_token)
                except:
                    creds = {"access_token": account.access_token, "username": account.username}
            else:
                creds = {"access_token": account.access_token}
                
            integration = SocialMediaFactory.get_integration(platform, method="api")
            
            # Extract External ID (since Post model lacks it)
            external_id = str(post.id) 
            if platform == "reddit":
                 import re
                 # https://reddit.com/r/sub/comments/ID/title/
                 match = re.search(r"/comments/([a-zA-Z0-9]+)", post.url)
                 if match:
                     external_id = match.group(1)
            
            # Post comment
            result = integration.post_comment(creds, external_id, comment.content)
            
            if result.get("success"):
                comment.status = "posted"
                comment.posted_at = datetime.utcnow()
                # Store metadata in return object, not model (until schema update)
                results_data[comment.id] = {"url": result.get("url"), "id": result.get("id")}
                
                session.add(comment)
                posted_ids.append(comment.id)
            else:
                errors.append(f"Failed to post to {platform}: {result.get('error')}")

        except Exception as e:
            errors.append(f"Error posting comment {comment.id}: {str(e)}")
            
    session.commit()
    return {"posted_count": len(posted_ids), "posted_ids": posted_ids, "errors": errors, "results_data": results_data}

@app.post("/batch/post-approved")
def batch_post_approved_comments(session: Session = Depends(get_session)):
    """Post all approved comments to real platforms."""
    approved_comments = session.exec(
        select(GeneratedComment).where(GeneratedComment.status == "approved")
    ).all()
    
    result = _process_posting_queue(session, approved_comments)
    
    log_activity(session, "batch_post", f"Batch posted {result['posted_count']} approved comments")
    
    return result

@app.post("/automation/process-scheduled")
def process_scheduled_comments(session: Session = Depends(get_session)):
    """Process and post comments that are scheduled and due."""
    now = datetime.utcnow()
    scheduled_comments = session.exec(
        select(GeneratedComment)
        .where(GeneratedComment.status == "scheduled")
        .where(GeneratedComment.scheduled_time <= now)
    ).all()
    
    result = _process_posting_queue(session, scheduled_comments)
    
    log_activity(session, "process_scheduled", f"Processed {len(scheduled_comments)} scheduled comments ({result['posted_count']} posted)")
    
    return {
        "processed_count": len(scheduled_comments),
        "posted_count": result["posted_count"],
        "posted_ids": result["posted_ids"],
        "errors": result["errors"]
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
            "auto_fetch_enabled": get_setting(session, "auto_fetch_enabled") == "true",
            "auto_generate_enabled": get_setting(session, "auto_generate_enabled") == "true",
            "auto_post_enabled": get_setting(session, "auto_post_enabled") == "true",
            "auto_approve_enabled": get_setting(session, "auto_approve_enabled") == "true"
        }
    }

@app.get("/activity-logs", response_model=List[ActivityLog])
def get_activity_logs(limit: int = 50, session: Session = Depends(get_session)):
    """Get recent activity logs."""
    return session.exec(select(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(limit)).all()

@app.get("/analytics/history")
def get_analytics_history(days: int = 7, session: Session = Depends(get_session)):
    """Get historical analytics for charts."""
    now = datetime.utcnow()
    history = []
    
    for i in range(days):
        date = now - timedelta(days=i)
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        posts_count = session.query(Post).filter(Post.fetched_at >= start_of_day, Post.fetched_at <= end_of_day).count()
        comments_count = session.query(GeneratedComment).filter(GeneratedComment.created_at >= start_of_day, GeneratedComment.created_at <= end_of_day).count()
        
        history.append({
            "date": date.strftime("%Y-%m-%d"),
            "posts": posts_count,
            "comments": comments_count
        })
    
    return list(reversed(history))

# ==================== CONNECTED ACCOUNTS ====================

@app.get("/accounts", response_model=List[ConnectedAccount])
def get_connected_accounts(session: Session = Depends(get_session)):
    """Get all connected social media accounts."""
    return session.exec(select(ConnectedAccount)).all()

class ConnectAccountRequest(BaseModel):
    platform: str
    username: str
    access_token: Optional[str] = None

@app.post("/accounts/connect")
def connect_account(
    request: ConnectAccountRequest,
    session: Session = Depends(get_session)
):
    """Connect a social media account (Real or Simulated)."""
    
    # Check if already connected (by username logic, or update token if exists)
    # Ideally should check by Platform User ID, but we use username for now.
    
    platform_data = {}
    final_username = request.username
    final_token = request.access_token
    
    # 1. Scraper Mode check (Special flag in token or no token??)
    # Let's say if token is "scraper", we treat it as no-api mode
    if request.access_token == "scraper":
        final_token = "scraper"
        integration = SocialMediaFactory.get_integration(request.platform, method="scraper")
        # Validate lightly
        validation = integration.validate_token({"username": request.username})
    
    # 2. Reddit API Mode - Parse JSON credentials
    elif request.platform.lower() == "reddit" and request.access_token:
        try:
            import json
            reddit_creds = json.loads(request.access_token)
            
            integration = SocialMediaFactory.get_integration("reddit", method="api")
            validation = integration.validate_token(reddit_creds)
            
            if not validation.get("valid"):
                raise HTTPException(status_code=400, detail=f"Invalid Reddit credentials: {validation.get('error')}")
            
            # Store the JSON credentials as the token
            final_token = request.access_token
            final_username = f"r/{reddit_creds.get('subreddit', 'all')}"
            
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid Reddit credentials format")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    # 3. Real Token Mode (for other platforms)
    elif request.access_token:
        try:
            integration = SocialMediaFactory.get_integration(request.platform, method="api")
            validation = integration.validate_token({"access_token": request.access_token})
            
            if not validation.get("valid"):
                raise HTTPException(status_code=400, detail=f"Invalid Access Token: {validation.get('error')}")
            
            if validation.get("username"):
                final_username = validation["username"]
            
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    # 3. Simulation Mode
    else:
        final_token = "mock_token_" + datetime.utcnow().isoformat()
    
    # Check if exists
    existing = session.exec(
        select(ConnectedAccount)
        .where(ConnectedAccount.platform == request.platform)
        .where(ConnectedAccount.username == final_username)
    ).first()
    
    if existing:
        # Update token if re-connecting
        existing.access_token = final_token
        existing.is_active = True
        session.add(existing)
        session.commit()
        session.refresh(existing)
        log_activity(session, "account_updated", f"Updated {request.platform} account: {final_username}")
        return existing
    
    account = ConnectedAccount(
        platform=request.platform,
        username=final_username,
        display_name=final_username,
        profile_image_url=f"https://ui-avatars.com/api/?name={final_username}&background=random",
        access_token=final_token,
        scopes=["read", "write"],
        is_active=True
    )
    
    session.add(account)
    session.commit()
    session.refresh(account)
    
    log_activity(session, "account_connected", f"Connected {request.platform} account: {final_username}")
    
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

# ==================== OAUTH ENDPOINTS ====================

@app.get("/oauth/status")
def get_oauth_status():
    """Get OAuth configuration status for all platforms."""
    if not OAUTH_AVAILABLE:
        return {
            "oauth_available": False,
            "message": "OAuth handlers not properly configured. Check import errors.",
            "platforms": {}
        }
    
    platforms = ["twitter", "linkedin", "instagram"]
    status = {}
    
    for platform in platforms:
        status[platform] = {
            "configured": is_oauth_configured(platform),
            "oauth_url": f"/oauth/{platform}/authorize" if is_oauth_configured(platform) else None
        }
    
    return {
        "oauth_available": True,
        "platforms": status
    }

@app.get("/oauth/{platform}/authorize")
def oauth_authorize(platform: str, redirect_uri: Optional[str] = None):
    """Initiate OAuth flow for a platform. Returns authorization URL."""
    if not OAUTH_AVAILABLE:
        raise HTTPException(status_code=501, detail="OAuth not available on this server")
    
    platform = platform.lower()
    if platform not in ["twitter", "linkedin", "instagram"]:
        raise HTTPException(status_code=400, detail="Unsupported platform")
    
    if not is_oauth_configured(platform):
        raise HTTPException(
            status_code=400, 
            detail=f"OAuth not configured for {platform}. Please set {platform.upper()}_CLIENT_ID and {platform.upper()}_CLIENT_SECRET environment variables."
        )
    
    handler = get_oauth_handler(platform)
    if not handler:
        raise HTTPException(status_code=500, detail="Could not initialize OAuth handler")
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    
    # For Twitter, generate PKCE
    code_verifier = None
    code_challenge = None
    
    if platform == "twitter":
        code_verifier, code_challenge = handler.generate_pkce()
        auth_url = handler.get_authorization_url(state, code_challenge)
    else:
        auth_url = handler.get_authorization_url(state)
    
    # Store state with expiry (5 minutes)
    oauth_states[state] = {
        "platform": platform,
        "code_verifier": code_verifier,
        "created_at": datetime.utcnow(),
        "redirect_uri": redirect_uri or FRONTEND_URL
    }
    
    # Clean up old states (older than 5 minutes)
    cutoff = datetime.utcnow() - timedelta(minutes=5)
    expired_states = [s for s, data in oauth_states.items() if data["created_at"] < cutoff]
    for s in expired_states:
        del oauth_states[s]
    
    return {
        "authorization_url": auth_url,
        "state": state,
        "platform": platform
    }

from fastapi.responses import RedirectResponse

@app.get("/oauth/{platform}/callback")
def oauth_callback(
    platform: str,
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    error_description: str = Query(None),
    session: Session = Depends(get_session)
):
    """Handle OAuth callback from social platform."""
    if not OAUTH_AVAILABLE:
        raise HTTPException(status_code=501, detail="OAuth not available")
    
    platform = platform.lower()
    
    # Handle OAuth error
    if error:
        error_msg = error_description or error
        frontend_url = FRONTEND_URL
        return RedirectResponse(
            url=f"{frontend_url}/settings?oauth_error={error_msg}&platform={platform}"
        )
    
    if not code or not state:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/settings?oauth_error=Missing code or state&platform={platform}"
        )
    
    # Validate state
    if state not in oauth_states:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/settings?oauth_error=Invalid or expired state&platform={platform}"
        )
    
    state_data = oauth_states.pop(state)
    
    if state_data["platform"] != platform:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/settings?oauth_error=State platform mismatch&platform={platform}"
        )
    
    handler = get_oauth_handler(platform)
    
    try:
        # Exchange code for tokens
        if platform == "twitter":
            token_data = handler.exchange_code(code, state_data.get("code_verifier"))
        else:
            token_data = handler.exchange_code(code)
        
        if "error" in token_data:
            return RedirectResponse(
                url=f"{FRONTEND_URL}/settings?oauth_error={token_data['error']}&platform={platform}"
            )
        
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)
        
        # Get user info
        user_info = handler.get_user_info(access_token)
        
        if "error" in user_info:
            return RedirectResponse(
                url=f"{FRONTEND_URL}/settings?oauth_error=Failed to get user info&platform={platform}"
            )
        
        username = user_info.get("username", "unknown_user")
        display_name = user_info.get("display_name", username)
        profile_image_url = user_info.get("profile_image_url")
        
        # Calculate token expiry
        token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in) if expires_in else None
        
        # Check if account already exists
        existing = session.exec(
            select(ConnectedAccount)
            .where(ConnectedAccount.platform == platform.capitalize())
            .where(ConnectedAccount.username == username)
        ).first()
        
        if existing:
            # Update existing account
            existing.access_token = access_token
            existing.refresh_token = refresh_token
            existing.token_expires_at = token_expires_at
            existing.display_name = display_name
            existing.profile_image_url = profile_image_url or existing.profile_image_url
            existing.is_active = True
            existing.last_used_at = datetime.utcnow()
            existing.platform_metadata = {"oauth_method": "oauth2", "user_id": user_info.get("id")}
            session.add(existing)
            session.commit()
            log_activity(session, "oauth_account_updated", f"Updated {platform} account via OAuth: {username}")
        else:
            # Create new account
            account = ConnectedAccount(
                platform=platform.capitalize(),
                username=username,
                display_name=display_name,
                profile_image_url=profile_image_url or f"https://ui-avatars.com/api/?name={username}&background=random",
                access_token=access_token,
                refresh_token=refresh_token,
                token_expires_at=token_expires_at,
                scopes=token_data.get("scope", "").split(" ") if isinstance(token_data.get("scope"), str) else [],
                is_active=True,
                platform_metadata={"oauth_method": "oauth2", "user_id": user_info.get("id")}
            )
            session.add(account)
            session.commit()
            log_activity(session, "oauth_account_connected", f"Connected {platform} account via OAuth: {username}")
        
        redirect_uri = state_data.get("redirect_uri", FRONTEND_URL)
        return RedirectResponse(
            url=f"{redirect_uri}/settings?oauth_success=true&platform={platform}&username={username}"
        )
        
    except Exception as e:
        logger.error(f"OAuth callback error for {platform}: {str(e)}")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/settings?oauth_error={str(e)}&platform={platform}"
        )

@app.post("/oauth/{platform}/refresh")
def oauth_refresh_token(platform: str, account_id: int, session: Session = Depends(get_session)):
    """Refresh OAuth token for an account."""
    if not OAUTH_AVAILABLE:
        raise HTTPException(status_code=501, detail="OAuth not available")
    
    account = session.get(ConnectedAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    if account.platform.lower() != platform.lower():
        raise HTTPException(status_code=400, detail="Platform mismatch")
    
    if not account.refresh_token:
        raise HTTPException(status_code=400, detail="No refresh token available. Re-authorization required.")
    
    handler = get_oauth_handler(platform.lower())
    
    try:
        token_data = handler.refresh_token(account.refresh_token)
        
        if "error" in token_data:
            raise HTTPException(status_code=400, detail=f"Token refresh failed: {token_data['error']}")
        
        account.access_token = token_data.get("access_token", account.access_token)
        account.refresh_token = token_data.get("refresh_token", account.refresh_token)
        
        if token_data.get("expires_in"):
            account.token_expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
        
        account.last_used_at = datetime.utcnow()
        session.add(account)
        session.commit()
        
        log_activity(session, "oauth_token_refreshed", f"Refreshed token for {platform}: {account.username}")
        
        return {"success": True, "message": "Token refreshed successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token refresh error: {str(e)}")

# ==================== ADVANCED AI FEATURES ====================

@app.post("/ai/predict-engagement")
def predict_engagement(
    comment: str,
    post_content: str,
    platform: str = "default"
):
    """Predict engagement score for a comment."""
    prediction = nlp_engine.predict_engagement(comment, post_content, platform)
    return prediction

@app.post("/ai/suggest-emojis")
def suggest_emojis(
    content: str,
    platform: str = "default",
    count: int = 5
):
    """Get AI-suggested emojis for content."""
    emojis = nlp_engine.suggest_emojis(content, platform, count)
    return {"emojis": emojis, "platform": platform}

@app.post("/ai/generate-hashtags")
def generate_hashtags(
    content: str,
    platform: str = "default",
    count: int = 5
):
    """Generate relevant hashtags for content."""
    hashtags = nlp_engine.generate_hashtags(content, platform, count)
    return {"hashtags": hashtags, "platform": platform}

@app.get("/ai/optimal-posting-times/{platform}")
def get_optimal_posting_times(platform: str = "default"):
    """Get optimal posting times for a platform."""
    times = nlp_engine.get_optimal_posting_times(platform)
    return times

@app.post("/ai/enhance-comment")
def enhance_comment(
    comment: str,
    platform: str = "default",
    add_emojis: bool = True,
    add_hashtags: bool = False,
    engagement_boost: bool = True
):
    """Enhance a comment with emojis, hashtags, and engagement boosters."""
    result = nlp_engine.enhance_comment(comment, platform, add_emojis, add_hashtags, engagement_boost)
    return result

# ==================== PERSONAS ====================

from models import Persona

class PersonaCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tone: str
    keywords: List[str] = []
    template_overrides: dict = {}
    is_default: bool = False

@app.get("/personas", response_model=List[Persona])
def get_personas(session: Session = Depends(get_session)):
    """Get all AI personas."""
    return session.exec(select(Persona).order_by(Persona.name)).all()

@app.post("/personas", response_model=Persona)
def create_persona(persona_data: PersonaCreate, session: Session = Depends(get_session)):
    """Create a new AI persona."""
    # If setting as default, unset other defaults
    if persona_data.is_default:
        existing_defaults = session.exec(select(Persona).where(Persona.is_default == True)).all()
        for p in existing_defaults:
            p.is_default = False
            session.add(p)
    
    persona = Persona(**persona_data.dict())
    session.add(persona)
    session.commit()
    session.refresh(persona)
    
    log_activity(session, "persona_created", f"Created persona: {persona.name}")
    return persona

@app.put("/personas/{persona_id}")
def update_persona(
    persona_id: int,
    persona_data: PersonaCreate,
    session: Session = Depends(get_session)
):
    """Update an existing persona."""
    persona = session.get(Persona, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # If setting as default, unset other defaults
    if persona_data.is_default and not persona.is_default:
        existing_defaults = session.exec(select(Persona).where(Persona.is_default == True)).all()
        for p in existing_defaults:
            p.is_default = False
            session.add(p)
    
    for key, value in persona_data.dict().items():
        setattr(persona, key, value)
    
    session.add(persona)
    session.commit()
    session.refresh(persona)
    
    log_activity(session, "persona_updated", f"Updated persona: {persona.name}")
    return persona

@app.delete("/personas/{persona_id}")
def delete_persona(persona_id: int, session: Session = Depends(get_session)):
    """Delete a persona."""
    persona = session.get(Persona, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    session.delete(persona)
    session.commit()
    
    log_activity(session, "persona_deleted", f"Deleted persona: {persona.name}")
    return {"message": "Persona deleted successfully"}

@app.post("/personas/{persona_id}/set-default")
def set_default_persona(persona_id: int, session: Session = Depends(get_session)):
    """Set a persona as the default."""
    persona = session.get(Persona, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Unset other defaults
    existing_defaults = session.exec(select(Persona).where(Persona.is_default == True)).all()
    for p in existing_defaults:
        p.is_default = False
        session.add(p)
    
    persona.is_default = True
    session.add(persona)
    session.commit()
    
    log_activity(session, "persona_set_default", f"Set default persona: {persona.name}")
    return {"message": f"{persona.name} is now the default persona"}

# Generate comment using a specific persona
@app.post("/comments/generate-with-persona/{post_id}")
def generate_comment_with_persona(
    post_id: int,
    persona_id: int,
    length: str = "medium",
    include_question: bool = False,
    session: Session = Depends(get_session)
):
    """Generate a comment using a specific AI persona."""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    persona = session.get(Persona, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Use persona's template overrides and tone
    result = nlp_engine.generate_comment(
        post.content,
        persona.tone,
        length,
        include_question,
        post.platform,
        custom_templates=persona.template_overrides if persona.template_overrides else None
    )
    
    if result.get("flagged"):
        raise HTTPException(status_code=400, detail=result["comment"])
    
    comment = GeneratedComment(
        post_id=post.id,
        content=result["comment"],
        tone=persona.tone,
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
    
    log_activity(session, "comment_generated_with_persona", f"Generated comment using persona '{persona.name}' for post ID: {post_id}")
    
    return {
        "comment": comment,
        "persona_used": persona.name
    }

# ==================== COMMENT TEMPLATES ====================

class CommentTemplate(BaseModel):
    name: str
    content: str
    platform: str
    tone: str
    tags: List[str] = []

# In-memory template storage (could be moved to database)
saved_templates = []

@app.get("/templates")
def get_templates():
    """Get all saved comment templates."""
    return saved_templates

@app.post("/templates")
def save_template(template: CommentTemplate, session: Session = Depends(get_session)):
    """Save a comment template for reuse."""
    template_dict = template.dict()
    template_dict["id"] = len(saved_templates) + 1
    template_dict["created_at"] = datetime.utcnow().isoformat()
    saved_templates.append(template_dict)
    
    log_activity(session, "template_saved", f"Saved template: {template.name}")
    return template_dict

@app.delete("/templates/{template_id}")
def delete_template(template_id: int, session: Session = Depends(get_session)):
    """Delete a saved template."""
    global saved_templates
    saved_templates = [t for t in saved_templates if t.get("id") != template_id]
    
    log_activity(session, "template_deleted", f"Deleted template ID: {template_id}")
    return {"message": "Template deleted successfully"}

# ==================== SENTIMENT TRENDS ====================

@app.get("/analytics/sentiment-trends")
def get_sentiment_trends(
    days: int = Query(default=7, le=30),
    session: Session = Depends(get_session)
):
    """Get sentiment trends over time."""
    now = datetime.utcnow()
    trends = []
    
    for i in range(days):
        date = now - timedelta(days=i)
        start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        comments = session.exec(
            select(GeneratedComment)
            .where(GeneratedComment.created_at >= start_of_day)
            .where(GeneratedComment.created_at <= end_of_day)
        ).all()
        
        if comments:
            avg_sentiment = sum(c.sentiment_score for c in comments) / len(comments)
            avg_subjectivity = sum(c.subjectivity_score for c in comments) / len(comments)
        else:
            avg_sentiment = 0
            avg_subjectivity = 0
        
        trends.append({
            "date": date.strftime("%Y-%m-%d"),
            "avg_sentiment": round(avg_sentiment, 3),
            "avg_subjectivity": round(avg_subjectivity, 3),
            "comment_count": len(comments)
        })
    
    return list(reversed(trends))

@app.get("/analytics/tone-distribution")
def get_tone_distribution(session: Session = Depends(get_session)):
    """Get detailed tone distribution analytics."""
    tones = ["professional", "casual", "enthusiastic", "supportive"]
    distribution = {}
    
    for tone in tones:
        count = session.query(GeneratedComment).filter(GeneratedComment.tone == tone).count()
        approved = session.query(GeneratedComment).filter(
            GeneratedComment.tone == tone,
            GeneratedComment.status.in_(["approved", "posted"])
        ).count()
        
        distribution[tone] = {
            "total": count,
            "approved": approved,
            "approval_rate": round((approved / count * 100) if count > 0 else 0, 1)
        }
    
    return distribution

@app.get("/analytics/platform-performance")
def get_platform_performance(session: Session = Depends(get_session)):
    """Get performance metrics by platform."""
    platforms = ["Twitter", "LinkedIn", "Instagram"]
    performance = {}
    
    for platform in platforms:
        posts = session.query(Post).filter(Post.platform == platform).count()
        comments = session.exec(
            select(GeneratedComment)
            .join(Post)
            .where(Post.platform == platform)
        ).all()
        
        if comments:
            avg_sentiment = sum(c.sentiment_score for c in comments) / len(comments)
            posted = sum(1 for c in comments if c.status == "posted")
        else:
            avg_sentiment = 0
            posted = 0
        
        performance[platform] = {
            "total_posts": posts,
            "total_comments": len(comments) if comments else 0,
            "posted_comments": posted,
            "avg_sentiment": round(avg_sentiment, 3)
        }
    
    return performance

# ==================== HEALTH CHECK ====================

@app.get("/")
def root():
    """API Health Check and Info."""
    return {
        "name": "AI-Powered Social Media Comment Generator",
        "version": "3.0.0",
        "status": "running",
        "docs": "/docs",
        "features": [
            "Multi-platform comment generation (Twitter, LinkedIn, Instagram)",
            "Sentiment analysis and context-aware responses",
            "Multiple tone options (professional, casual, enthusiastic, supportive)",
            "Rate limiting and anti-spam protection",
            "Comment scheduling and automation",
            "Analytics and activity logging",
            "CSV export functionality",
            "AI Personas for customized comment styles",
            "Engagement prediction with scoring",
            "Smart emoji and hashtag suggestions",
            "Optimal posting time recommendations",
            "Comment enhancement with AI",
            "Sentiment trend analytics",
            "Platform performance insights"
        ]
    }

@app.get("/health")
def health_check():
    """Simple health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
