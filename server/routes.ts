import type { Express } from "express";
import { createServer, type Server } from "node:http";
import Groq from "groq-sdk";
import { 
  AuthRequest, 
  authMiddleware, 
  verifyGoogleToken, 
  verifyAppleIdToken, 
  loginOrRegister 
} from "./auth";
import { storage } from "./storage";
import type { InsertScan } from "@shared/schema";

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

const BAKUGAN_CATALOG = [
  // Battle Brawlers (B1) - 2007-2008
  { name: "Dragonoid", series: "Battle Brawlers", type: "B1", description: "Dragon-like with wings, iconic protagonist Bakugan" },
  { name: "Delta Dragonoid", series: "Battle Brawlers", type: "B2", description: "Evolved Dragonoid with larger wings and horn" },
  { name: "Ultimate Dragonoid", series: "Battle Brawlers", type: "B2", description: "Final evolution with massive wings" },
  { name: "Infinity Dragonoid", series: "Battle Brawlers", type: "B2", description: "Rare special edition Dragonoid" },
  { name: "Hydranoid", series: "Battle Brawlers", type: "B1", description: "Three-headed dragon, Masquerade's partner" },
  { name: "Dual Hydranoid", series: "Battle Brawlers", type: "B2", description: "Two-headed evolution" },
  { name: "Alpha Hydranoid", series: "Battle Brawlers", type: "B2", description: "Powerful three-headed final form" },
  { name: "Tigrerra", series: "Battle Brawlers", type: "B1", description: "Tiger-like with blade appendages" },
  { name: "Blade Tigrerra", series: "Battle Brawlers", type: "B2", description: "Evolved with prominent blades" },
  { name: "Gorem", series: "Battle Brawlers", type: "B1", description: "Golem-like rocky humanoid" },
  { name: "Hammer Gorem", series: "Battle Brawlers", type: "B2", description: "Evolved with hammer-like arms" },
  { name: "Preyas", series: "Battle Brawlers", type: "B1", description: "Chameleon-like, can change attributes" },
  { name: "Preyas Diablo", series: "Battle Brawlers", type: "B2", description: "Devil-like Preyas variant" },
  { name: "Preyas Angelo", series: "Battle Brawlers", type: "B2", description: "Angel-like Preyas variant" },
  { name: "Skyress", series: "Battle Brawlers", type: "B1", description: "Phoenix-like bird" },
  { name: "Storm Skyress", series: "Battle Brawlers", type: "B2", description: "Evolved storm phoenix" },
  { name: "Reaper", series: "Battle Brawlers", type: "B1", description: "Grim reaper with scythe, skull face" },
  { name: "Fear Ripper", series: "Battle Brawlers", type: "B1", description: "Humanoid with large claws" },
  { name: "Siege", series: "Battle Brawlers", type: "B1", description: "Knight-like with shield and sword" },
  { name: "Robotallion", series: "Battle Brawlers", type: "B1", description: "Robot soldier with cannon" },
  { name: "Saurus", series: "Battle Brawlers", type: "B1", description: "T-Rex dinosaur" },
  { name: "Mantris", series: "Battle Brawlers", type: "B1", description: "Praying mantis insect" },
  { name: "Laserman", series: "Battle Brawlers", type: "B1", description: "Humanoid with laser cannon arm" },
  { name: "Centipoid", series: "Battle Brawlers", type: "B1", description: "Centipede-like many legs" },
  { name: "Rattleoid", series: "Battle Brawlers", type: "B1", description: "Rattlesnake-like" },
  { name: "Falconeer", series: "Battle Brawlers", type: "B1", description: "Falcon bird warrior" },
  { name: "Stinglash", series: "Battle Brawlers", type: "B1", description: "Scorpion with stinger tail" },
  { name: "Griffon", series: "Battle Brawlers", type: "B1", description: "Griffin mythical creature" },
  { name: "Warius", series: "Battle Brawlers", type: "B1", description: "Warrior fish humanoid" },
  { name: "Ravenoid", series: "Battle Brawlers", type: "B1", description: "Raven bird warrior" },
  { name: "Limulus", series: "Battle Brawlers", type: "B1", description: "Horseshoe crab" },
  { name: "Juggernoid", series: "Battle Brawlers", type: "B1", description: "Turtle with heavy shell" },
  { name: "Terrorclaw", series: "Battle Brawlers", type: "B1", description: "Crab with large claws" },
  { name: "Serpenoid", series: "Battle Brawlers", type: "B1", description: "Snake serpent" },
  { name: "Tuskor", series: "Battle Brawlers", type: "B1", description: "Mammoth elephant with tusks" },
  { name: "Monarus", series: "Battle Brawlers", type: "B1", description: "Butterfly fairy" },
  { name: "Hynoid", series: "Battle Brawlers", type: "B1", description: "Hyena dog beast" },
  { name: "El Condor", series: "Battle Brawlers", type: "B1", description: "Condor bird with mask" },
  { name: "Garganoid", series: "Battle Brawlers", type: "B1", description: "Gargoyle demon" },
  { name: "Sirenoid", series: "Battle Brawlers", type: "B1", description: "Mermaid siren" },
  { name: "Tentaclear", series: "Battle Brawlers", type: "B1", description: "Jellyfish with tentacles" },
  { name: "Lars Lion", series: "Battle Brawlers", type: "B1", description: "Lion warrior" },
  { name: "Wavern", series: "Battle Brawlers", type: "B1", description: "Angelic dragon, holds Infinity Core" },
  { name: "Naga", series: "Battle Brawlers", type: "B1", description: "White dragon antagonist" },
  { name: "Apollonir", series: "Battle Brawlers", type: "B2", description: "Pyrus soldier of Vestroia" },
  { name: "Clayf", series: "Battle Brawlers", type: "B2", description: "Subterra soldier" },
  { name: "Exedra", series: "Battle Brawlers", type: "B2", description: "Darkus soldier multi-headed" },
  { name: "Frosch", series: "Battle Brawlers", type: "B2", description: "Aquos soldier frog-like" },
  { name: "Oberus", series: "Battle Brawlers", type: "B2", description: "Ventus soldier fairy" },
  { name: "Bee Striker", series: "Battle Brawlers", type: "B1", description: "Bee insect" },
  { name: "Harpus", series: "Battle Brawlers", type: "B1", description: "Harpy bird woman" },
  { name: "Manion", series: "Battle Brawlers", type: "B1", description: "Lion with mane" },
  { name: "Wormquake", series: "Battle Brawlers", type: "B1", description: "Giant worm" },
  { name: "Fourtress", series: "Battle Brawlers", type: "B2", description: "Four-headed fortress" },
  { name: "Cycloid", series: "Battle Brawlers", type: "B1", description: "One-eyed cyclops" },

  // New Vestroia (NV) - 2009
  { name: "Neo Dragonoid", series: "New Vestroia", type: "NV", description: "Reborn Dragonoid from New Vestroia" },
  { name: "Cross Dragonoid", series: "New Vestroia", type: "NV", description: "Cross-shaped wings Dragonoid" },
  { name: "Turbine Dragonoid", series: "New Vestroia", type: "NV", description: "Turbine-winged dragon" },
  { name: "Helix Dragonoid", series: "New Vestroia", type: "NV", description: "Helix horn dragon" },
  { name: "Viper Helios", series: "New Vestroia", type: "NV", description: "Snake-like dragon, Spectra's partner" },
  { name: "Cyborg Helios", series: "New Vestroia", type: "NV", description: "Mechanical enhanced Helios" },
  { name: "Helios MK2", series: "New Vestroia", type: "NV", description: "Final evolution mechanical dragon" },
  { name: "Elfin", series: "New Vestroia", type: "NV", description: "Elf fairy creature" },
  { name: "Minx Elfin", series: "New Vestroia", type: "NV", description: "Evolved mischievous elfin" },
  { name: "Nemus", series: "New Vestroia", type: "NV", description: "Haos warrior knight" },
  { name: "Saint Nemus", series: "New Vestroia", type: "NV", description: "Holy knight evolution" },
  { name: "Percival", series: "New Vestroia", type: "NV", description: "Dark knight warrior" },
  { name: "Knight Percival", series: "New Vestroia", type: "NV", description: "Armored knight evolution" },
  { name: "Midnight Percival", series: "New Vestroia", type: "NV", description: "Dark midnight form" },
  { name: "Ingram", series: "New Vestroia", type: "NV", description: "Ninja-like Ventus warrior" },
  { name: "Master Ingram", series: "New Vestroia", type: "NV", description: "Master ninja evolution" },
  { name: "Wilda", series: "New Vestroia", type: "NV", description: "Rock golem giant" },
  { name: "Magma Wilda", series: "New Vestroia", type: "NV", description: "Magma-powered evolution" },
  { name: "Thunder Wilda", series: "New Vestroia", type: "NV", description: "Thunder-powered variant" },
  { name: "Vulcan", series: "New Vestroia", type: "NV", description: "Volcanic fire giant" },
  { name: "Premo Vulcan", series: "New Vestroia", type: "NV", description: "Premier evolved vulcan" },
  { name: "Brontes", series: "New Vestroia", type: "NV", description: "Multi-faced Haos creature" },
  { name: "Alto Brontes", series: "New Vestroia", type: "NV", description: "High form Brontes" },
  { name: "Mega Brontes", series: "New Vestroia", type: "NV", description: "Mega evolution" },
  { name: "Altair", series: "New Vestroia", type: "NV", description: "Mechanical bird" },
  { name: "Wired", series: "New Vestroia", type: "NV", description: "Wire-based creature" },
  { name: "Elico", series: "New Vestroia", type: "NV", description: "Electric eel dragon" },
  { name: "Blast Elico", series: "New Vestroia", type: "NV", description: "Explosive evolution" },
  { name: "Hades", series: "New Vestroia", type: "NV", description: "Underworld three-headed beast" },
  { name: "Myriad Hades", series: "New Vestroia", type: "NV", description: "Multi-headed final form" },
  { name: "Verias", series: "New Vestroia", type: "NV", description: "Warrior beast" },
  { name: "Abis Omega", series: "New Vestroia", type: "NV", description: "Aquatic shark creature" },
  { name: "Moskeeto", series: "New Vestroia", type: "NV", description: "Mosquito insect" },
  { name: "Klawgor", series: "New Vestroia", type: "NV", description: "Claw-handed warrior" },
  { name: "Spindle", series: "New Vestroia", type: "NV", description: "Spinning blade creature" },
  { name: "Foxbat", series: "New Vestroia", type: "NV", description: "Fox-bat hybrid" },
  { name: "Atmos", series: "New Vestroia", type: "NV", description: "Atmospheric creature" },
  { name: "Leefram", series: "New Vestroia", type: "NV", description: "Leaf-framed plant" },
  { name: "Fencer", series: "New Vestroia", type: "NV", description: "Sword-wielding warrior" },
  { name: "Scraper", series: "New Vestroia", type: "NV", description: "Scraping claws creature" },
  { name: "Stug", series: "New Vestroia", type: "NV", description: "Tank-like sturdy" },
  { name: "Freezer", series: "New Vestroia", type: "NV", description: "Ice creature" },

  // Gundalian Invaders (GI) - 2010
  { name: "Lumino Dragonoid", series: "Gundalian Invaders", type: "GI", description: "Light-powered Dragonoid" },
  { name: "Blitz Dragonoid", series: "Gundalian Invaders", type: "GI", description: "Speed-based Dragonoid" },
  { name: "Dharak", series: "Gundalian Invaders", type: "GI", description: "Dark dragon antagonist, Emperor Barodius partner" },
  { name: "Phantom Dharak", series: "Gundalian Invaders", type: "GI", description: "Phantom evolved form" },
  { name: "Linehalt", series: "Gundalian Invaders", type: "GI", description: "Dark knight, Ren's partner" },
  { name: "Coredem", series: "Gundalian Invaders", type: "GI", description: "Core-powered golem" },
  { name: "Akwimos", series: "Gundalian Invaders", type: "GI", description: "Aquatic comedian creature" },
  { name: "Hawktor", series: "Gundalian Invaders", type: "GI", description: "Hawk warrior" },
  { name: "Aranaut", series: "Gundalian Invaders", type: "GI", description: "Spider knight warrior" },
  { name: "Contestir", series: "Gundalian Invaders", type: "GI", description: "Contest warrior" },
  { name: "Strikeflier", series: "Gundalian Invaders", type: "GI", description: "Flying strike creature" },
  { name: "Avior", series: "Gundalian Invaders", type: "GI", description: "Bird warrior" },
  { name: "Sabator", series: "Gundalian Invaders", type: "GI", description: "Sabertooth warrior" },
  { name: "Lumagrowl", series: "Gundalian Invaders", type: "GI", description: "Luminous wolf" },
  { name: "Lythirus", series: "Gundalian Invaders", type: "GI", description: "Slithering creature" },
  { name: "Krakix", series: "Gundalian Invaders", type: "GI", description: "Kraken-like beast" },
  { name: "Phosphos", series: "Gundalian Invaders", type: "GI", description: "Phosphorescent creature" },
  { name: "Rubanoid", series: "Gundalian Invaders", type: "GI", description: "Ruby-based dragon" },
  { name: "Plitheon", series: "Gundalian Invaders", type: "GI", description: "Chameleon trickster" },
  { name: "Snapzoid", series: "Gundalian Invaders", type: "GI", description: "Snapping creature" },
  { name: "Fangoid", series: "Gundalian Invaders", type: "GI", description: "Fanged beast" },
  { name: "Spidaro", series: "Gundalian Invaders", type: "GI", description: "Spider creature" },
  { name: "Buz Hornix", series: "Gundalian Invaders", type: "GI", description: "Hornet buzzing insect" },
  { name: "Clawsaurus", series: "Gundalian Invaders", type: "GI", description: "Claw dinosaur" },
  { name: "Dartaak", series: "Gundalian Invaders", type: "GI", description: "Dart-throwing creature" },
  { name: "Glotronoid", series: "Gundalian Invaders", type: "GI", description: "Glowing creature" },
  { name: "Gyrazor", series: "Gundalian Invaders", type: "GI", description: "Gyrating razor creature" },
  { name: "Luxtor", series: "Gundalian Invaders", type: "GI", description: "Luxurious beast" },
  { name: "Merlix", series: "Gundalian Invaders", type: "GI", description: "Merlin wizard" },
  { name: "Ziperator", series: "Gundalian Invaders", type: "GI", description: "Zipper-like creature" },

  // Mechtanium Surge (MS) - 2011-2012
  { name: "Titanium Dragonoid", series: "Mechtanium Surge", type: "MS", description: "Titanium armored dragon" },
  { name: "Fusion Dragonoid", series: "Mechtanium Surge", type: "MS", description: "Fusion-powered dragon" },
  { name: "Mercury Dragonoid", series: "Mechtanium Surge", type: "MS", description: "Mercury metallic dragon" },
  { name: "Taylean", series: "Mechtanium Surge", type: "MS", description: "Plant ninja warrior" },
  { name: "Trister", series: "Mechtanium Surge", type: "MS", description: "Trickster creature" },
  { name: "Boulderon", series: "Mechtanium Surge", type: "MS", description: "Boulder giant" },
  { name: "Wolfurio", series: "Mechtanium Surge", type: "MS", description: "Wolf warrior fury" },
  { name: "Zenthon", series: "Mechtanium Surge", type: "MS", description: "Mechtogan titan" },
  { name: "Silent Strike", series: "Mechtanium Surge", type: "MS", description: "Silent ninja" },
  { name: "Accelerak", series: "Mechtanium Surge", type: "MS", description: "Speed accelerator" },
  { name: "Razenoid", series: "Mechtanium Surge", type: "MS", description: "Razor-edged beast" },
  { name: "Mutant Helios", series: "Mechtanium Surge", type: "MS", description: "Mutated Helios" },
  { name: "Infinity Helios", series: "Mechtanium Surge", type: "MS", description: "Infinite power Helios" },
  { name: "Spyron", series: "Mechtanium Surge", type: "MS", description: "Spy creature" },
  { name: "Vertexx", series: "Mechtanium Surge", type: "MS", description: "Vertex geometric" },
  { name: "Krakenoid", series: "Mechtanium Surge", type: "MS", description: "Kraken sea monster" },
  { name: "Horridian", series: "Mechtanium Surge", type: "MS", description: "Horrid beast" },
  { name: "Bolcanon", series: "Mechtanium Surge", type: "MS", description: "Volcanic cannon" },
  { name: "Slynix", series: "Mechtanium Surge", type: "MS", description: "Sly lynx" },
  { name: "Mutant Taylean", series: "Mechtanium Surge", type: "MS", description: "Mutated plant ninja" },
];

