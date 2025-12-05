# AI-Powered Social Media Comment Generator

## 🚀 Overview

A fully-featured AI system that generates contextually relevant, engaging comments for social media posts using natural language processing, with emphasis on ethical automation practices and platform compliance.

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

### 5. Automation Controls
- ✅ **Rate limiting** (configurable, default 15/hour)
- ✅ **Delay timers** (min/max delay between actions)
- ✅ **Scheduling options** with date/time picker
- ✅ **Process scheduled comments** endpoint
- ✅ Simulated posting (demonstration mode)

### 6. Logging and Analytics
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

---

## 🛠 Technology Stack

### Backend (FastAPI)
- **Framework**: FastAPI with async support
- **Database**: SQLite with SQLModel ORM
- **NLP Libraries**:
  - spaCy (entity extraction, noun chunks)
  - TextBlob (sentiment analysis)
  - better_profanity (content filtering)
- **Features**: CORS, rate limiting, activity logging

### Frontend (React + Vite)
- **Framework**: React 18 with React Router
- **Styling**: Custom CSS with glassmorphism design
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Features**: Responsive design, dark mode, animations

---

## 📁 Project Structure

```
Task-15-ML/
├── backend/
│   ├── main.py              # FastAPI application (45+ endpoints)
│   ├── models.py            # SQLModel database models
│   ├── nlp_engine.py        # NLP processing & comment generation
│   ├── requirements.txt     # Python dependencies
│   └── database_v3.db       # SQLite database
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main application with routing
│   │   ├── api.js           # API client functions
│   │   ├── index.css        # Global styles
│   │   └── components/
│   │       ├── Dashboard.jsx    # Post feed & generation
│   │       ├── ReviewQueue.jsx  # Comment review workflow
│   │       ├── Analytics.jsx    # Metrics & activity logs
│   │       └── Settings.jsx     # Configuration panel
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

---

## ⚠️ Ethical Guidelines

1. **Platform Compliance**: Always follow Terms of Service
2. **No Spam**: System includes anti-spam detection
3. **Human Review**: Manual approval required before posting
4. **Rate Limiting**: Built-in limits to prevent abuse
5. **Transparency**: Activity logging for accountability
6. **Testing Only**: Use mock data during development

---

## 🎨 UI Features

- **Dashboard**: Post feed, manual entry, generation settings
- **Review Queue**: Approve/reject/edit/schedule workflow
- **Analytics**: Charts, metrics, activity logs, export
- **Settings**: Rate limits, automation, preferences

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

**Built with ❤️ using FastAPI, React, spaCy, and TextBlob**
