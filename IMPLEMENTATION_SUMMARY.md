# AI-Powered Social Media Comment Generator

## 🚀 Overview

A fully-featured AI system that generates contextually relevant, engaging comments for social media posts using natural language processing, with emphasis on **full automation**, **user-friendly interface**, **advanced AI tools**, and ethical automation practices.

## ✅ Implemented Features

### 1. Post Analysis and Understanding
- ✅ Fetch and analyze social media posts (Twitter, LinkedIn, Instagram)
- ✅ Extract key information:
  - Post content/caption
  - Hashtags and mentions (auto-extracted)
  - Engagement metrics (likes, comments, shares)
  - Image descriptions (optional field)
- ✅ Platform-specific data storage

### 2. Context-Aware Comment Generation
- ✅ **NLP-powered analysis** using spaCy for entity extraction
- ✅ **Sentiment analysis** using TextBlob
- ✅ **Platform-specific templates** (LinkedIn: professional, Twitter: casual, Instagram: visual-focused)
- ✅ **Multiple tone options**: Professional, Casual, Enthusiastic, Supportive
- ✅ **Sentiment-aware prefixes** (adapts to post mood)
- ✅ Avoids generic responses through varied template pools

### 3. Personalization and Variety
- ✅ **Multiple comment templates** per platform/tone combination
- ✅ **Variation generator** for A/B testing (generates 3+ versions)
- ✅ User-configurable parameters:
  - Tone selection
  - Comment length (Short, Medium, Long)
  - Optional question inclusion
- ✅ Random selection from template pools to avoid repetition

### 4. Content Filtering and Safety
- ✅ **Profanity filter** using better_profanity library
- ✅ **Spam detection** (detects promotional patterns)
- ✅ **Comment validation** before posting
- ✅ **Manual review queue** with approve/reject/edit workflow
- ✅ Content flagging for inappropriate posts

### 5. 🤖 FULL AUTOMATION
- ✅ **Automation Center** - Centralized automation control panel
- ✅ **Auto-Fetch Posts** - Periodically fetch new posts from platforms
- ✅ **Auto-Generate Comments** - Automatically generate comments for new posts
- ✅ **Auto-Approve** - Optionally auto-approve pending comments
- ✅ **Auto-Post** - Automatically post approved comments
- ✅ **Configurable intervals** - Set custom fetch and process intervals
- ✅ **Live activity log** - Real-time automation activity tracking
- ✅ **Sound notifications** - Audio alerts for important events
- ✅ **Uptime tracking** - Monitor how long automation has been running

### 6. ⚡ Quick Actions & Batch Operations
- ✅ **Floating Quick Actions Panel** - One-click access to common operations
- ✅ **Batch Fetch** - Fetch all new posts at once
- ✅ **Batch Approve/Reject** - Process multiple comments at once
- ✅ **Batch Generate** - Generate comments for all posts
- ✅ **Batch Post** - Post all approved comments

### 7. 🎯 User-Friendly Interface
- ✅ **Interactive Onboarding Tour** - Step-by-step guide for new users
- ✅ **Toast Notifications** - Non-intrusive success/error/info messages
- ✅ **Dark/Light Mode Toggle** - Switch between themes
- ✅ **Keyboard Shortcuts** - Press `?` to view all shortcuts
- ✅ **Notification Badges** - See pending items at a glance
- ✅ **Responsive Design** - Works on all screen sizes
- ✅ **Glassmorphism UI** - Modern, sleek design aesthetic
- ✅ **Smooth Animations** - Polished user experience
- ✅ **Help System** - Easily restart the onboarding tour

### 8. 🧠 AI TOOLS (NEW v3.0!)
- ✅ **Engagement Predictor** - AI-powered comment performance scoring (0-100)
  - Length optimization analysis
  - Sentiment alignment detection
  - Question presence check
  - Emoji usage optimization
  - Content relevance scoring
- ✅ **Comment Enhancer** - One-click comment improvements
  - Auto-add relevant emojis
  - Generate hashtag suggestions
  - Engagement boost phrases
- ✅ **Emoji Suggester** - AI-powered emoji recommendations based on content
- ✅ **Hashtag Generator** - Smart hashtag creation from content analysis
- ✅ **Optimal Posting Times** - Platform-specific best times to post
- ✅ **AI Personas** - Custom comment generation personalities
  - Create unlimited personas
  - Define tone, keywords, and templates
  - Set default persona
  - Generate comments with specific persona

### 9. 📊 Advanced Analytics (NEW v3.0!)
- ✅ **Sentiment Trends** - Track sentiment over time with visualizations
- ✅ **Tone Distribution** - See which tones are used most
- ✅ **Platform Performance** - Compare engagement across platforms
- ✅ **Approval Rates** - Track which tones get approved most
- ✅ **Daily Activity Charts** - Visual activity breakdown
- ✅ **Customizable Time Ranges** - 7, 14, or 30 day views
- ✅ **CSV Export** - Download all analytics data

