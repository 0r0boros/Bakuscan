"""
Web scraping module for BakuScan
Uses Selenium with headless Chrome to scrape pricing and image data
Includes fallback mechanisms when web scraping fails
"""

import os
import re
import json
import time
import shutil
from typing import List, Dict, Optional
from bs4 import BeautifulSoup

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException


ATTRIBUTE_COLORS = {
    "Pyrus": "#e63946",
    "Aquos": "#0ea5e9",
    "Subterra": "#a16207",
    "Haos": "#fbbf24",
    "Darkus": "#7c3aed",
    "Ventus": "#22c55e"
}

RARITY_VALUES = {
    "Common": {"min": 5, "max": 15, "avg": 8},
    "Uncommon": {"min": 10, "max": 25, "avg": 15},
    "Rare": {"min": 20, "max": 50, "avg": 30},
    "Super Rare": {"min": 40, "max": 100, "avg": 60},
    "Ultra Rare": {"min": 80, "max": 250, "avg": 120}
}


def get_chromium_binary():
    """Find Chromium binary path dynamically"""
    for browser in ['chromium', 'chromium-browser', 'google-chrome', 'chrome']:
        path = shutil.which(browser)
        if path:
            return path
    return None


def create_selenium_driver():
    """Create a Selenium WebDriver with headless Chrome configured for Replit"""
    chrome_options = Options()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-software-rasterizer")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    
    chromium_path = get_chromium_binary()
    if chromium_path:
        chrome_options.binary_location = chromium_path
    
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    try:
        driver = webdriver.Chrome(options=chrome_options)
        driver.execute_cdp_cmd('Network.setUserAgentOverride', {
            "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        })
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        return driver
    except Exception as e:
        print(f"Error creating Selenium driver: {e}")
        return None


def estimate_price_by_rarity(rarity: str = None) -> Dict:
    """Estimate price based on rarity when web scraping fails"""
    if rarity and rarity in RARITY_VALUES:
        values = RARITY_VALUES[rarity]
    else:
        values = RARITY_VALUES["Common"]
    
    return {
        "success": True,
        "estimated": True,
        "average_price": values["avg"],
        "min_price": values["min"],
        "max_price": values["max"],
        "num_listings": 0,
        "listings": [],
        "error": None
    }


def scrape_ebay_prices(bakugan_name: str, attribute: str = None, limit: int = 10, rarity: str = None) -> Dict:
    """
    Scrape eBay sold listings for pricing data using Selenium
    Falls back to estimated values if scraping fails
    """
    result = {
        "success": False,
        "bakugan_name": bakugan_name,
        "average_price": None,
        "min_price": None,
        "max_price": None,
        "num_listings": 0,
        "listings": [],
        "error": None,
        "estimated": False
    }
    
    search_query = f"Bakugan {bakugan_name}"
    if attribute:
        search_query += f" {attribute}"
    
    search_url = f"https://www.ebay.com/sch/i.html?_nkw={search_query.replace(' ', '+')}&LH_Sold=1&LH_Complete=1&_sop=13"
    
    driver = None
    try:
        driver = create_selenium_driver()
        if not driver:
            fallback = estimate_price_by_rarity(rarity)
            result.update(fallback)
            result["bakugan_name"] = bakugan_name
            result["error"] = "Failed to create browser driver"
            return result
        
        driver.get(search_url)
        time.sleep(2)
        
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".s-item, .srp-results"))
            )
        except TimeoutException:
            pass
        
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, 'html.parser')
        
        listings = soup.select('.s-card, .srp-results li.s-card')
        prices = []
        
        for item in listings[:limit * 3]:
            try:
                item_classes = item.get('class', [])
                if 's-card' not in item_classes:
                    continue
                
                title_elem = item.select_one('[class*="title"]') or item.select_one('span') or item.select_one('a')
                price_elem = item.select_one('[class*="price"]') or item.select_one('[class*="Price"]')
                link_elem = item.select_one('a[href*="ebay.com/itm"]')
                
                if not title_elem or not price_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                
                if title.lower() == "shop on ebay" or "shop on ebay" in title.lower():
                    continue
                
                if "sellers with" in title.lower() or "returns" in title.lower():
                    continue
                
                if bakugan_name.lower() not in title.lower():
                    continue
                
                price_text = price_elem.get_text(strip=True)
                price_match = re.search(r'\$?([\d,]+\.?\d*)', price_text)
                
                if not price_match:
                    continue
                
                price = float(price_match.group(1).replace(',', ''))
                
                if price < 1 or price > 500:
                    continue
                
                listing = {
                    "title": title[:80],
                    "price": price,
                    "url": link_elem.get('href') if link_elem else None
                }
                
                result["listings"].append(listing)
                prices.append(price)
                
                if len(prices) >= limit:
                    break
                    
            except Exception:
                continue
        
        if prices:
            result["success"] = True
            result["average_price"] = round(sum(prices) / len(prices), 2)
            result["min_price"] = min(prices)
            result["max_price"] = max(prices)
            result["num_listings"] = len(prices)
        else:
            fallback = estimate_price_by_rarity(rarity)
            result.update(fallback)
            result["bakugan_name"] = bakugan_name
            
    except WebDriverException as e:
        fallback = estimate_price_by_rarity(rarity)
        result.update(fallback)
        result["bakugan_name"] = bakugan_name
        result["error"] = f"Browser error: {str(e)[:100]}"
    except Exception as e:
        fallback = estimate_price_by_rarity(rarity)
        result.update(fallback)
        result["bakugan_name"] = bakugan_name
        result["error"] = str(e)[:100]
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass
    
    return result


