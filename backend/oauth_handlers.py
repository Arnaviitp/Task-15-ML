"""
OAuth 2.0 Handlers for Social Media Platforms.

Each handler implements:
1. get_authorization_url() - Generate OAuth authorization URL
2. exchange_code() - Exchange authorization code for access token
3. refresh_token() - Refresh expired access tokens
4. get_user_info() - Get authenticated user's profile info
"""

import requests
import base64
import hashlib
import secrets
import logging
from urllib.parse import urlencode
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple

from oauth_config import get_oauth_config, FRONTEND_URL

logger = logging.getLogger(__name__)


class OAuthHandler:
    """Base OAuth handler class."""
    
    platform: str = ""
    
    def __init__(self):
        self.config = get_oauth_config(self.platform)
    
    def get_authorization_url(self, state: str) -> str:
        raise NotImplementedError
    
    def exchange_code(self, code: str, code_verifier: str = None) -> Dict[str, Any]:
        raise NotImplementedError
    
    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        raise NotImplementedError
    
    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        raise NotImplementedError
    
    @staticmethod
    def generate_pkce() -> Tuple[str, str]:
        """Generate PKCE code verifier and challenge for OAuth 2.0."""
        code_verifier = secrets.token_urlsafe(64)[:128]
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).decode().rstrip("=")
        return code_verifier, code_challenge


class TwitterOAuthHandler(OAuthHandler):
    """Twitter OAuth 2.0 with PKCE handler."""
    
    platform = "twitter"
    
    def get_authorization_url(self, state: str, code_challenge: str) -> str:
        """Generate Twitter OAuth 2.0 authorization URL."""
        params = {
            "response_type": "code",
            "client_id": self.config["client_id"],
            "redirect_uri": self.config["redirect_uri"],
            "scope": " ".join(self.config["scopes"]),
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
        return f"{self.config['auth_url']}?{urlencode(params)}"
    
    def exchange_code(self, code: str, code_verifier: str) -> Dict[str, Any]:
        """Exchange authorization code for access token."""
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.config["redirect_uri"],
            "code_verifier": code_verifier,
        }
        
        # Twitter uses Basic Auth with client_id:client_secret
        auth_string = f"{self.config['client_id']}:{self.config['client_secret']}"
        auth_header = base64.b64encode(auth_string.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        
        response = requests.post(self.config["token_url"], data=data, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Twitter token exchange failed: {response.text}")
            return {"error": response.text, "status_code": response.status_code}
        
        token_data = response.json()
        
        return {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "expires_in": token_data.get("expires_in", 7200),
            "scope": token_data.get("scope"),
        }
    
    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh expired access token."""
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        }
        
        auth_string = f"{self.config['client_id']}:{self.config['client_secret']}"
        auth_header = base64.b64encode(auth_string.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {auth_header}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        
        response = requests.post(self.config["token_url"], data=data, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Twitter token refresh failed: {response.text}")
            return {"error": response.text}
        
        token_data = response.json()
        return {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "expires_in": token_data.get("expires_in", 7200),
        }
    
    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get authenticated user's profile info."""
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {"user.fields": "profile_image_url,name,username"}
        
        response = requests.get(
            "https://api.twitter.com/2/users/me",
            headers=headers,
            params=params
        )
        
        if response.status_code != 200:
            logger.error(f"Twitter user info failed: {response.text}")
            return {"error": response.text}
        
        data = response.json().get("data", {})
        return {
            "id": data.get("id"),
            "username": data.get("username"),
            "display_name": data.get("name"),
            "profile_image_url": data.get("profile_image_url"),
        }


class LinkedInOAuthHandler(OAuthHandler):
    """LinkedIn OAuth 2.0 handler."""
    
    platform = "linkedin"
    
    def get_authorization_url(self, state: str, **kwargs) -> str:
        """Generate LinkedIn OAuth authorization URL."""
        params = {
            "response_type": "code",
            "client_id": self.config["client_id"],
            "redirect_uri": self.config["redirect_uri"],
            "scope": " ".join(self.config["scopes"]),
            "state": state,
        }
        return f"{self.config['auth_url']}?{urlencode(params)}"
    
    def exchange_code(self, code: str, **kwargs) -> Dict[str, Any]:
        """Exchange authorization code for access token."""
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": self.config["redirect_uri"],
            "client_id": self.config["client_id"],
            "client_secret": self.config["client_secret"],
        }
        
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        
        response = requests.post(self.config["token_url"], data=data, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"LinkedIn token exchange failed: {response.text}")
            return {"error": response.text, "status_code": response.status_code}
        
        token_data = response.json()
        
        return {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "expires_in": token_data.get("expires_in", 5184000),  # ~60 days
            "scope": token_data.get("scope"),
        }
    
    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """LinkedIn doesn't support refresh tokens for most apps, need to re-auth."""
        return {"error": "LinkedIn requires re-authorization when token expires"}
    
    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get authenticated user's profile info."""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "X-Restli-Protocol-Version": "2.0.0",
        }
        
        # Get basic profile
        response = requests.get("https://api.linkedin.com/v2/me", headers=headers)
        
        if response.status_code != 200:
            logger.error(f"LinkedIn user info failed: {response.text}")
            return {"error": response.text}
        
        data = response.json()
        first_name = data.get("localizedFirstName", "")
        last_name = data.get("localizedLastName", "")
        
        # Try to get profile picture
        profile_image_url = None
        try:
            pic_response = requests.get(
                "https://api.linkedin.com/v2/me?projection=(id,profilePicture(displayImage~:playableStreams))",
                headers=headers
            )
            if pic_response.status_code == 200:
                pic_data = pic_response.json()
                elements = pic_data.get("profilePicture", {}).get("displayImage~", {}).get("elements", [])
                if elements:
                    profile_image_url = elements[-1].get("identifiers", [{}])[0].get("identifier")
        except Exception as e:
            logger.warning(f"Could not fetch LinkedIn profile picture: {e}")
        
        return {
            "id": data.get("id"),
            "username": f"{first_name.lower()}{last_name.lower()}",
            "display_name": f"{first_name} {last_name}".strip(),
            "profile_image_url": profile_image_url,
        }


