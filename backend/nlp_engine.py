from better_profanity import profanity
import random
from textblob import TextBlob
import spacy

# Load spaCy model (ensure it's installed: python -m spacy download en_core_web_sm)
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Downloading 'en_core_web_sm' model...")
    from spacy.cli import download
    download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

# Initialize profanity filter
profanity.load_censor_words()

class CommentGenerator:
    def __init__(self):
        self.templates = {
            "professional": [
                "Great insights on {topic}. Thanks for sharing!",
                "This is a very valuable perspective regarding {topic}.",
                "I completely agree with your points on {topic}. Well said.",
                "Excellent post! The part about {topic} really resonated with me."
            ],
            "casual": [
                "Love this! {topic} is so true! 🔥",
                "Haha, totally relate to the {topic} part! 😂",
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
        
        self.questions = {
            "professional": [
                "What are your thoughts on the future of this?",
                "How do you see this evolving?",
                "Have you considered the impact on the industry?"
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

    def analyze_post(self, content: str):
        """
        Analyze the post content to extract entities and sentiment.
        """
        doc = nlp(content)
        blob = TextBlob(content)
        
        # Extract key entities (topics)
        topics = [ent.text for ent in doc.ents if ent.label_ in ["ORG", "PRODUCT", "GPE", "WORK_OF_ART", "PERSON"]]
        if not topics:
            # Fallback to noun chunks if no named entities found
            topics = [chunk.text for chunk in doc.noun_chunks]
        
        main_topic = topics[0] if topics else "this"
        
        return {
            "sentiment": blob.sentiment.polarity,
            "subjectivity": blob.sentiment.subjectivity,
            "topic": main_topic
        }

    def generate_comment(self, content: str, tone: str = "casual", length: str = "medium", include_question: bool = False):
        """
        Generate a comment based on content analysis and user preferences.
        """
        # Safety Check
        if profanity.contains_profanity(content):
             return {
                "comment": "[CONTENT FLAGGED] Post contains inappropriate language. No comment generated.",
                "analysis": {"sentiment": 0, "topic": "N/A"}
            }

        analysis = self.analyze_post(content)
        topic = analysis["topic"]
        sentiment = analysis["sentiment"]
        
        # Select template based on tone
        templates = self.templates.get(tone, self.templates["casual"])
        base_comment = random.choice(templates).format(topic=topic)
        
        # Adjust for sentiment (simple logic)
        if sentiment < -0.3:
            if tone == "supportive":
                base_comment = f"I'm sorry to hear that. {base_comment}"
            else:
                base_comment = f"That sounds tough. {base_comment}"
        elif sentiment > 0.5:
             base_comment = f"That's wonderful! {base_comment}"

        # Adjust for length (simple truncation or extension)
        if length == "short":
            base_comment = base_comment.split('.')[0] + "."
        elif length == "long":
            base_comment += " looking forward to seeing more updates from you!"
            
        # Add Question if requested
        if include_question:
            questions = self.questions.get(tone, self.questions["casual"])
            base_comment += " " + random.choice(questions)

        return {
            "comment": base_comment,
            "analysis": analysis
        }
