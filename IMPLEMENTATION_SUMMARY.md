# AI-Powered Social Media Comment Generator - Implementation Guide

## Overview
This system generates contextually relevant comments for social media posts using NLP. It includes a React frontend for management and a FastAPI backend for processing.

## Features Implemented
1.  **Post Analysis**: Fetches and analyzes posts (mock data for demo).
2.  **Context-Aware Generation**: Uses spaCy and TextBlob to understand sentiment and entities.
3.  **Review Queue**: Manual approval workflow for safety.
4.  **Analytics**: Tracks performance metrics.
5.  **Rate Limiting**: Enforces a maximum of 15 comments per hour.
6.  **Modern UI**: Glassmorphism design with dark mode.

## How to Run

### Backend
1.  Navigate to `backend/`.
2.  Ensure virtual environment is active.
3.  Run: `uvicorn main:app --reload`
    *   API Docs: http://localhost:8000/docs

### Frontend
1.  Navigate to `frontend/`.
2.  Run: `npm run dev`
    *   Dashboard: http://localhost:5173

## Usage Workflow
1.  **Dashboard**: Click "Refresh Feed" to load posts.
2.  **Generate**: Click "Generate Comment" on a post.
3.  **Review**: Go to "Review Queue" to Approve/Reject/Edit the comment.
4.  **Analytics**: View engagement stats.

## Safety & Ethics
*   **Rate Limits**: Built-in protection against spam.
*   **Human-in-the-Loop**: All comments are pending by default.
*   **Sentiment Analysis**: Prevents inappropriate positive responses to negative posts.
