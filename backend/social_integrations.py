
import requests
import logging
from datetime import datetime
from typing import List, Dict, Any
import praw
from praw.exceptions import PRAWException
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SocialMediaIntegration:
    """Base class for social media integrations."""
    
    def fetch_posts(self, credentials: Dict[str, str]) -> List[Dict[str, Any]]:
        raise NotImplementedError("Subclasses must implement fetch_posts")

    def validate_token(self, credentials: Dict[str, str]) -> Dict[str, Any]:
        """Validate credentials. For scraping, this usually just checks if we can load a page."""
        return {"valid": True, "username": credentials.get("username"), "method": "scraper"}

    def post_comment(self, credentials: Dict[str, str], post_id: str, content: str) -> Dict[str, Any]:
        """Post a comment to the platform."""
        # Default mock implementation for platforms that don't support posting yet or are simulated
        return {"success": True, "id": f"mock_{int(datetime.utcnow().timestamp())}", "url": f"https://mock.com/comment/{int(datetime.utcnow().timestamp())}", "error": None}

class ScraperIntegration(SocialMediaIntegration):
    """Base class for Selenium-based scraping."""
    
    def _get_driver(self, profile_id: str = "default"):
        options = Options()
        # options.add_argument("--headless") # Comment out to see the browser (better for debugging/login)
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        # Anti-detection
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # Use a consistent user data dir to persist logins
        # Create a unique profile for each account to avoid conflicts and save sessions
        import os
        base_dir = os.path.join(os.getcwd(), "selenium_profiles")
        os.makedirs(base_dir, exist_ok=True)
        profile_dir = os.path.join(base_dir, profile_id)
        options.add_argument(f"user-data-dir={profile_dir}")
        
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        
        # Patch navigator.webdriver
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        return driver

    def _wait_and_check_login(self, driver):
        """Helper to wait for content or login wall."""
        try:
            time.sleep(5) # Initial render wait
            
            # Check for common login indicators
            page_text = driver.page_source.lower()
            current_url = driver.current_url.lower()
            
            # More robust detection logic
            login_indicators = ["log in", "sign in", "sign up", "connect with", "username", "password"]
            is_login_page = "login" in current_url or "signin" in current_url or "signup" in current_url
            
            has_login_fields = len(driver.find_elements(By.CSS_SELECTOR, "input[type='password']")) > 0
            
            if is_login_page or has_login_fields or any(ind in page_text for ind in ["log in to", "sign in to"]):
                logger.warning("Potential Login Wall detected. Pausing for manual interaction.")
                # We wait specifically for the user to potentially login
                # Wait for 5 minutes to allow user to login manually
                print(">>> BROWSER PAUSED FOR USER LOGIN - WILL CONTINUE IN 5 MINUTES <<<")
                time.sleep(300) 
                return True
            return False
        except Exception as e:
            logger.error(f"Error checking login: {e}")
            driver.save_screenshot("debug_login_check_error.png")
            return False
            
    def _keep_open_on_failure(self, driver, item_count):
        """Keep browser open if no items found, assuming auth issue."""
        if item_count == 0:
            logger.warning("No items found. Keeping browser open for debugging/login for 60 seconds...")
            time.sleep(60)

