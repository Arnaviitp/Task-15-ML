from better_profanity import profanity
import random
import re
from textblob import TextBlob
import spacy

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading 'en_core_web_sm' model...")
    from spacy.cli import download
    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

# Initialize profanity filter
profanity.load_censor_words()

# Spam patterns to detect
SPAM_PATTERNS = [
    r"check\s+out\s+my",
    r"follow\s+me",
    r"click\s+here",
    r"buy\s+now",
    r"limited\s+time",
    r"free\s+money",
    r"earn\s+\$",
    r"dm\s+me\s+for",
    r"link\s+in\s+bio",
]

class CommentGenerator:
    def __init__(self):
        # Platform-specific templates
        self.templates = {
            "linkedin": {
                "professional": [
                    "Excellent insights on {topic}! This resonates deeply with industry trends. Thank you for sharing your expertise.",
                    "Your perspective on {topic} is thought-provoking. This aligns perfectly with what we're seeing in the market.",
                    "Brilliant analysis of {topic}. Your expertise really shines through in this post.",
                    "This is incredibly valuable content about {topic}. Looking forward to implementing some of these ideas.",
                    "Insightful post! The point about {topic} is particularly relevant in today's business landscape."
                ],
                "supportive": [
                    "Congratulations on this achievement! Your journey with {topic} is truly inspiring.",
                    "This is fantastic news! Wishing you continued success with {topic}.",
                    "What an incredible milestone! Your dedication to {topic} is admirable.",
                    "So proud to see this update about {topic}! Keep pushing forward!"
                ],
                "enthusiastic": [
                    "This is absolutely groundbreaking! 🚀 The implications for {topic} are immense!",
                    "Wow, this changes everything about how we think about {topic}! Amazing work!",
                    "I'm genuinely excited about {topic}! This is the innovation we need!",
                    "Incredible! This approach to {topic} is exactly what the industry needs!"
                ]
            },
            "twitter": {
                "casual": [
                    "This! 💯 So true about {topic}",
                    "Couldn't agree more on {topic} 🔥",
                    "Facts! {topic} hits different",
                    "This is it 👏 {topic} explained perfectly",
                    "Real talk about {topic} 💪"
                ],
                "enthusiastic": [
                    "OMG this is amazing! 🤩 {topic} is life!",
                    "LET'S GO! 🚀 {topic} to the moon!",
                    "YESSS! This is exactly what {topic} needed! 🙌",
                    "This is fire about {topic}! 🔥🔥🔥"
                ],
                "supportive": [
                    "Sending good vibes! 💫 You got this with {topic}!",
                    "So here for this {topic} journey! ❤️",
                    "Keep going! {topic} is your thing! 💪",
                    "Rooting for you! {topic} growth is real! 🌟"
                ]
            },
            "instagram": {
                "casual": [
                    "Love this vibe! ✨ {topic} looks amazing!",
                    "This is everything! 😍 {topic} goals!",
                    "Obsessed with {topic}! 💕",
                    "So aesthetic! {topic} on point! 🔥",
                    "This made my day! {topic} is beautiful! 💖"
                ],
                "enthusiastic": [
                    "STUNNING! 🤩 {topic} is absolutely gorgeous!",
                    "I can't get over how beautiful {topic} is! 😍✨",
                    "OMG this is literally perfect! {topic} 💯",
                    "OBSESSED! {topic} is giving everything! 🙌"
                ],
                "supportive": [
                    "You're glowing! ✨ {topic} suits you perfectly!",
                    "So proud of you! {topic} journey is inspiring! 💕",
                    "Keep shining! {topic} looks amazing on you! 🌟",
                    "You're killing it! {topic} vibes are immaculate! 💪"
                ]
            },
            "default": {
                "professional": [
                    "Great insights on {topic}. Thanks for sharing!",
                    "This is a valuable perspective regarding {topic}.",
                    "I completely agree with your points on {topic}. Well said.",
                    "Excellent post! The part about {topic} really resonated with me."
                ],
                "casual": [
                    "Love this! {topic} is so true! 🔥",
                    "Totally relate to the {topic} part! 😂",
                    "This is awesome! 🚀",
                    "So true regarding {topic}!"
                ],
                "enthusiastic": [
                    "Wow! This is absolutely amazing! 🤩",
                    "Incredible work on {topic}! Keep it up!",
                    "I'm so hyped about this! {topic} looks great!",
                    "This is the best thing I've seen all day! 🙌"
                ],
                "supportive": [
                    "Sending you lots of support! You got this! 💪",
                    "This is a great step forward. Proud of you!",
                    "Keep going, you're doing great with {topic}!",
                    "We are all rooting for you! ❤️"
                ]
            }
        }
        
        # Questions for different platforms and tones
        self.questions = {
            "linkedin": {
                "professional": [
                    "What are your thoughts on how this will evolve in the next 5 years?",
                    "Have you seen similar results in your organization?",
                    "What challenges did you face implementing this approach?",
                    "How do you see this impacting the industry long-term?"
                ],
                "casual": [
                    "What's been your biggest takeaway from this?",
                    "Anyone else seeing similar trends?",
                    "What's next on the roadmap?"
                ]
            },
            "twitter": {
                "casual": [
                    "thoughts? 🤔",
                    "who else agrees?",
                    "what's your take?",
                    "real or nah?"
                ],
                "enthusiastic": [
                    "How do you keep coming up with this stuff?! 🙌",
                    "When's the next drop?! 🚀"
                ]
            },
            "instagram": {
                "casual": [
                    "Where is this? 😍",
                    "What filter did you use? ✨",
                    "Can you share more details? 💕"
                ],
                "enthusiastic": [
                    "How do you do it?! 🤩",
                    "Tutorial please?! 🙏"
                ]
            },
            "default": {
                "professional": [
                    "What are your thoughts on the future of this?",
                    "How do you see this evolving?",
                    "Have you considered the broader impact?"
                ],
                "casual": [
                    "What do you think?",
                    "Anyone else feel the same?",
                    "What's your take on this?"
                ],
                "enthusiastic": [
                    "Can't wait to see more! When is the next update?",
                    "How did you pull this off?",
                    "Where can I find more info?"
                ],
                "supportive": [
                    "How can we help?",
                    "What's the next step for you?",
                    "Need any assistance?"
                ]
            }
        }
        
        # Sentiment-based prefixes
        self.sentiment_prefixes = {
            "very_negative": [
                "I'm sorry you're going through this. ",
                "That sounds really challenging. ",
                "Sending support during this difficult time. "
            ],
            "negative": [
                "I understand the frustration. ",
                "That sounds tough. ",
                "I hear you on this. "
            ],
            "neutral": [],
            "positive": [
                "That's great! ",
                "Love to see this! ",
                "This is wonderful! "
            ],
            "very_positive": [
                "This is absolutely incredible! ",
                "Wow, what amazing news! ",
                "This made my day! "
            ]
        }

    def extract_hashtags(self, content: str) -> list:
        """Extract hashtags from content."""
        return re.findall(r'#(\w+)', content)
    
    def extract_mentions(self, content: str) -> list:
        """Extract mentions from content."""
        return re.findall(r'@(\w+)', content)
    
    def detect_spam(self, content: str) -> bool:
        """Check if content appears to be spam."""
        content_lower = content.lower()
        for pattern in SPAM_PATTERNS:
            if re.search(pattern, content_lower):
                return True
        return False

    def analyze_post(self, content: str, platform: str = "default"):
        """
        Comprehensive post analysis: entities, sentiment, topics, hashtags, mentions.
        """
        doc = nlp(content)
        blob = TextBlob(content)
        
        # Extract entities and topics
        entities = [ent.text for ent in doc.ents if ent.label_ in ["ORG", "PRODUCT", "GPE", "WORK_OF_ART", "PERSON", "EVENT"]]
        noun_chunks = [chunk.text for chunk in doc.noun_chunks]
        
        # Combine and prioritize
        topics = entities if entities else noun_chunks[:3]
        main_topic = topics[0] if topics else "this"
        
        # Extract hashtags and mentions
        hashtags = self.extract_hashtags(content)
        mentions = self.extract_mentions(content)
        
        # Sentiment analysis
        sentiment = blob.sentiment.polarity
        subjectivity = blob.sentiment.subjectivity
        
        # Categorize sentiment
        if sentiment < -0.5:
            sentiment_category = "very_negative"
        elif sentiment < -0.1:
            sentiment_category = "negative"
        elif sentiment < 0.1:
            sentiment_category = "neutral"
        elif sentiment < 0.5:
            sentiment_category = "positive"
        else:
            sentiment_category = "very_positive"
        
        # Detect content type
        has_announcement = any(word in content.lower() for word in ["announce", "launching", "excited to share", "big news", "introducing"])
        has_question = "?" in content
        is_personal = any(word in content.lower() for word in ["i'm", "my", "me", "i feel", "personally"])
        
        return {
            "sentiment": sentiment,
            "subjectivity": subjectivity,
            "sentiment_category": sentiment_category,
            "topic": main_topic,
            "topics": topics,
            "hashtags": hashtags,
            "mentions": mentions,
            "has_announcement": has_announcement,
            "has_question": has_question,
            "is_personal": is_personal,
            "word_count": len(content.split()),
            "platform": platform.lower()
        }

    def generate_comment(self, content: str, tone: str = "casual", length: str = "medium", 
                        include_question: bool = False, platform: str = "default"):
        """
        Generate a context-aware, platform-specific comment.
        """
        # Safety Checks
        if profanity.contains_profanity(content):
            return {
                "comment": "[CONTENT FLAGGED] Post contains inappropriate language. No comment generated.",
                "analysis": {"sentiment": 0, "topic": "N/A", "flagged": True},
                "flagged": True
            }
        
        if self.detect_spam(content):
            return {
                "comment": "[SPAM DETECTED] Post appears to be promotional spam. No comment generated.",
                "analysis": {"sentiment": 0, "topic": "N/A", "flagged": True},
                "flagged": True
            }
        
        # Analyze the post
        analysis = self.analyze_post(content, platform)
        topic = analysis["topic"]
        sentiment_category = analysis["sentiment_category"]
        platform_key = platform.lower() if platform.lower() in self.templates else "default"
        
        # Get platform-specific templates
        platform_templates = self.templates.get(platform_key, self.templates["default"])
        templates = platform_templates.get(tone, platform_templates.get("casual", self.templates["default"]["casual"]))
        
        # Select and format template
        base_comment = random.choice(templates).format(topic=topic)
        
        # Add sentiment-appropriate prefix
        prefixes = self.sentiment_prefixes.get(sentiment_category, [])
        if prefixes and random.random() > 0.5:  # 50% chance to add prefix
            prefix = random.choice(prefixes)
            base_comment = prefix + base_comment
        
        # Adjust for length
        if length == "short":
            # Keep it brief - take first sentence or first 50 chars
            sentences = base_comment.split('.')
            base_comment = sentences[0] + ("." if not sentences[0].endswith(('.', '!', '?')) else "")
        elif length == "long":
            # Add more context
            extensions = [
                " I'd love to hear more about your journey.",
                " This really resonates with what I've been thinking lately.",
                " Looking forward to seeing more content like this!",
                " This deserves more attention in our community.",
                " Thank you for taking the time to share this."
            ]
            base_comment += random.choice(extensions)
            
        # Add question if requested
        if include_question:
            platform_questions = self.questions.get(platform_key, self.questions["default"])
            questions = platform_questions.get(tone, platform_questions.get("casual", self.questions["default"]["casual"]))
            base_comment += " " + random.choice(questions)
        
        # If the original post was a question, acknowledge it
        if analysis["has_question"] and not include_question:
            acknowledgments = [
                " Great question by the way!",
                " I've been wondering the same thing.",
                " Curious to see other perspectives on this."
            ]
            if random.random() > 0.7:  # 30% chance
                base_comment += random.choice(acknowledgments)

        return {
            "comment": base_comment,
            "analysis": analysis,
            "flagged": False
        }
    
    def generate_multiple_variations(self, content: str, tone: str = "casual", 
                                    count: int = 3, platform: str = "default"):
        """
        Generate multiple comment variations for A/B testing.
        """
        variations = []
        lengths = ["short", "medium", "long"]
        question_options = [True, False]
        
        for i in range(count):
            length = lengths[i % len(lengths)]
            include_q = question_options[i % 2]
            result = self.generate_comment(content, tone, length, include_q, platform)
            if not result.get("flagged"):
                variations.append({
                    "variation": i + 1,
                    "length": length,
                    "has_question": include_q,
                    "comment": result["comment"]
                })
        
        return variations
    
    def validate_comment(self, comment: str) -> dict:
        """
        Validate a comment before posting.
        """
        issues = []
        
        # Check length
        if len(comment) < 10:
            issues.append("Comment is too short")
        if len(comment) > 500:
            issues.append("Comment is too long for most platforms")
        
        # Check for profanity
        if profanity.contains_profanity(comment):
            issues.append("Comment contains inappropriate language")
        
        # Check for spam patterns
        if self.detect_spam(comment):
            issues.append("Comment appears spammy")
        
        # Check for generic phrases
        generic_phrases = ["nice post", "great post", "good post", "cool", "nice", "awesome"]
        if comment.lower().strip() in generic_phrases:
            issues.append("Comment is too generic")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues
        }
