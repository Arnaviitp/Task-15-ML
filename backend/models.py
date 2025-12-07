from typing import Optional, List
from sqlmodel import Field, SQLModel, Column, JSON
from datetime import datetime

class Post(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    platform: str  # Twitter, LinkedIn, Instagram, Manual
    content: str
    author: str
    url: str
    # Enhanced fields
    hashtags: List[str] = Field(default=[], sa_column=Column(JSON))
    mentions: List[str] = Field(default=[], sa_column=Column(JSON))
    image_description: Optional[str] = Field(default=None)
    likes: int = Field(default=0)
    comments_count: int = Field(default=0)
    shares: int = Field(default=0)
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    
class GeneratedComment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="post.id")
    content: str
    tone: str
    length: str = Field(default="medium")
    sentiment_score: float
    subjectivity_score: float = Field(default=0.0)
    topics_extracted: List[str] = Field(default=[], sa_column=Column(JSON))
    has_question: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    scheduled_at: Optional[datetime] = Field(default=None)
    posted_at: Optional[datetime] = Field(default=None)
    status: str = Field(default="pending")  # pending, approved, rejected, posted, scheduled
    
class Settings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(unique=True)
    value: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ActivityLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    action: str  # post_fetched, comment_generated, comment_approved, comment_posted, etc.
    details: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class AutomationTask(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task_type: str  # auto_generate, auto_post, scheduled_post
    status: str = Field(default="pending")  # pending, running, completed, failed
    comment_id: Optional[int] = Field(default=None)
    scheduled_for: datetime
    executed_at: Optional[datetime] = Field(default=None)
    result: Optional[str] = Field(default=None)

class ConnectedAccount(SQLModel, table=True):
    """Store connected social media accounts with OAuth tokens."""
    id: Optional[int] = Field(default=None, primary_key=True)
    platform: str  # twitter, linkedin, instagram
    username: str
    display_name: str
    profile_image_url: Optional[str] = Field(default=None)
    access_token: str  # Encrypted in production
    refresh_token: Optional[str] = Field(default=None)
    token_expires_at: Optional[datetime] = Field(default=None)
    scopes: List[str] = Field(default=[], sa_column=Column(JSON))
    is_active: bool = Field(default=True)
    connected_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = Field(default=None)
    platform_metadata: dict = Field(default={}, sa_column=Column(JSON))  # Platform-specific data

class Persona(SQLModel, table=True):
    """Custom AI Personalities for comment generation."""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    tone: str  # maps to underlying tone in NLP engine or overrides it
    keywords: List[str] = Field(default=[], sa_column=Column(JSON))  # Keywords to emphasize
    template_overrides: dict = Field(default={}, sa_column=Column(JSON))  # Custom templates per platform
    is_active: bool = Field(default=True)
    is_default: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

