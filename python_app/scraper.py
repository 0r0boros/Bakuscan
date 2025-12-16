"""
Web scraping module for BakuScan
Uses Selenium to scrape eBay for pricing data and images for reference identification
"""

import os
import re
import time
import json
from typing import List, Dict, Optional
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from bs4 import BeautifulSoup
import requests


def get_chrome_driver():
    """Create and configure a headless Chrome driver for Replit environment"""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    chrome_path = os.popen("which chromium").read().strip()
    if chrome_path:
        chrome_options.binary_location = chrome_path
    
    chromedriver_path = os.popen("which chromedriver").read().strip()
    
    if chromedriver_path:
        service = Service(executable_path=chromedriver_path)
        driver = webdriver.Chrome(service=service, options=chrome_options)
    else:
        driver = webdriver.Chrome(options=chrome_options)
    
    return driver


def scrape_ebay_prices(bakugan_name: str, attribute: str = None, limit: int = 10) -> Dict:
    """
    Scrape eBay sold listings for pricing data on a specific Bakugan
    
    Args:
        bakugan_name: Name of the Bakugan (e.g., "Dragonoid")
        attribute: Optional attribute like "Pyrus", "Haos", etc.
        limit: Maximum number of listings to fetch
    
    Returns:
        Dictionary with pricing data including average, min, max, and listings
    """
    result = {
        "success": False,
        "bakugan_name": bakugan_name,
        "average_price": None,
        "min_price": None,
        "max_price": None,
        "num_listings": 0,
        "listings": [],
        "error": None
    }
    
    search_query = f"Bakugan {bakugan_name}"
    if attribute:
        search_query += f" {attribute}"
    
    search_url = f"https://www.ebay.com/sch/i.html?_nkw={search_query.replace(' ', '+')}&LH_Sold=1&LH_Complete=1&_sop=13"
    
    driver = None
    try:
        driver = get_chrome_driver()
        driver.set_page_load_timeout(30)
        driver.get(search_url)
        
        time.sleep(2)
        
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".srp-results"))
        )
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        listings = soup.select('.s-item')
        prices = []
        
        for item in listings[:limit]:
            try:
                title_elem = item.select_one('.s-item__title')
                price_elem = item.select_one('.s-item__price')
                link_elem = item.select_one('.s-item__link')
                date_elem = item.select_one('.s-item__title--tag')
                
                if title_elem and price_elem:
                    title = title_elem.get_text(strip=True)
                    
                    if bakugan_name.lower() not in title.lower():
                        continue
                    
                    price_text = price_elem.get_text(strip=True)
                    price_match = re.search(r'\$?([\d,]+\.?\d*)', price_text)
                    
                    if price_match:
                        price = float(price_match.group(1).replace(',', ''))
                        
                        if price < 1 or price > 500:
                            continue
                        
                        listing = {
                            "title": title,
                            "price": price,
                            "url": link_elem.get('href') if link_elem else None,
                            "sold_date": date_elem.get_text(strip=True) if date_elem else None
                        }
                        
                        result["listings"].append(listing)
                        prices.append(price)
            except Exception as e:
                continue
        
        if prices:
            result["success"] = True
            result["average_price"] = round(sum(prices) / len(prices), 2)
            result["min_price"] = min(prices)
            result["max_price"] = max(prices)
            result["num_listings"] = len(prices)
        else:
            result["error"] = "No matching listings found"
            
    except TimeoutException:
        result["error"] = "Page load timed out"
    except Exception as e:
        result["error"] = str(e)
    finally:
        if driver:
            driver.quit()
    
    return result