def scrape_reference_images(bakugan_name: str, attribute: str = None, limit: int = 5) -> Dict:
    """
    Scrape reference images for a specific Bakugan using Selenium
    Uses Bing image search as primary source
    """
    result = {
        "success": False,
        "bakugan_name": bakugan_name,
        "images": [],
        "error": None
    }
    
    search_query = f"Bakugan {bakugan_name} toy figure"
    if attribute:
        search_query += f" {attribute}"
    
    bing_url = f"https://www.bing.com/images/search?q={search_query.replace(' ', '+')}&qft=+filterui:photo-photo"
    
    driver = None
    try:
        driver = create_selenium_driver()
        if not driver:
            result["images"] = get_placeholder_images(bakugan_name, attribute)
            if result["images"]:
                result["success"] = True
            return result
        
        driver.get(bing_url)
        time.sleep(2)
        
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".iusc, .mimg, img"))
            )
        except TimeoutException:
            pass
        
        page_source = driver.page_source
        soup = BeautifulSoup(page_source, 'html.parser')
        
        img_links = soup.select('a.iusc')
        
        for item in img_links:
            if len(result["images"]) >= limit:
                break
            
            try:
                m_attr = item.get('m')
                if m_attr:
                    data = json.loads(m_attr)
                    img_url = data.get('murl')
                    title = data.get('t', bakugan_name)
                    
                    if img_url and not any(x in img_url.lower() for x in ['gif', 'svg', 'logo']):
                        result["images"].append({
                            "url": img_url,
                            "title": title[:60] if len(title) > 60 else title,
                            "source": "Web"
                        })
            except Exception:
                continue
        
        if not result["images"]:
            img_tags = soup.select('img.mimg, .img_cont img')
            for img in img_tags[:limit]:
                src = img.get('src') or img.get('data-src')
                if src and src.startswith('http') and 'bing.com/th' not in src.lower():
                    result["images"].append({
                        "url": src,
                        "title": bakugan_name,
                        "source": "Web"
                    })
        
        if result["images"]:
            result["success"] = True
        else:
            result["images"] = get_placeholder_images(bakugan_name, attribute)
            if result["images"]:
                result["success"] = True
            else:
                result["error"] = "No images found"
            
    except Exception as e:
        result["images"] = get_placeholder_images(bakugan_name, attribute)
        if result["images"]:
            result["success"] = True
        else:
            result["error"] = str(e)[:100]
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass
    
    return result


def get_placeholder_images(bakugan_name: str, attribute: str = None) -> List[Dict]:
    """Generate placeholder image data when scraping fails"""
    color = ATTRIBUTE_COLORS.get(attribute, "#888888")[1:]
    placeholder_urls = [
        f"https://via.placeholder.com/300x300/{color}/fff?text={bakugan_name[:3]}",
    ]
    
    return [{
        "url": url,
        "title": f"{bakugan_name} ({attribute or 'Unknown'})",
        "source": "Placeholder"
    } for url in placeholder_urls]


def get_market_data(bakugan_name: str, attribute: str = None, rarity: str = None) -> Dict:
    """
    Get comprehensive market data including prices and reference images
    Uses Selenium for web scraping
    """
    pricing = scrape_ebay_prices(bakugan_name, attribute, rarity=rarity)
    
    images = scrape_reference_images(bakugan_name, attribute, limit=6)
    
    return {
        "bakugan_name": bakugan_name,
        "attribute": attribute,
        "pricing": {
            "success": pricing["success"],
            "estimated": pricing.get("estimated", False),
            "average_price": pricing["average_price"],
            "min_price": pricing["min_price"],
            "max_price": pricing["max_price"],
            "num_listings": pricing["num_listings"],
            "listings": pricing["listings"][:5],
            "error": pricing["error"]
        },
        "images": {
            "success": images["success"],
            "items": images["images"][:6],
            "error": images["error"]
        }
    }


if __name__ == "__main__":
    print("Testing Selenium scraping for 'Dragonoid'...")
    result = get_market_data("Dragonoid", "Pyrus", "Rare")
    print(json.dumps(result, indent=2))
