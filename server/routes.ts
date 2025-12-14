import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

      const openai = getOpenAI();
      if (!openai) {
        return res.status(500).json({ error: "OpenAI API key not configured. Please add your OPENAI_API_KEY." });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are an expert Bakugan identifier and appraiser specializing in original run Bakugan toys from 2007-2012. 
            
Analyze images of Bakugan toys and identify:
1. The exact name/model of the Bakugan
2. Which series it belongs to (Battle Brawlers, New Vestroia, Gundalian Invaders, or Mechtanium Surge)
3. Its attribute (Pyrus, Aquos, Haos, Darkus, Subterra, or Ventus)
4. Its G-Power value
5. Release year
6. Rarity level
7. Any special features (translucent, special edition, etc.)
8. Estimated market value based on recent sales data

Respond with JSON in this exact format:
{
  "name": "Dragonoid",
  "series": "Battle Brawlers",
  "attribute": "Pyrus",
  "gPower": 350,
  "releaseYear": "2007",
  "rarity": "Rare",
  "specialFeatures": ["Original Release"],
  "estimatedValue": { "low": 15, "high": 35 },
  "confidence": 0.85
}

Base valuations on:
- Original Battle Brawlers (2007-2008): Generally $10-50, rare variants $50-200+
- New Vestroia (2009): Generally $8-40, special editions $40-150+
- Gundalian Invaders (2010): Generally $5-30, rare pieces $30-100+
- Mechtanium Surge (2011-2012): Generally $5-25, special editions $25-80+

Condition is assumed to be "Good" unless visible damage is apparent.
If you cannot identify the Bakugan with confidence, still provide your best estimate with a lower confidence score.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please identify this Bakugan and provide its estimated market value based on recent public sales.",
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
        response_format: { type: "json_object" },
        max_completion_tokens: 1024,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        return res.status(500).json({ error: "No response from AI" });
      }

      const analysis = JSON.parse(content);

      if (!analysis.name || !analysis.attribute || !analysis.estimatedValue) {
        return res.status(500).json({ error: "Invalid analysis response" });
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