class InstagramOAuthHandler(OAuthHandler):
    """Instagram Basic Display API OAuth handler."""
    
    platform = "instagram"
    
    def get_authorization_url(self, state: str, **kwargs) -> str:
        """Generate Instagram OAuth authorization URL."""
        params = {
            "client_id": self.config["client_id"],
            "redirect_uri": self.config["redirect_uri"],
            "scope": ",".join(self.config["scopes"]),
            "response_type": "code",
            "state": state,
        }
        return f"{self.config['auth_url']}?{urlencode(params)}"
    
    def exchange_code(self, code: str, **kwargs) -> Dict[str, Any]:
        """Exchange authorization code for access token."""
        data = {
            "client_id": self.config["client_id"],
            "client_secret": self.config["client_secret"],
            "grant_type": "authorization_code",
            "redirect_uri": self.config["redirect_uri"],
            "code": code,
        }
        
        response = requests.post(self.config["token_url"], data=data)
        
        if response.status_code != 200:
            logger.error(f"Instagram token exchange failed: {response.text}")
            return {"error": response.text, "status_code": response.status_code}
        
        token_data = response.json()
        short_lived_token = token_data.get("access_token")
        user_id = token_data.get("user_id")
        
        # Exchange for long-lived token (60 days)
        long_lived = self._get_long_lived_token(short_lived_token)
        if "error" not in long_lived:
            return {
                "access_token": long_lived.get("access_token"),
                "expires_in": long_lived.get("expires_in", 5184000),
                "user_id": user_id,
            }
        
        # Fallback to short-lived token (1 hour)
        return {
            "access_token": short_lived_token,
            "expires_in": 3600,
            "user_id": user_id,
        }
    
    def _get_long_lived_token(self, short_lived_token: str) -> Dict[str, Any]:
        """Exchange short-lived token for long-lived token."""
        params = {
            "grant_type": "ig_exchange_token",
            "client_secret": self.config["client_secret"],
            "access_token": short_lived_token,
        }
        
        response = requests.get(self.config["long_lived_token_url"], params=params)
        
        if response.status_code != 200:
            logger.error(f"Instagram long-lived token failed: {response.text}")
            return {"error": response.text}
        
        return response.json()
    
    def refresh_token(self, access_token: str) -> Dict[str, Any]:
        """Refresh long-lived Instagram token."""
        params = {
            "grant_type": "ig_refresh_token",
            "access_token": access_token,
        }
        
        response = requests.get(
            "https://graph.instagram.com/refresh_access_token",
            params=params
        )
        
        if response.status_code != 200:
            logger.error(f"Instagram token refresh failed: {response.text}")
            return {"error": response.text}
        
        return response.json()
    
    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get authenticated user's profile info."""
        params = {
            "fields": "id,username,account_type",
            "access_token": access_token,
        }
        
        response = requests.get("https://graph.instagram.com/me", params=params)
        
        if response.status_code != 200:
            logger.error(f"Instagram user info failed: {response.text}")
            return {"error": response.text}
        
        data = response.json()
        return {
            "id": data.get("id"),
            "username": data.get("username"),
            "display_name": data.get("username"),  # Instagram doesn't provide display name
            "profile_image_url": None,  # Basic Display API doesn't provide profile picture
            "account_type": data.get("account_type"),
        }


def get_oauth_handler(platform: str) -> Optional[OAuthHandler]:
    """Factory function to get the appropriate OAuth handler for a platform."""
    handlers = {
        "twitter": TwitterOAuthHandler,
        "linkedin": LinkedInOAuthHandler,
        "instagram": InstagramOAuthHandler,
    }
    handler_class = handlers.get(platform.lower())
    if handler_class:
        return handler_class()
    return None
