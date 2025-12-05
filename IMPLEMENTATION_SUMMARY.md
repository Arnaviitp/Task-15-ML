# AI-Powered Social Media Comment Generator

## 🚀 Overview

A fully-featured AI system that generates contextually relevant, engaging comments for social media posts using natural language processing, with emphasis on **full automation**, **user-friendly interface**, and ethical automation practices.

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

### 5. 🤖 FULL AUTOMATION (NEW!)
- ✅ **Automation Center** - Centralized automation control panel
- ✅ **Auto-Fetch Posts** - Periodically fetch new posts from platforms
- ✅ **Auto-Generate Comments** - Automatically generate comments for new posts
- ✅ **Auto-Approve** - Optionally auto-approve pending comments
- ✅ **Auto-Post** - Automatically post approved comments
- ✅ **Configurable intervals** - Set custom fetch and process intervals
- ✅ **Live activity log** - Real-time automation activity tracking
- ✅ **Sound notifications** - Audio alerts for important events
- ✅ **Uptime tracking** - Monitor how long automation has been running

### 6. ⚡ Quick Actions & Batch Operations (NEW!)
- ✅ **Floating Quick Actions Panel** - One-click access to common operations
- ✅ **Batch Fetch** - Fetch all new posts at once
### 8. 🎯 User-Friendly Interface (NEW!)
- ✅ **Interactive Onboarding Tour** - Step-by-step guide for new users
- ✅ **Toast Notifications** - Non-intrusive success/error/info messages
- ✅ **Dark/Light Mode Toggle** - Switch between themes
- ✅ **Keyboard Shortcuts** - Press `?` to view all shortcuts
- ✅ **Notification Badges** - See pending items at a glance
- ✅ **Responsive Design** - Works on all screen sizes
- ✅ **Glassmorphism UI** - Modern, sleek design aesthetic
- ✅ **Smooth Animations** - Polished user experience
- ✅ **Help System** - Easily restart the onboarding tour

### 9. Automation Controls (Legacy)
- ✅ **Rate limiting** (configurable, default 15/hour)
- ✅ **Delay timers** (min/max delay between actions)
- ✅ **Scheduling options** with date/time picker
- ✅ **Process scheduled comments** endpoint
- ✅ Simulated posting (demonstration mode)

### 9. Logging and Analytics
- ✅ **Activity logging** (all actions tracked)
- ✅ **SQLite database** storage with comprehensive fields
- ✅ **Analytics dashboard** with:
  - Total posts/comments metrics
  - Status breakdown (pending, approved, rejected, posted, scheduled)
  - Platform distribution
  - Tone distribution
  - Average sentiment score
  - Last 24h activity
- ✅ **CSV export** functionality
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
- **Features**: CORS, rate limiting, activity logging, batch operations

### Frontend (React + Vite)
- **Framework**: React 18 with React Router
- **Styling**: Custom CSS with glassmorphism design, dark/light mode
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Features**: 
  - Responsive design
  - Dark/Light mode toggle
  - Toast notifications
  - Onboarding tour
  - Quick actions panel
  - Keyboard shortcuts
  - Real-time animations

---

## 📁 Project Structure

```
Task-15-ML/
├── backend/
│   ├── main.py              # FastAPI application (60+ endpoints)
│   ├── models.py            # SQLModel database models
│   ├── nlp_engine.py        # NLP processing & comment generation
│   ├── requirements.txt     # Python dependencies
│   └── database_v3.db       # SQLite database
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main application with routing & theme
│   │   ├── api.js           # API client functions
│   │   ├── index.css        # Global styles with dark/light mode
│   │   └── components/
│   │       ├── Dashboard.jsx       # Post feed & generation
│   │       ├── ReviewQueue.jsx     # Comment review workflow
│   │       ├── Analytics.jsx       # Metrics & activity logs
│   │       ├── Settings.jsx        # Configuration panel
│   │       ├── AutomationCenter.jsx # 🆕 Full automation control
│   │       ├── QuickActions.jsx    # 🆕 One-click batch operations
│   │       ├── ToastProvider.jsx   # 🆕 Notification system
│   │       └── OnboardingTour.jsx  # 🆕 Interactive tutorial
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
| POST | `/posts/fetch` | Fetch mock social media posts |
| GET | `/posts` | Get all posts (with filters) |
| POST | `/posts/create` | Create manual post |
| GET | `/posts/{id}` | Get specific post |
| DELETE | `/posts/{id}` | Delete post |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/comments/generate/{post_id}` | Generate comment |
| POST | `/comments/generate-variations/{post_id}` | Generate multiple variations |
| GET | `/comments` | Get all comments (with filters) |
| PUT | `/comments/{id}/status` | Update status |
| PUT | `/comments/{id}/content` | Edit content |
| PUT | `/comments/{id}/schedule` | Schedule for future |
| DELETE | `/comments/{id}` | Delete comment |
| POST | `/comments/validate` | Validate content |

### Batch Operations (🆕 NEW!)
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
| GET | `/automation/status` | 🆕 Get automation status |

---

## ⌨️ Keyboard Shortcuts (NEW!)

| Key | Action |
|-----|--------|
| `?` | Toggle keyboard shortcuts help |
| `Esc` | Close dialogs |

---

## 🎨 UI Features (Enhanced!)

- **Dashboard**: Post feed, manual entry, generation settings
- **Review Queue**: Approve/reject/edit/schedule workflow
- **Automation Center**: 🆕 Full automation controls with live stats
- **Analytics**: Charts, metrics, activity logs, export
- **Settings**: Rate limits, automation, preferences
- **Floating Quick Actions**: 🆕 Always-accessible batch operations
- **Onboarding Tour**: 🆕 Interactive tutorial for new users
- **Theme Toggle**: 🆕 Dark/Light mode switch
- **Toast Notifications**: 🆕 Non-intrusive status updates

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

---

## 🆕 What's New in Version 2.0

### Full Automation
- **Automation Center**: One-click start/stop for all automation features
- **Live Activity Log**: Real-time tracking of all automated actions
- **Configurable Intervals**: Set how often to fetch/process
- **Sound Alerts**: Audio notifications for important events

### Enhanced User Experience
- **Onboarding Tour**: 8-step interactive tutorial
- **Toast Notifications**: Beautiful, non-intrusive alerts
- **Dark/Light Mode**: Toggle between themes
- **Keyboard Shortcuts**: Power user features
- **Notification Badges**: See pending items at a glance

### Batch Operations
- **One-Click Actions**: Approve all, generate all, post all
- **Floating Quick Actions**: Always accessible from any page
- **Progress Tracking**: Visual feedback for long operations

---

**Built with ❤️ using FastAPI, React, spaCy, and TextBlob**
