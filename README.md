# AI-Powered Social Media Comment Generator

## Project Overview
This project is an intelligent system designed to generate contextually relevant and engaging comments for social media posts (Twitter, LinkedIn, Instagram). It leverages Natural Language Processing (NLP) and Machine Learning (ML) to analyze post content, understand sentiment, and produce personalized responses. The system emphasizes ethical automation, strictly adhering to platform guidelines and prioritizing genuine interaction.

## Features
- **Post Analysis**: Extracts content, hashtags, mentions, and engagement metrics.
- **Context-Aware Generation**: Generates comments matching the platform's tone (Professional for LinkedIn, Casual for Instagram).
- **Sentiment Analysis**: Ensures responses are appropriate for the emotion of the post.
- **Personalization**: User-defined tones, lengths, and templates.
- **Safety & Compliance**: Content filtering, manual review queue, and rate limiting.
- **Analytics**: Tracks engagement and comment performance.

## Ethical Considerations
- **Compliance**: Strictly adheres to platform Terms of Service.
- **Anti-Spam**: Rate limits and delay timers are enforced to prevent spam-like behavior.
- **Transparency**: Designed to assist human engagement, not replace it entirely. Manual review is encouraged.

## Technology Stack
- **Backend**: Python, FastAPI
- **NLP/ML**: spaCy, NLTK, TextBlob, Transformers (Hugging Face)
- **Web Scraping/Automation**: Selenium, BeautifulSoup (Used responsibly with rate limits)
- **Database**: SQLite
- **Frontend**: React, Vanilla CSS

## Setup and Installation

### Prerequisites
- Python 3.8+
- Node.js & npm

### Backend Setup
1. Navigate to the `backend` directory.
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Download NLP models:
   ```bash
   python -m spacy download en_core_web_sm
   python -m textblob.download_corpora
   ```
5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage Instructions
1. **Dashboard**: Open the web interface to view fetched posts.
2. **Configuration**: Set your desired tone, comment length, and platform settings.
3. **Review**: Go to the "Review Queue" to approve or edit generated comments before they are "posted" (simulated or actual).
4. **Analytics**: Check the reports section for performance metrics.

## Safety Guidelines
- Do not bypass rate limits.
- Always review comments for sensitive topics.
- Use test accounts for development.

## Future Improvements
- Multi-language support.
- Advanced personalization using user history.
- Direct API integration where available.