class TwitterScraper(ScraperIntegration):
    """Twitter Scraper using Selenium."""
    
    def fetch_posts(self, credentials: Dict[str, str]) -> List[Dict[str, Any]]:
        username = credentials.get("username")
        if not username:
            return []
            
        driver = self._get_driver(f"twitter_{username}")
        posts = []
        try:
            url = f"https://twitter.com/{username}"
            logger.info(f"Scraping Twitter: {url}")
            driver.get(url)
            
            # Wait for content to load
            if self._wait_and_check_login(driver):
                logger.info("Login wait finished. Refreshing page to load content...")
                driver.refresh()
                time.sleep(5)
            
            # DEBUG: Screenshot before scraping
            driver.save_screenshot(f"debug_twitter_{username}_start.png")
            
            # Wait for timeline
            try:
                # Wait for the primary column or check for empty state
                WebDriverWait(driver, 20).until(
                    EC.any_of(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='tweet']")),
                        EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='primaryColumn']"))
                    )
                )
            except:
                logger.warning("Timeout waiting for Twitter content.")
                driver.save_screenshot(f"debug_twitter_{username}_timeout.png")
                if self._wait_and_check_login(driver):
                    driver.refresh()
                    time.sleep(5)
                
            # Scroll to trigger lazy loading (scroll multiple times)
            for _ in range(3):
                driver.execute_script("window.scrollBy(0, 1000);")
                time.sleep(2)
            
            # Try multiple selectors for articles
            articles = driver.find_elements(By.CSS_SELECTOR, "[data-testid='tweet']")
            if not articles:
                articles = driver.find_elements(By.TAG_NAME, "article")

            logger.info(f"Found {len(articles)} articles")
            if not articles:
                driver.save_screenshot(f"debug_twitter_{username}_no_articles.png")
                with open(f"debug_twitter_{username}.html", "w", encoding="utf-8") as f:
                    f.write(driver.page_source)
            
            for article in articles:
                try:
                    # Scroll into view to ensure text renders
                    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", article)
                    
                    # Try to extract text - prioritized selectors
                    text = ""
                    text_element = None
                    try:
                        text_element = article.find_element(By.CSS_SELECTOR, "[data-testid='tweetText']")
                    except:
                        pass
                    
                    if text_element:
                        text = text_element.text
                    else:
                        # Fallback: just get all text from article
                        text = article.text.replace("\n", " ")
                    
                    if not text:
                        continue
                        
                    # Try to find user handle
                    try:
                         handle_el = article.find_element(By.CSS_SELECTOR, "div[dir='ltr'] > span")
                         if handle_el.text.startswith("@"):
                             username = handle_el.text
                    except:
                        pass

                    posts.append({
                        "platform": "Twitter",
                        "content": text,
                        "author": username,
                        "url": url,
                        "likes": 0, 
                        "comments_count": 0,
                        "shares": 0,
                        "fetched_at": datetime.utcnow()
                    })
                except Exception as ex:
                    logger.error(f"Error parsing tweet: {ex}")
                    continue
                    
        except Exception as e:
            logger.error(f"Twitter scrape error: {e}")
        finally:
            self._keep_open_on_failure(driver, len(posts))
            driver.quit()
            
        return posts

class LinkedInScraper(ScraperIntegration):
    """LinkedIn Public Profile Scraper."""
    
    def fetch_posts(self, credentials: Dict[str, str]) -> List[Dict[str, Any]]:
        # LinkedIn public profiles often block scraping.
        # This is a best-effort attempt.
        username = credentials.get("username")
        driver = self._get_driver(f"linkedin_{username}")
        posts = []
        try:
            # Try to go to recent activity if public
            url = f"https://www.linkedin.com/in/{username}/recent-activity/all/"
            logger.info(f"Scraping LinkedIn: {url}")
            driver.get(url)
            time.sleep(5) 
            
            # Check for login/auth wall
            if "auth_wall" in driver.current_url or "login" in driver.current_url:
                 logger.warning("LinkedIn Auth Wall detected. Please log in manually.")
                 time.sleep(15)
            
            # Check for feed items (updated selectors 2024/2025)
            # LinkedIn DOM is very complex and dynamic.
            
            # Try scrolling first
            driver.execute_script("window.scrollTo(0, 500);")
            time.sleep(2)

            selectors = [
                ".feed-shared-update-v2",
                "div[data-urn]",
                ".occludable-update"
            ]
            
            items = []
            for sel in selectors:
                found = driver.find_elements(By.CSS_SELECTOR, sel)
                if found:
                    items = found
                    break
            
            if not items:
                logger.warning("No LinkedIn items found with standard selectors.")
                driver.save_screenshot(f"debug_linkedin_{username}_fail.png")
                # Try main profile if activity failed
                if "recent-activity" in driver.current_url:
                     logger.info("Redirecting to main profile to try fetching posts there...")
                     driver.get(f"https://www.linkedin.com/in/{username}")
                     time.sleep(5)
                     items = driver.find_elements(By.CSS_SELECTOR, ".feed-shared-update-v2")
            
            # Parse found items
            for item in items[:5]:
                try:
                    text = item.text.split("\n")[0] # Naive text extraction
                    if len(text) > 10:
                        posts.append({
                            "platform": "LinkedIn",
                            "content": text,
                            "author": username,
                            "url": url,
                            "likes": 0,
                            "comments_count": 0,
                            "shares": 0,
                            "fetched_at": datetime.utcnow()
                        })
                except:
                    continue

        except Exception as e:
            logger.error(f"LinkedIn scrape error: {e}")
            # Pause on error to let user see what happened
            time.sleep(10)
        finally:
            self._keep_open_on_failure(driver, len(posts))
            driver.quit()
        return posts

