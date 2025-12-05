from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime

class Post(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    platform: str
    content: str
    author: str
    url: str
    fetched_at: datetime = Field(default_factory=datetime.utcnow)
    
class GeneratedComment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="post.id")
    content: str
    tone: str
    sentiment_score: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
    scheduled_at: Optional[datetime] = Field(default=None)
    status: str = Field(default="pending") # pending, approved, rejected, posted, scheduled
    
class Settings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str
    value: str