### 10. 📝 Comment Templates (NEW v3.0!)
- ✅ **Save Templates** - Store successful comments for reuse
- ✅ **Organize by Platform/Tone** - Filter and find templates easily
- ✅ **Tag System** - Add custom tags to templates
- ✅ **Quick Insert** - Use templates with one click

### 11. Automation Controls
- ✅ **Rate limiting** (configurable, default 15/hour)
- ✅ **Delay timers** (min/max delay between actions)
- ✅ **Scheduling options** with date/time picker
- ✅ **Process scheduled comments** endpoint
- ✅ Simulated posting (demonstration mode)

### 12. Logging and Analytics
- ✅ **Activity logging** (all actions tracked)
- ✅ **SQLite database** storage with comprehensive fields
- ✅ **Analytics dashboard** with:
  - Total posts/comments metrics
  - Status breakdown (pending, approved, rejected, posted, scheduled)
  - Platform distribution
  - Tone distribution
  - Average sentiment score
  - Last 24h activity
- ✅ **Real-time activity feed**
- ✅ **Automation status endpoint** - Live automation stats

---

## 🛠 Technology Stack

### Backend (FastAPI)
- **Framework**: FastAPI with async support
- **Database**: SQLite with SQLModel ORM
- **NLP Libraries**:
  - spaCy (entity extraction, noun chunks)
  - TextBlob (sentiment analysis)
  - better_profanity (content filtering)
- **Features**: CORS, rate limiting, activity logging, batch operations, AI features

### Frontend (React + Vite)
- **Framework**: React 18 with React Router
- **Styling**: Custom CSS with glassmorphism design, dark/light mode
- **Icons**: Lucide React
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Features**: 
  - Responsive design
  - Dark/Light mode toggle
  - Toast notifications
  - Onboarding tour
  - Quick actions panel
  - AI Tools dashboard
  - Keyboard shortcuts
  - Real-time animations

---

## 📁 Project Structure

```
Task-15-ML/
├── backend/
│   ├── main.py              # FastAPI application (80+ endpoints)
│   ├── models.py            # SQLModel database models (including Persona)
│   ├── nlp_engine.py        # NLP processing, comment generation, AI features
│   ├── social_integrations.py # Social media API integrations
│   ├── requirements.txt     # Python dependencies
│   └── database_v4.db       # SQLite database
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main application with routing & theme
│   │   ├── api.js           # API client functions (50+ functions)
│   │   ├── index.css        # Global styles with dark/light mode
│   │   └── components/
│   │       ├── Dashboard.jsx         # Post feed & generation
│   │       ├── ReviewQueue.jsx       # Comment review workflow
│   │       ├── Analytics.jsx         # Basic metrics & charts
│   │       ├── AdvancedAnalytics.jsx # 🆕 Sentiment trends, performance
│   │       ├── AITools.jsx           # 🆕 AI-powered enhancement tools
│   │       ├── Settings.jsx          # Configuration panel
│   │       ├── AutomationCenter.jsx  # Full automation control
│   │       ├── ConnectedAccounts.jsx # Social media account management
│   │       ├── QuickActions.jsx      # One-click batch operations
│   │       ├── ToastProvider.jsx     # Notification system
│   │       ├── ActivityLog.jsx       # Activity history
│   │       └── OnboardingTour.jsx    # Interactive tutorial
│   └── package.json
│
└── .venv/                   # Python virtual environment
```

---

## 🚀 Running the Application

### Backend
```bash
cd backend
..\.venv\Scripts\activate
uvicorn main:app --reload
# Runs on http://localhost:8000
```

### Frontend
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

---

## 📡 API Endpoints

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/posts/fetch` | Fetch social media posts |
| GET | `/posts` | Get all posts (with filters) |
| POST | `/posts/create` | Create manual post |
| GET | `/posts/{id}` | Get specific post |
| DELETE | `/posts/{id}` | Delete post |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/comments/generate/{post_id}` | Generate comment |
| POST | `/comments/generate-variations/{post_id}` | Generate multiple variations |
| POST | `/comments/generate-with-persona/{post_id}` | 🆕 Generate with AI persona |
| GET | `/comments` | Get all comments (with filters) |
| PUT | `/comments/{id}/status` | Update status |
| PUT | `/comments/{id}/content` | Edit content |
| PUT | `/comments/{id}/schedule` | Schedule for future |
| DELETE | `/comments/{id}` | Delete comment |
| POST | `/comments/validate` | Validate content |