class InstagramScraper(ScraperIntegration):
    """Instagram Scraper."""
    
    def fetch_posts(self, credentials: Dict[str, str]) -> List[Dict[str, Any]]:
        username = credentials.get("username")
        driver = self._get_driver(f"instagram_{username}")
        posts = []
        try:
            url = f"https://www.instagram.com/{username}/"
            logger.info(f"Scraping Instagram: {url}")
            driver.get(url)
            
            # Wait for images
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "img")))
            
            # Instagram loads images in a grid.
            links = driver.find_elements(By.TAG_NAME, "a")
            image_links = [l for l in links if "/p/" in l.get_attribute("href")]
            
            for link in image_links[:5]: # First 5
                post_url = link.get_attribute("href")
                # Need to click or extract alt text from img inside
                try:
                    img = link.find_element(By.TAG_NAME, "img")
                    alt_text = img.get_attribute("alt")
                    if alt_text:
                        posts.append({
                            "platform": "Instagram",
                            "content": alt_text, # Instagram captions are often in alt text on grid
                            "author": username,
                            "url": post_url,
                            "likes": 0,
                            "comments_count": 0,
                            "shares": 0,
                            "fetched_at": datetime.utcnow()
                        })
                except:
                    continue
                    
        except Exception as e:
            logger.error(f"Instagram scrape error: {e}")
            time.sleep(10)
        finally:
            self._keep_open_on_failure(driver, len(posts))
            driver.quit()
        return posts


class TwitterIntegration(SocialMediaIntegration):
    """Twitter API v2 Integration."""
    
    BASE_URL = "https://api.twitter.com/2"
    
    def fetch_posts(self, credentials: Dict[str, str]) -> List[Dict[str, Any]]:
        # Requires Bearer Token from Developer Portal
        token = credentials.get("access_token")
        if not token:
            logger.error("No access token provided for Twitter")
            return []

        headers = {"Authorization": f"Bearer {token}"}
        
        # Fetch tweets from the authenticated user
        # Note: 'users/me' to get ID, then 'users/:id/tweets'
        try:
            # 1. Get User ID
            user_resp = requests.get(f"{self.BASE_URL}/users/me", headers=headers)
            if user_resp.status_code != 200:
                logger.error(f"Failed to get Twitter user: {user_resp.text}")
                return []
            
            user_data = user_resp.json().get("data", {})
            user_id = user_data.get("id")
            username = user_data.get("username")
            
            if not user_id:
                return []

            # 2. Get User Tweets
            params = {
                "max_results": 10,
                "tweet.fields": "created_at,public_metrics,text"
            }
            tweets_resp = requests.get(f"{self.BASE_URL}/users/{user_id}/tweets", headers=headers, params=params)
            
            if tweets_resp.status_code != 200:
                logger.error(f"Failed to fetch tweets: {tweets_resp.text}")
                return []

            tweets = tweets_resp.json().get("data", [])
            
            posts = []
            for tweet in tweets:
                metrics = tweet.get("public_metrics", {})
                posts.append({
                    "platform": "Twitter",
                    "content": tweet.get("text"),
                    "author": username or "me",
                    "url": f"https://twitter.com/{username}/status/{tweet.get('id')}",
                    "likes": metrics.get("like_count", 0),
                    "comments_count": metrics.get("reply_count", 0),
                    "shares": metrics.get("retweet_count", 0),
                    "fetched_at": datetime.utcnow()
                })
            
            return posts

        except Exception as e:
            logger.error(f"Twitter integration error: {e}")
            return []

    def validate_token(self, credentials: Dict[str, str]) -> Dict[str, Any]:
        token = credentials.get("access_token")
        if not token:
            return {"valid": False, "error": "No token"}
            
        headers = {"Authorization": f"Bearer {token}"}
        try:
            resp = requests.get(f"{self.BASE_URL}/users/me", headers=headers)
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                return {
                    "valid": True, 
                    "username": data.get("username"),
                    "name": data.get("name"),
                    "id": data.get("id")
                }
            return {"valid": False, "error": resp.text}
        except Exception as e:
            return {"valid": False, "error": str(e)}

