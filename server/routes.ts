import type { Express } from "express";
import { createServer, type Server } from "node:http";
import Groq from "groq-sdk";

function getGroq() {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

interface EbayTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface EbaySoldItem {
  title: string;
  lastSoldPrice: {
    value: string;
    currency: string;
  };
  lastSoldDate: string;
}

interface EbayPriceData {
  available: boolean;
  soldItems: Array<{
    title: string;
    price: number;
    soldDate: string;
  }>;
  priceRange: {
    low: number;
    high: number;
    average: number;
  } | null;
  source: string;
}

let ebayTokenCache: { token: string; expiresAt: number } | null = null;

async function getEbayAccessToken(): Promise<string | null> {
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  if (ebayTokenCache && Date.now() < ebayTokenCache.expiresAt) {
    return ebayTokenCache.token;
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope/buy.marketplace.insights',
      }),
    });

    if (!response.ok) {
      console.error('eBay token error:', await response.text());
      return null;
    }

    const data = await response.json() as EbayTokenResponse;
    
    ebayTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000) - 60000,
    };

    return data.access_token;
  } catch (error) {
    console.error('Failed to get eBay token:', error);
    return null;
  }
}

async function searchEbaySoldItems(bakuganName: string, attribute?: string): Promise<EbayPriceData> {
  const token = await getEbayAccessToken();
  
  if (!token) {
    return {
      available: false,
      soldItems: [],
      priceRange: null,
      source: 'eBay API not configured',
    };
  }

  try {
    const searchQuery = `Bakugan ${bakuganName} ${attribute || ''}`.trim();
    
    const response = await fetch(
      `https://api.ebay.com/buy/marketplace_insights/v1_beta/item_sales/search?q=${encodeURIComponent(searchQuery)}&limit=20`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eBay search error:', errorText);
      return {
        available: false,
        soldItems: [],
        priceRange: null,
        source: 'eBay API error',
      };
    }

    const data = await response.json();
    const itemSales = data.itemSales || [];

    if (itemSales.length === 0) {
      return {
        available: true,
        soldItems: [],
        priceRange: null,
        source: 'No recent eBay sales found',
      };
    }

    const soldItems = itemSales.map((item: EbaySoldItem) => ({
      title: item.title,
      price: parseFloat(item.lastSoldPrice?.value || '0'),
      soldDate: item.lastSoldDate,
    })).filter((item: { price: number }) => item.price > 0);

    if (soldItems.length === 0) {
      return {
        available: true,
        soldItems: [],
        priceRange: null,
        source: 'No valid price data found',
      };
    }

    const prices = soldItems.map((item: { price: number }) => item.price);
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const average = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;

    return {
      available: true,
      soldItems: soldItems.slice(0, 5),
      priceRange: {
        low: Math.round(low * 100) / 100,
        high: Math.round(high * 100) / 100,
        average: Math.round(average * 100) / 100,
      },
      source: `Based on ${soldItems.length} recent eBay sales`,
    };
  } catch (error) {
    console.error('eBay search failed:', error);
    return {
      available: false,
      soldItems: [],
      priceRange: null,
      source: 'eBay API connection failed',
    };
  }
}