const BAKUGAN_DATABASE = {
  series: ["Battle Brawlers", "New Vestroia", "Gundalian Invaders", "Mechtanium Surge"],
  attributes: ["Pyrus", "Aquos", "Haos", "Darkus", "Subterra", "Ventus"],
  rarities: ["Common", "Rare", "Super Rare", "Ultra Rare", "Special Edition"],
};

interface CorrectionHint {
  originalName: string;
  correctedName: string;
  count: number;
}

function buildCorrectionSection(corrections: CorrectionHint[] | undefined): string {
  if (!corrections || corrections.length === 0) {
    return '';
  }
  
  const correctionLines = corrections
    .filter(c => c.count >= 1)
    .slice(0, 10)
    .map(c => `OVERRIDE: "${c.originalName}" → "${c.correctedName}" (${c.count} corrections)`)
    .join('\n');
  
  if (!correctionLines) return '';
  
  return `

=== CRITICAL: USER CORRECTIONS (HIGHEST PRIORITY) ===
The user has manually corrected these identifications. YOU MUST respect these corrections:
${correctionLines}

RULE: If you would identify this image as any name on the LEFT side above, you MUST instead return the name on the RIGHT side. These corrections override your visual analysis.
`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ============ AUTH ROUTES ============
  
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { accessToken } = req.body;
      
      if (!accessToken) {
        return res.status(400).json({ error: "Access token required" });
      }

      const googleUser = await verifyGoogleToken(accessToken);
      if (!googleUser) {
        return res.status(401).json({ error: "Invalid Google token" });
      }

      const { user, token, isNewUser } = await loginOrRegister(
        "google",
        googleUser.sub,
        googleUser.email,
        googleUser.name,
        googleUser.picture
      );

      res.json({ user, token, isNewUser });
    } catch (error) {
      console.error("Google auth error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  app.post("/api/auth/apple", async (req, res) => {
    try {
      const { identityToken, fullName, email: providedEmail } = req.body;
      
      if (!identityToken) {
        return res.status(400).json({ error: "Identity token required" });
      }

      const applePayload = await verifyAppleIdToken(identityToken);
      if (!applePayload) {
        return res.status(401).json({ error: "Invalid or expired Apple token" });
      }

      const email = providedEmail || applePayload.email;
      if (!email) {
        return res.status(400).json({ error: "Email not provided" });
      }

      const displayName = fullName 
        ? [fullName.givenName, fullName.familyName].filter(Boolean).join(" ")
        : undefined;

      const { user, token, isNewUser } = await loginOrRegister(
        "apple",
        applePayload.sub,
        email,
        displayName
      );

      res.json({ user, token, isNewUser });
    } catch (error) {
      console.error("Apple auth error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // ============ SCAN ROUTES ============

  app.get("/api/scans", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const scans = await storage.getScans(req.userId!);
      res.json({ scans });
    } catch (error) {
      console.error("Get scans error:", error);
      res.status(500).json({ error: "Failed to get scans" });
    }
  });

  app.post("/api/scans", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const scanData = req.body as Omit<InsertScan, "userId">;
      const scan = await storage.createScan({
        ...scanData,
        userId: req.userId!,
      });
      res.json({ scan });
    } catch (error) {
      console.error("Create scan error:", error);
      res.status(500).json({ error: "Failed to create scan" });
    }
  });

  app.put("/api/scans/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const scan = await storage.updateScan(id, req.userId!, updates);
      
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }
      
      res.json({ scan });
    } catch (error) {
      console.error("Update scan error:", error);
      res.status(500).json({ error: "Failed to update scan" });
    }
  });

  app.delete("/api/scans/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteScan(id, req.userId!);
      
      if (!deleted) {
        return res.status(404).json({ error: "Scan not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete scan error:", error);
      res.status(500).json({ error: "Failed to delete scan" });
    }
  });

  app.post("/api/scans/sync", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { scans: localScans } = req.body as { scans: Omit<InsertScan, "userId">[] };
      
      if (!Array.isArray(localScans)) {
        return res.status(400).json({ error: "Invalid scans data" });
      }

      const scansWithUser = localScans.map(scan => ({
        ...scan,
        userId: req.userId!,
      }));

      const createdScans = await storage.createScans(scansWithUser);
      res.json({ scans: createdScans, synced: createdScans.length });
    } catch (error) {
      console.error("Sync scans error:", error);
      res.status(500).json({ error: "Failed to sync scans" });
    }
  });

  // ============ ANALYZE ROUTE ============

  app.post("/api/analyze", async (req, res) => {
    try {
      const { image, corrections } = req.body as { image?: string; corrections?: CorrectionHint[] };

      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }

      const groq = getGroq();
      if (!groq) {
        return res.status(500).json({ error: "Groq API key not configured. Please add your GROQ_API_KEY." });
      }

      const namesList = BAKUGAN_CATALOG.map(b => b.name).join(', ');
      const correctionSection = buildCorrectionSection(corrections);
      
      console.log(`[Analyze] Processing image with ${BAKUGAN_CATALOG.length} catalog entries, ${corrections?.length || 0} corrections`);
      if (corrections && corrections.length > 0) {
        console.log(`[Analyze] Corrections being applied: ${corrections.map(c => `${c.originalName}→${c.correctedName}(${c.count})`).join(', ')}`);
      }

      const response = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an expert at identifying Bakugan toys from the original 2007-2012 series.

TASK: Look at this image and identify which Bakugan it is. You MUST choose from this complete list of ${BAKUGAN_CATALOG.length} valid Bakugan names:

${namesList}

IMPORTANT RULES:
1. CAREFULLY examine the physical shape of the toy - wings, claws, heads, body type
2. Do NOT default to common names like Dragonoid or Mantris without evidence
3. Consider ALL ${BAKUGAN_CATALOG.length} names before deciding
4. Match the ACTUAL visual features you see to a specific Bakugan
${correctionSection}
IDENTIFICATION GUIDE BY CREATURE TYPE:

DRAGONS/REPTILES: Dragonoid (bat wings), Helios (mechanical dragon), Hydranoid (multiple heads), Dharak (dark dragon), Naga (white dragon), Wavern (angelic dragon)

HUMANOID/WARRIORS: Fear Ripper (claws), Reaper (skull/scythe), Siege (knight), Percival (dark knight), Gorem (rock golem), Robotallion (robot), Aranaut (spider knight)

BIRDS: Skyress (phoenix), Falconeer (falcon), Hawktor (hawk), Storm Skyress (storm phoenix), Ingram (ninja bird), El Condor (condor mask)

INSECTS: Mantris (praying mantis), Centipoid (centipede), Bee Striker (bee), Moskeeto (mosquito), Stinglash (scorpion)

BEASTS: Tigrerra (tiger blades), Saurus (T-Rex), Juggernoid (turtle), Terrorclaw (crab), Griffon (griffin), Tuskor (mammoth), Hynoid (hyena), Lars Lion (lion)

AQUATIC: Preyas (chameleon), Sirenoid (mermaid), Serpenoid (snake), Abis Omega (shark), Tentaclear (jellyfish), Limulus (horseshoe crab), Elfin (elf fairy)

DETERMINE ATTRIBUTE BY COLOR:
- Pyrus = Red/Orange/Crimson
- Aquos = Blue/Cyan/Navy
- Haos = White/Yellow/Gold
- Darkus = Black/Purple/Dark gray
- Subterra = Brown/Tan/Beige
- Ventus = Green/Teal/Lime

OUTPUT: Return ONLY this JSON format:
{
  "name": "[EXACT name from list above - must match exactly]",
  "series": "[Battle Brawlers/New Vestroia/Gundalian Invaders/Mechtanium Surge]",
  "attribute": "[Pyrus/Aquos/Haos/Darkus/Subterra/Ventus]",
  "gPower": [300-900],
  "releaseYear": "[2007-2012]",
  "rarity": "[Common/Rare/Super Rare/Ultra Rare/Special Edition]",
  "specialFeatures": [],
  "estimatedValue": { "low": 5, "high": 20 },
  "confidence": [0.0-1.0],
  "identificationReason": "[Describe the specific visual features you see: wings, heads, claws, body shape, and how they match the identified Bakugan]"
}`,
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
        temperature: 0.3,
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