class LinkedInIntegration(SocialMediaIntegration):
    """LinkedIn API Integration."""
    
    BASE_URL = "https://api.linkedin.com/v2"
    
    def fetch_posts(self, credentials: Dict[str, str]) -> List[Dict[str, Any]]:
        token = credentials.get("access_token")
        if not token:
            return []

        headers = {
            "Authorization": f"Bearer {token}",
            "X-Restli-Protocol-Version": "2.0.0"
        }
        
        try:
            # 1. Get User URN
            me_resp = requests.get(f"{self.BASE_URL}/me", headers=headers)
            if me_resp.status_code != 200:
                logger.error(f"Failed to get LinkedIn profile: {me_resp.text}")
                return []
                
            me_data = me_resp.json()
            user_urn = f"urn:li:person:{me_data.get('id')}"
            first_name = me_data.get("localizedFirstName", "LinkedIn User")
            last_name = me_data.get("localizedLastName", "")
            author_name = f"{first_name} {last_name}".strip()

            # 2. Fetch Posts (Shares)
            # UGC Post API or Shares API. 'ugcPosts' is newer.
            # However, getting feed is complex. We'll try fetching 'ugcPosts' by author.
            # endpoint: https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn:li:person:ID)
            
            params = {
                "q": "authors",
                "authors": f"List({user_urn})"
            }
            
            posts_resp = requests.get(f"{self.BASE_URL}/ugcPosts", headers=headers, params=params)
             
            if posts_resp.status_code != 200:
                logger.error(f"Failed to fetch LinkedIn posts: {posts_resp.text}")
                return []
                
            elements = posts_resp.json().get("elements", [])
            
            posts = []
            for item in elements:
                # Extract content
                specific_content = item.get("specificContent", {}).get("com.linkedin.ugc.ShareContent", {})
                text = specific_content.get("shareCommentary", {}).get("text", "")
                
                if not text:
                    continue
                    
                urn = item.get("id") # urn:li:share:123
                post_id = urn.split(":")[-1] if urn else ""
                
                posts.append({
                    "platform": "LinkedIn",
                    "content": text,
                    "author": author_name,
                    "url": f"https://www.linkedin.com/feed/update/{urn}",
                    "likes": 0, # Requires separate API call for social actions
                    "comments_count": 0,
                    "shares": 0,
                    "fetched_at": datetime.utcnow()
                })
                
            return posts
            
        except Exception as e:
            logger.error(f"LinkedIn integration error: {e}")
            return []

    def validate_token(self, credentials: Dict[str, str]) -> Dict[str, Any]:
        token = credentials.get("access_token")
        headers = {
            "Authorization": f"Bearer {token}",
            "X-Restli-Protocol-Version": "2.0.0"
        }
        try:
            resp = requests.get(f"{self.BASE_URL}/me", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                first = data.get("localizedFirstName", "")
                last = data.get("localizedLastName", "")
                return {
                    "valid": True,
                    "username": f"{first}{last}",
                    "name": f"{first} {last}",
                    "id": data.get("id")
                }
            return {"valid": False, "error": resp.text}
        except Exception as e:
            return {"valid": False, "error": str(e)}

class InstagramIntegration(SocialMediaIntegration):
    """Instagram Basic Display API."""
    
    BASE_URL = "https://graph.instagram.com"
    
    def fetch_posts(self, credentials: Dict[str, str]) -> List[Dict[str, Any]]:
        token = credentials.get("access_token")
        if not token:
            return []
            
        try:
            # 1. Get Me (fields=id,username)
            params = {
                "fields": "id,username,media_count,account_type",
                "access_token": token
            }
            me_resp = requests.get(f"{self.BASE_URL}/me", params=params)
            if me_resp.status_code != 200:
                logger.error(f"Instagram Me error: {me_resp.text}")
                return []
                
            me_data = me_resp.json()
            username = me_data.get("username")

            # 2. Get Media
            media_params = {
                "fields": "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username",
                "access_token": token
            }
            media_resp = requests.get(f"{self.BASE_URL}/me/media", params=media_params)
            
            if media_resp.status_code != 200:
                return []
                
            data = media_resp.json().get("data", [])
            
            posts = []
            for item in data:
                posts.append({
                    "platform": "Instagram",
                    "content": item.get("caption", ""),
                    "author": item.get("username", username),
                    "url": item.get("permalink", ""),
                    "image_description": "Instagram Media", 
                    "likes": 0, # Basic Display API doesn't give likes/comments count easily without Graph API
                    "comments_count": 0,
                    "shares": 0,
                    "fetched_at": datetime.utcnow()
                })
            return posts

        except Exception as e:
            logger.error(f"Instagram integration error: {e}")
            return []
            
    def validate_token(self, credentials: Dict[str, str]) -> Dict[str, Any]:
        token = credentials.get("access_token")
        try:
            params = {
                "fields": "id,username",
                "access_token": token
            }
            resp = requests.get(f"{self.BASE_URL}/me", params=params)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "valid": True,
                    "username": data.get("username"),
                    "name": data.get("username"),
                    "id": data.get("id")
                }
            return {"valid": False, "error": resp.text}
        except Exception as e:
            return {"valid": False, "error": str(e)}

