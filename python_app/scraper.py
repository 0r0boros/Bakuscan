"""
Web scraping module for BakuScan
Uses requests + BeautifulSoup to scrape pricing and image data
Includes fallback mechanisms when web scraping fails
"""

import os
import re
import json
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
import requests


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

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
    Scrape eBay sold listings for pricing data on a specific Bakugan
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
    
    try:
        session = requests.Session()
        session.headers.update(HEADERS)
        
        response = session.get(search_url, timeout=10, allow_redirects=True)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        listings = soup.select('.s-item, .srp-results .s-item__wrapper')
        prices = []
        
        for item in listings[:limit * 2]:
            try:
                title_elem = item.select_one('.s-item__title, .s-item__title--has-tags span')
                price_elem = item.select_one('.s-item__price')
                link_elem = item.select_one('.s-item__link')
                
                if not title_elem or not price_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                
                if title.lower() == "shop on ebay" or "shop on ebay" in title.lower():
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
            
    except requests.Timeout:
        fallback = estimate_price_by_rarity(rarity)
        result.update(fallback)
        result["bakugan_name"] = bakugan_name
    except requests.RequestException:
        fallback = estimate_price_by_rarity(rarity)
        result.update(fallback)
        result["bakugan_name"] = bakugan_name
    except Exception as e:
        fallback = estimate_price_by_rarity(rarity)
        result.update(fallback)
        result["bakugan_name"] = bakugan_name
    
    return result


def scrape_reference_images(bakugan_name: str, attribute: str = None, limit: int = 5) -> Dict:
    """
    Scrape reference images for a specific Bakugan
    Uses Bing image search as primary source
    """
    result = {
        "success": False,
        "bakugan_name": bakugan_name,
        "images": [],
        "error": None
    }
    
    search_query = f"Bakugan {bakugan_name} toy"
    if attribute:
        search_query += f" {attribute}"
    
    bing_url = f"https://www.bing.com/images/search?q={search_query.replace(' ', '+')}&qft=+filterui:photo-photo&FORM=IRFLTR"
    
    try:
        session = requests.Session()
        session.headers.update(HEADERS)
        
        response = session.get(bing_url, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        img_links = soup.select('a.iusc, .mimg, img.mimg')
        
        for item in img_links:
            if len(result["images"]) >= limit:
                break
            
            try:
                m_attr = item.get('m')
                if m_attr:
                    import json
                    data = json.loads(m_attr)
                    img_url = data.get('murl')
                    title = data.get('t', bakugan_name)
                    
                    if img_url and not any(x in img_url.lower() for x in ['gif', 'svg', 'logo']):
                        result["images"].append({
                            "url": img_url,
                            "title": title[:60] if len(title) > 60 else title,
                            "source": "Web"
                        })
                else:
                    img_url = item.get('src') or item.get('data-src')
                    if img_url and img_url.startswith('http') and not any(x in img_url.lower() for x in ['gif', 'svg', 'logo']):
                        result["images"].append({
                            "url": img_url,
                            "title": bakugan_name,
                            "source": "Web"
                        })
            except Exception:
                continue
        
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
            result["error"] = str(e)
    
    return result


def get_placeholder_images(bakugan_name: str, attribute: str = None) -> List[Dict]:
    """Generate placeholder image data when scraping fails"""
    placeholder_urls = [
        f"https://via.placeholder.com/300x300/{ATTRIBUTE_COLORS.get(attribute, '#888888')[1:]}/fff?text={bakugan_name[:3]}",
    ]
    
    return [{
        "url": url,
        "title": f"{bakugan_name} ({attribute or 'Unknown'})",
        "source": "Placeholder"
    } for url in placeholder_urls]


def get_market_data(bakugan_name: str, attribute: str = None, rarity: str = None) -> Dict:
    """
    Get comprehensive market data including prices and reference images
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
    print("Testing scraping for 'Dragonoid'...")
    result = get_market_data("Dragonoid", "Pyrus", "Rare")
    print(json.dumps(result, indent=2))