const BAKUGAN_DATABASE = {
  series: ["Battle Brawlers", "New Vestroia", "Gundalian Invaders", "Mechtanium Surge"],
  attributes: ["Pyrus", "Aquos", "Haos", "Darkus", "Subterra", "Ventus"],
  rarities: ["Common", "Rare", "Super Rare", "Ultra Rare", "Special Edition"],
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/analyze", async (req, res) => {
    try {
      const { image } = req.body;

      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }

      const groq = getGroq();
      if (!groq) {
        return res.status(500).json({ error: "Groq API key not configured. Please add your GROQ_API_KEY." });
      }

      const response = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an expert Bakugan identifier specializing in original Bakugan Battle Brawlers toys from 2007-2012 by Spin Master/Sega Toys.

IDENTIFICATION GUIDE:

VISUAL IDENTIFICATION - Look for these features:
- Ball form: Spherical shape that transforms when placed on magnetic card
- Attribute color: The primary color indicates the attribute
- G-Power number: Usually printed on the toy (ranges from 150G to 1000G+)
- Series markings: May have series logos or codes
- Size: Original Bakugan are about 28mm diameter in ball form

ATTRIBUTES BY COLOR:
- Pyrus (Fire) = Red, orange, crimson
- Aquos (Water) = Blue, cyan, navy  
- Haos (Light) = White, yellow, gold
- Darkus (Dark) = Black, purple, dark gray
- Subterra (Earth) = Brown, tan, beige, orange-brown
- Ventus (Wind) = Green, teal, lime

COMMON BAKUGAN BY SERIES:

Battle Brawlers (2007-2008):
Dragonoid, Delta Dragonoid, Ultimate Dragonoid, Hydranoid, Dual Hydranoid, Alpha Hydranoid, Tigrerra, Blade Tigrerra, Gorem, Hammer Gorem, Preyas, Preyas Angelo/Diablo, Skyress, Storm Skyress, Reaper, Fear Ripper, Siege, Robotallion, Saurus, Mantris, Laserman, Centipoid, Rattleoid, Falconeer, Stinglash, Griffon, Warius, Ravenoid, Limulus, Juggernoid, Terrorclaw, Serpenoid, Tuskor, Monarus, Hynoid, El Condor, Gargonoid

New Vestroia (2009):
Helios, Helios MK2, Cross Dragonoid, Maxus Dragonoid, Elfin, Minx Elfin, Nemus, Saint Nemus, Percival, Knight Percival, Midnight Percival, Ingram, Master Ingram, Wilda, Magma Wilda, Vulcan, Mega Brontes, Altair, Hexados, Clawsaurus, Verias, Piercian

Gundalian Invaders (2010):
Dharak, Phantom Dharak, Linehalt, Lumino Dragonoid, Coredem, Rubanoid, Hawktor, Aranaut, Contestir, Strikeflier, Avior, Sabator, Lumagrowl, Lythirus, Krakix, Phosphos

Mechtanium Surge (2011-2012):
Titanium Dragonoid, Fusion Dragonoid, Mercury Dragonoid, Taylean, Trister, Boulderon, Wolfurio, Zenthon, Silent Strike, Accelerak

SPECIAL VARIANTS TO NOTE:
- Translucent/Clear versions (rarer)
- Pearl/Metallic finish (special editions)
- B1/B2/B3 designations (different releases)
- Special Attack versions (with spring mechanisms)
- BakuNano accessories attached

Analyze this Bakugan image and identify it. Match the visual features to the reference list above.

Respond with JSON:
{
  "name": "[Exact Bakugan name from reference list]",
  "series": "[Battle Brawlers/New Vestroia/Gundalian Invaders/Mechtanium Surge]",
  "attribute": "[Pyrus/Aquos/Haos/Darkus/Subterra/Ventus]",
  "gPower": [number if visible, estimate 300-500 if not],
  "releaseYear": "[2007-2012]",
  "rarity": "[Common/Rare/Super Rare/Ultra Rare/Special Edition]",
  "specialFeatures": ["list any special features"],
  "estimatedValue": { "low": [number], "high": [number] },
  "confidence": [0.0-1.0 based on how certain you are]
}

Valuation guide:
- Common Bakugan: $5-15
- Rare Bakugan: $15-40
- Super Rare/Special: $40-100
- Ultra Rare/Translucent/Limited: $100-300+

IMPORTANT: Respond ONLY with valid JSON.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        return res.status(500).json({ error: "No response from AI" });
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(500).json({ error: "Invalid response format from AI" });
      }

      const analysis = JSON.parse(jsonMatch[0]);

      if (!analysis.name || !analysis.attribute || !analysis.estimatedValue) {
        return res.status(500).json({ error: "Invalid analysis response" });
      }

      const ebayData = await searchEbaySoldItems(analysis.name, analysis.attribute);

      if (ebayData.available && ebayData.priceRange) {
        analysis.estimatedValue = {
          low: ebayData.priceRange.low,
          high: ebayData.priceRange.high,
        };
        analysis.ebayData = {
          available: true,
          average: ebayData.priceRange.average,
          recentSales: ebayData.soldItems,
          source: ebayData.source,
        };
      } else {
        analysis.ebayData = {
          available: false,
          source: ebayData.source,
        };
      }

      res.json(analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to analyze image" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