def scrape_reference_images(bakugan_name: str, attribute: str = None, limit: int = 5) -> Dict:
    """
    Scrape reference images for a specific Bakugan from various sources
    
    Args:
        bakugan_name: Name of the Bakugan (e.g., "Dragonoid")
        attribute: Optional attribute like "Pyrus", "Haos", etc.
        limit: Maximum number of images to fetch
    
    Returns:
        Dictionary with image URLs and metadata
    """
    result = {
        "success": False,
        "bakugan_name": bakugan_name,
        "images": [],
        "error": None
    }
    
    search_query = f"Bakugan {bakugan_name}"
    if attribute:
        search_query += f" {attribute}"
    
    search_url = f"https://www.ebay.com/sch/i.html?_nkw={search_query.replace(' ', '+')}&_sacat=0"
    
    driver = None
    try:
        driver = get_chrome_driver()
        driver.set_page_load_timeout(30)
        driver.get(search_url)
        
        time.sleep(2)
        
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".srp-results"))
        )
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        items = soup.select('.s-item')
        
        for item in items:
            if len(result["images"]) >= limit:
                break
                
            try:
                title_elem = item.select_one('.s-item__title')
                img_elem = item.select_one('.s-item__image-wrapper img')
                
                if title_elem and img_elem:
                    title = title_elem.get_text(strip=True)
                    
                    if bakugan_name.lower() not in title.lower():
                        continue
                    
                    img_url = img_elem.get('src') or img_elem.get('data-src')
                    
                    if img_url and 'gif' not in img_url.lower():
                        if 's-l' in img_url:
                            img_url = re.sub(r's-l\d+', 's-l500', img_url)
                        
                        result["images"].append({
                            "url": img_url,
                            "title": title,
                            "source": "eBay"
                        })
            except Exception:
                continue
        
        if result["images"]:
            result["success"] = True
        else:
            result["error"] = "No matching images found"
            
    except TimeoutException:
        result["error"] = "Page load timed out"
    except Exception as e:
        result["error"] = str(e)
    finally:
        if driver:
            driver.quit()
    
    return result


def scrape_bakugan_wiki_images(bakugan_name: str, limit: int = 3) -> Dict:
    """
    Scrape reference images from the Bakugan Wiki
    
    Args:
        bakugan_name: Name of the Bakugan
        limit: Maximum number of images to fetch
    
    Returns:
        Dictionary with image URLs from the wiki
    """
    result = {
        "success": False,
        "bakugan_name": bakugan_name,
        "images": [],
        "error": None
    }
    
    wiki_url = f"https://bakugan.wiki/wiki/{bakugan_name.replace(' ', '_')}"
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(wiki_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            
            info_box = soup.select_one('.infobox, .portable-infobox')
            if info_box:
                images = info_box.select('img')
                for img in images[:limit]:
                    src = img.get('src')
                    if src:
                        if src.startswith('//'):
                            src = 'https:' + src
                        elif src.startswith('/'):
                            src = 'https://bakugan.wiki' + src
                        
                        result["images"].append({
                            "url": src,
                            "title": f"{bakugan_name} - Official Art",
                            "source": "Bakugan Wiki"
                        })
            
            if not result["images"]:
                content_images = soup.select('.mw-parser-output img')
                for img in content_images[:limit]:
                    src = img.get('src')
                    if src and 'logo' not in src.lower() and 'icon' not in src.lower():
                        if src.startswith('//'):
                            src = 'https:' + src
                        elif src.startswith('/'):
                            src = 'https://bakugan.wiki' + src
                        
                        result["images"].append({
                            "url": src,
                            "title": f"{bakugan_name}",
                            "source": "Bakugan Wiki"
                        })
            
            if result["images"]:
                result["success"] = True
            else:
                result["error"] = "No images found on wiki page"
        else:
            result["error"] = f"Wiki page not found (status {response.status_code})"
            
    except Exception as e:
        result["error"] = str(e)
    
    return result


def get_market_data(bakugan_name: str, attribute: str = None) -> Dict:
    """
    Get comprehensive market data including prices and reference images
    
    Args:
        bakugan_name: Name of the Bakugan
        attribute: Optional attribute (Pyrus, Haos, etc.)
    
    Returns:
        Combined dictionary with pricing and image data
    """
    pricing = scrape_ebay_prices(bakugan_name, attribute)
    
    ebay_images = scrape_reference_images(bakugan_name, attribute, limit=4)
    
    wiki_images = scrape_bakugan_wiki_images(bakugan_name, limit=2)
    
    all_images = []
    if wiki_images["success"]:
        all_images.extend(wiki_images["images"])
    if ebay_images["success"]:
        all_images.extend(ebay_images["images"])
    
    return {
        "bakugan_name": bakugan_name,
        "attribute": attribute,
        "pricing": {
            "success": pricing["success"],
            "average_price": pricing["average_price"],
            "min_price": pricing["min_price"],
            "max_price": pricing["max_price"],
            "num_listings": pricing["num_listings"],
            "listings": pricing["listings"][:5],
            "error": pricing["error"]
        },
        "images": {
            "success": len(all_images) > 0,
            "items": all_images[:6],
            "error": None if all_images else "No images found"
        }
    }


if __name__ == "__main__":
    print("Testing eBay scraping for 'Dragonoid'...")
    result = get_market_data("Dragonoid", "Pyrus")
    print(json.dumps(result, indent=2))