### AI Features (🆕 NEW!)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/predict-engagement` | Predict comment engagement score |
| POST | `/ai/suggest-emojis` | Get AI emoji suggestions |
| POST | `/ai/generate-hashtags` | Generate relevant hashtags |
| GET | `/ai/optimal-posting-times/{platform}` | Get best posting times |
| POST | `/ai/enhance-comment` | Enhance comment with AI |

### Personas (🆕 NEW!)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/personas` | Get all AI personas |
| POST | `/personas` | Create new persona |
| PUT | `/personas/{id}` | Update persona |
| DELETE | `/personas/{id}` | Delete persona |
| POST | `/personas/{id}/set-default` | Set as default |

### Templates (🆕 NEW!)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/templates` | Get saved templates |
| POST | `/templates` | Save new template |
| DELETE | `/templates/{id}` | Delete template |

### Batch Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/batch/approve-all` | Approve all pending comments |
| POST | `/batch/reject-all` | Reject all pending comments |
| POST | `/batch/generate-all` | Generate comments for all posts |
| POST | `/batch/post-approved` | Post all approved comments |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics` | Get comprehensive metrics |
| GET | `/analytics/export` | Export as CSV |
| GET | `/analytics/sentiment-trends` | 🆕 Get sentiment over time |
| GET | `/analytics/tone-distribution` | 🆕 Get tone usage stats |
| GET | `/analytics/platform-performance` | 🆕 Get platform metrics |
| GET | `/activity-logs` | Get activity history |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings` | Get all settings |
| PUT | `/settings/{key}` | Update setting |
| POST | `/settings/reset` | Reset to defaults |

### Automation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/automation/simulate-post/{id}` | Simulate posting |
| GET | `/automation/scheduled` | Get due comments |
| POST | `/automation/process-scheduled` | Process scheduled |
| GET | `/automation/status` | Get automation status |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `?` | Toggle keyboard shortcuts help |
| `Esc` | Close dialogs |
| `R` | Refresh current view |

---

## 🎨 UI Features

- **Dashboard**: Post feed, manual entry, generation settings
- **Review Queue**: Approve/reject/edit/schedule workflow
- **Automation Center**: Full automation controls with live stats
- **Analytics**: Basic + Advanced charts, metrics, activity logs, export
- **AI Tools**: 🆕 Engagement prediction, comment enhancement, emoji/hashtag suggestions, personas
- **Settings**: Rate limits, automation, preferences, connected accounts
- **Floating Quick Actions**: Always-accessible batch operations
- **Onboarding Tour**: Interactive tutorial for new users
- **Theme Toggle**: Dark/Light mode switch
- **Toast Notifications**: Non-intrusive status updates

---

## ⚠️ Ethical Guidelines

1. **Platform Compliance**: Always follow Terms of Service
2. **No Spam**: System includes anti-spam detection
3. **Human Review**: Manual approval required before posting (can be automated with caution)
4. **Rate Limiting**: Built-in limits to prevent abuse
5. **Transparency**: Activity logging for accountability
6. **Testing Only**: Use mock data during development

---

## 📊 Database Schema

### Posts
- id, platform, content, author, url
- hashtags, mentions, image_description
- likes, comments_count, shares, fetched_at

### Generated Comments
- id, post_id, content, tone, length
- sentiment_score, subjectivity_score, topics_extracted
- has_question, status, created_at, scheduled_at, posted_at

### Activity Logs
- id, action, details, timestamp

### Settings
- id, key, value, updated_at

### Connected Accounts
- id, platform, username, display_name, profile_image_url
- access_token, refresh_token, token_expires_at
- scopes, is_active, connected_at, last_used_at

### Personas (🆕 NEW!)
- id, name, description, tone
- keywords, template_overrides
- is_active, is_default, created_at

---

## 🆕 What's New in Version 3.0

### AI Tools Dashboard
- **Engagement Predictor**: Get a 0-100 score for how well your comment will perform
- **Comment Enhancer**: One-click AI improvements with emojis, hashtags, and engagement boosters
- **Emoji Suggester**: Smart emoji recommendations based on content sentiment
- **Hashtag Generator**: Auto-generate relevant hashtags
- **Optimal Posting Times**: Know when to post for maximum engagement

### AI Personas
- Create custom AI personalities with unique tones and keywords
- Save and reuse personas for consistent brand voice
- Set a default persona for quick comment generation

### Advanced Analytics
- **Sentiment Trends**: Track how sentiment changes over time
- **Tone Distribution**: See which comment tones you use most
- **Platform Performance**: Compare metrics across Twitter, LinkedIn, Instagram
- **Approval Rates**: Analyze which tones get approved

### Comment Templates
- Save successful comments as reusable templates
- Organize by platform and tone
- Quick access when generating new comments

---

**Built with ❤️ using FastAPI, React, spaCy, and TextBlob**

