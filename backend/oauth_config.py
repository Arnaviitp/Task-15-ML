"""
OAuth Configuration for Social Media Platforms.

IMPORTANT: In production, these values should come from environment variables.
Never commit actual credentials to version control.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Base URL for OAuth callbacks (should match your deployment)
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ==================== TWITTER / X ====================
# Get credentials from: https://developer.twitter.com/en/portal/dashboard
TWITTER_CONFIG = {
    "client_id": os.getenv("TWITTER_CLIENT_ID", ""),
    "client_secret": os.getenv("TWITTER_CLIENT_SECRET", ""),
    "redirect_uri": f"{BASE_URL}/oauth/twitter/callback",
    "scopes": ["tweet.read", "users.read", "offline.access"],
    "auth_url": "https://twitter.com/i/oauth2/authorize",
    "token_url": "https://api.twitter.com/2/oauth2/token",
}

# ==================== LINKEDIN ====================
# Get credentials from: https://www.linkedin.com/developers/apps
LINKEDIN_CONFIG = {
    "client_id": os.getenv("LINKEDIN_CLIENT_ID", ""),
    "client_secret": os.getenv("LINKEDIN_CLIENT_SECRET", ""),
    "redirect_uri": f"{BASE_URL}/oauth/linkedin/callback",
    "scopes": ["r_liteprofile", "r_emailaddress", "w_member_social"],
    "auth_url": "https://www.linkedin.com/oauth/v2/authorization",
    "token_url": "https://www.linkedin.com/oauth/v2/accessToken",
}

# ==================== INSTAGRAM (Meta/Facebook) ====================
# Get credentials from: https://developers.facebook.com/apps
INSTAGRAM_CONFIG = {
    "client_id": os.getenv("INSTAGRAM_CLIENT_ID", ""),  # App ID
    "client_secret": os.getenv("INSTAGRAM_CLIENT_SECRET", ""),  # App Secret
    "redirect_uri": f"{BASE_URL}/oauth/instagram/callback",
    "scopes": ["user_profile", "user_media"],
    "auth_url": "https://api.instagram.com/oauth/authorize",
    "token_url": "https://api.instagram.com/oauth/access_token",
    "long_lived_token_url": "https://graph.instagram.com/access_token",
}

def get_oauth_config(platform: str) -> dict:
    """Get OAuth configuration for a specific platform."""
    configs = {
        "twitter": TWITTER_CONFIG,
        "linkedin": LINKEDIN_CONFIG,
        "instagram": INSTAGRAM_CONFIG,
    }
    return configs.get(platform.lower(), {})

def is_oauth_configured(platform: str) -> bool:
    """Check if OAuth credentials are configured for a platform."""
    config = get_oauth_config(platform)
    return bool(config.get("client_id") and config.get("client_secret"))