class RedditIntegration(SocialMediaIntegration):
    """Reddit API Integration using PRAW (Python Reddit API Wrapper)."""
    
    def __init__(self):
        self.reddit = None
    
    def _get_reddit_instance(self, credentials: Dict[str, str]):
        """Initialize and return a Reddit instance."""
        client_id = credentials.get("client_id")
        client_secret = credentials.get("client_secret")
        user_agent = credentials.get("user_agent", "SocialMediaBot/1.0")
        username = credentials.get("username")
        password = credentials.get("password")
        
        if not client_id or not client_secret:
            raise ValueError("Reddit API requires client_id and client_secret")
        
        if username and password:
            return praw.Reddit(
                client_id=client_id,
                client_secret=client_secret,
                user_agent=user_agent,
                username=username,
                password=password
            )
        
        return praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=user_agent
        )
    
    def fetch_posts(self, credentials: Dict[str, str]) -> List[Dict[str, Any]]:
        """
        Fetch hot posts from Reddit.
        
        credentials should contain:
        - client_id: Reddit API client ID
        - client_secret: Reddit API client secret
        - user_agent: Custom user agent string (optional, defaults to 'SocialMediaBot/1.0')
        - subreddit: Subreddit name to fetch from (e.g., 'technology', 'programming')
        - limit: Number of posts to fetch (optional, defaults to 10)
        - sort: Sorting method - 'hot', 'new', 'top', 'rising' (optional, defaults to 'hot')
        """
        try:
            reddit = self._get_reddit_instance(credentials)
            
            subreddit_name = credentials.get("subreddit", "all")
            limit = int(credentials.get("limit", 10))
            sort_method = credentials.get("sort", "hot").lower()
            
            subreddit = reddit.subreddit(subreddit_name)
            
            # Get posts based on sort method
            if sort_method == "new":
                posts_iterator = subreddit.new(limit=limit)
            elif sort_method == "top":
                posts_iterator = subreddit.top(limit=limit)
            elif sort_method == "rising":
                posts_iterator = subreddit.rising(limit=limit)
            else:  # Default to hot
                posts_iterator = subreddit.hot(limit=limit)
            
            posts = []
            for post in posts_iterator:
                # Get post content - combine title and selftext
                content = post.title
                if post.selftext:
                    content += f"\n\n{post.selftext}"
                
                posts.append({
                    "platform": "Reddit",
                    "content": content,
                    "author": str(post.author) if post.author else "[deleted]",
                    "url": f"https://reddit.com{post.permalink}",
                    "likes": post.score,  # Reddit uses "score" (upvotes - downvotes)
                    "comments_count": post.num_comments,
                    "shares": 0,  # Reddit doesn't have a direct share count
                    "subreddit": subreddit_name,
                    "post_id": post.id,
                    "is_video": post.is_video,
                    "is_image": hasattr(post, 'post_hint') and post.post_hint == 'image',
                    "thumbnail": post.thumbnail if post.thumbnail and post.thumbnail.startswith('http') else None,
                    "created_utc": datetime.utcfromtimestamp(post.created_utc),
                    "fetched_at": datetime.utcnow()
                })
            
            logger.info(f"Fetched {len(posts)} posts from r/{subreddit_name}")
            return posts
            
        except PRAWException as e:
            logger.error(f"Reddit PRAW error: {e}")
            return []
        except Exception as e:
            logger.error(f"Reddit integration error: {e}")
            return []
    
    def fetch_user_posts(self, credentials: Dict[str, str]) -> List[Dict[str, Any]]:
        """
        Fetch posts from a specific Reddit user.
        
        credentials should contain:
        - client_id: Reddit API client ID
        - client_secret: Reddit API client secret
        - user_agent: Custom user agent string
        - username: Reddit username to fetch posts from
        - limit: Number of posts to fetch (optional, defaults to 10)
        """
        try:
            reddit = self._get_reddit_instance(credentials)
            
            username = credentials.get("username")
            if not username:
                logger.error("No username provided for Reddit user posts")
                return []
            
            limit = int(credentials.get("limit", 10))
            
            redditor = reddit.redditor(username)
            
            posts = []
            for submission in redditor.submissions.new(limit=limit):
                content = submission.title
                if submission.selftext:
                    content += f"\n\n{submission.selftext}"
                
                posts.append({
                    "platform": "Reddit",
                    "content": content,
                    "author": username,
                    "url": f"https://reddit.com{submission.permalink}",
                    "likes": submission.score,
                    "comments_count": submission.num_comments,
                    "shares": 0,
                    "subreddit": str(submission.subreddit),
                    "post_id": submission.id,
                    "fetched_at": datetime.utcnow()
                })
            
            logger.info(f"Fetched {len(posts)} posts from u/{username}")
            return posts
            
        except PRAWException as e:
            logger.error(f"Reddit PRAW error: {e}")
            return []
        except Exception as e:
            logger.error(f"Reddit user posts error: {e}")
            return []
    
    def validate_token(self, credentials: Dict[str, str]) -> Dict[str, Any]:
        """Validate Reddit API credentials."""
        try:
            reddit = self._get_reddit_instance(credentials)
            # Try to access a subreddit to verify credentials work
            test_sub = reddit.subreddit("test")
            # This will throw an error if credentials are invalid
            _ = test_sub.display_name
            
            return {
                "valid": True,
                "username": credentials.get("username", "anonymous"),
                "method": "api"
            }
        except PRAWException as e:
            return {"valid": False, "error": f"PRAW Error: {str(e)}"}
            return {"valid": False, "error": str(e)}

    def post_comment(self, credentials: Dict[str, str], post_id: str, content: str) -> Dict[str, Any]:
        """
        Post a comment to a Reddit submission.
        """
        try:
            reddit = self._get_reddit_instance(credentials)
            # Reddit post IDs from PRAW usually don't have the 't3_' prefix for submission objects,
            # but sometimes they might. PRAW submission(id=...) expects the ID without prefix usually.
            # If the stored ID matches the pattern, we use it.
            
            submission = reddit.submission(id=post_id)
            comment = submission.reply(content)
            
            return {
                "success": True,
                "id": comment.id,
                "url": f"https://reddit.com{comment.permalink}",
                "error": None
            }
        except PRAWException as e:
            logger.error(f"Reddit post comment error: {e}")
            return {"success": False, "error": f"PRAW Error: {str(e)}"}
        except Exception as e:
            logger.error(f"Reddit post comment generic error: {e}")
            return {"success": False, "error": str(e)}


# Factory
class SocialMediaFactory:
    @staticmethod
    def get_integration(platform: str, method: str = "api") -> SocialMediaIntegration:
        """
        Get integration instance.
        method: 'api' (official/token) or 'scraper' (selenium/no-api)
        """
        platform = platform.lower()
        
        if method == "scraper":
            if platform == "twitter":
                return TwitterScraper()
            elif platform == "linkedin":
                return LinkedInScraper()
            elif platform == "instagram":
                return InstagramScraper()
            else:
                # Fallback to API/basic if scraper not defined
                pass

        if platform == "twitter":
            return TwitterIntegration()
        elif platform == "linkedin":
            return LinkedInIntegration()
        elif platform == "instagram":
            return InstagramIntegration()
        elif platform == "reddit":
            return RedditIntegration()
        else:
            raise ValueError(f"Unsupported platform: {platform}")
