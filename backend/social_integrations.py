
import requests
import logging
from datetime import datetime
from typing import List, Dict, Any
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

class ScraperIntegration(SocialMediaIntegration):
    """Base class for Selenium-based scraping."""
    
    def _get_driver(self):
        options = Options()
        # options.add_argument("--headless") # Comment out to see the browser (better for debugging/login)
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        # Use a consistent user data dir to persist logins if desired (optional)
        # options.add_argument("user-data-dir=./selenium_profile") 
        
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
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
            
        driver = self._get_driver()
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
            
            try:
                # Wait for timeline (articles)
                WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.TAG_NAME, "article")))
            except:
                logger.warning("Timeout waiting for Twitter articles. Checking for login wall again...")
                if self._wait_and_check_login(driver):
                    driver.refresh()
                    time.sleep(5)
                
            # Scroll to trigger lazy loading
            driver.execute_script("window.scrollTo(0, 1000);")
            time.sleep(3)
            
            # Try multiple selectors for articles
            articles = driver.find_elements(By.TAG_NAME, "article")
            if not articles:
                articles = driver.find_elements(By.CSS_SELECTOR, "[data-testid='tweet']")
            if not articles:
                 # Fallback for some layouts
                articles = driver.find_elements(By.CSS_SELECTOR, ".css-1dbjc4n.r-1loqt21.r-18u37iz.r-1ny4l3l.r-1udh08x.r-1qhn6m8.r-i023vh.r-o7ynqc.r-6416eg")

            logger.info(f"Found {len(articles)} articles")
            
            for article in articles:
                try:
                    # Try to extract text - prioritized selectors
                    text = ""
                    text_element = None
                    try:
                        text_element = article.find_element(By.CSS_SELECTOR, "[data-testid='tweetText']")
                    except:
                        try:
                            text_element = article.find_element(By.XPATH, ".//div[@lang]")
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
        driver = self._get_driver()
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
            
            # Check for feed items
            items = driver.find_elements(By.CLASS_NAME, "feed-shared-update-v2")
            if not items:
                # Try main profile
                url = f"https://www.linkedin.com/in/{username}"
                driver.get(url)
                time.sleep(5)
                items = driver.find_elements(By.CLASS_NAME, "feed-shared-update-v2")
            
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
        driver = self._get_driver()
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
        else:
            raise ValueError(f"Unsupported platform: {platform}")
