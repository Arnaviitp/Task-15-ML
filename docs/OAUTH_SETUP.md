# OAuth Integration Guide

This document explains how to set up OAuth integration for fetching real posts from social media platforms.

## Overview

The application now supports three methods to connect social media accounts:

1. **OAuth (Recommended)** - Uses official platform APIs with full OAuth 2.0 flow
2. **Manual Token** - Enter API tokens manually obtained from developer portals
3. **Simulation** - Uses mock data for testing
4. **Browser Scraper** - Uses Selenium to scrape public profiles (fragile)

## Setting Up OAuth

### Prerequisites

You need to create developer applications on each platform you want to integrate:

### 1. Twitter / X

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new project and app (or use existing)
3. Enable "OAuth 2.0" in "User authentication settings"
4. Set the redirect URL: `http://localhost:8000/oauth/twitter/callback`
5. Note down your **Client ID** and **Client Secret**
6. Required scopes: `tweet.read`, `users.read`, `offline.access`

### 2. LinkedIn

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Create a new app
3. Go to "Auth" tab
4. Add redirect URL: `http://localhost:8000/oauth/linkedin/callback`
5. Note down your **Client ID** and **Client Secret**
6. Request scopes: `r_liteprofile`, `r_emailaddress`, `w_member_social`

> **Note:** LinkedIn may require app verification for full API access.

### 3. Instagram (Meta/Facebook)

1. Go to [Facebook Developers](https://developers.facebook.com/apps)
2. Create a new app (Type: Consumer)
3. Add "Instagram Basic Display" product
4. Set OAuth Redirect URL: `http://localhost:8000/oauth/instagram/callback`
5. Note down your **App ID** (Client ID) and **App Secret**
6. Add test users under "Roles" → "Instagram Testers"

## Configuration

1. Copy `.env.example` to `.env` in the `backend` folder:

```bash
cp .env.example .env
```

2. Fill in your credentials:

```env
# Twitter
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret

# LinkedIn
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret

# Instagram
INSTAGRAM_CLIENT_ID=your_app_id
INSTAGRAM_CLIENT_SECRET=your_app_secret
```

3. Restart the backend server

## Usage

1. Go to Settings → Connected Accounts
2. Click "Connect" on any platform
3. If OAuth is configured, you'll see a "Connect with OAuth" button
4. Click it to be redirected to the platform's authorization page
5. Authorize the application
6. You'll be redirected back with your account connected

## Automatic Token Refresh

For platforms that support it (Twitter, Instagram), the application will automatically refresh expired tokens when fetching posts. This ensures continuous access without requiring re-authorization.

## API Endpoints

### Check OAuth Status
```
GET /oauth/status
```
Returns which platforms have OAuth configured.

### Initiate OAuth
```
GET /oauth/{platform}/authorize
```
Returns the authorization URL to redirect the user.

### OAuth Callback
```
GET /oauth/{platform}/callback
```
Handles the redirect from the social platform.

### Refresh Token
```
POST /oauth/{platform}/refresh?account_id={id}
```
Manually refresh an OAuth token.

## Troubleshooting

### "OAuth not configured"
Make sure your `.env` file contains the correct credentials and restart the server.

### "Invalid or expired state"
The OAuth state expired (5 minutes). Try connecting again.

### "Token refresh failed"
The account may need to be re-authorized. Disconnect and reconnect via OAuth.

### LinkedIn "requires re-authorization"
LinkedIn's API doesn't support token refresh for most apps. Re-authorize after ~60 days.

## Production Considerations

1. **Use HTTPS** - OAuth callbacks must use HTTPS in production
2. **Update redirect URLs** - Change redirect URLs to match your domain
3. **Secure credentials** - Use environment variables or a secrets manager
4. **Use Redis** - Store OAuth states in Redis instead of memory for scalability
