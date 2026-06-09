import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  // API Routes
  app.post("/api/analyze-outfit", async (req, res) => {
    try {
      const { image, previousFeedback } = req.body;
      if (!image) return res.status(400).json({ error: "Image required" });

      // Remove data:image/...;base64, prefix
      const base64Data = image.split(',')[1] || image;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data,
                },
              },
              {
                text: `Analyze this person's outfit and skin tone for fashion coordination.
                Identify the skin tone (warm, cool, neutral) and dominant outfit colors.
                Provide a professional fashion verdict, a coordination score (0-100), and specific recommendations to improve the look or alternative pairings.
                ${previousFeedback ? `Consider this user's preference history: ${previousFeedback}` : ""}
                `,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              skinTone: { type: Type.STRING, description: "Description of skin tone and undertone" },
              outfitColors: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Dominant hex codes or color names in the outfit"
              },
              verdict: { type: Type.STRING, description: "A catchy fashion headline verdict" },
              recommendations: { type: Type.STRING, description: "Detailed styling advice" },
              score: { type: Type.NUMBER, description: "Coordination score from 0 to 100" },
              colorPaletteSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Colors that would complement this user's skin tone"
              }
            },
            required: ["skinTone", "outfitColors", "verdict", "recommendations", "score"]
          }
        }
      });

      res.json(JSON.parse(response.text));
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
