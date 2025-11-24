import { GoogleGenAI, Type } from "@google/genai";
import { TranslationItem } from "../types";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const translateImageContent = async (base64Image: string): Promise<TranslationItem[]> => {
  try {
    const ai = getGeminiClient();
    
    // Remove header if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const prompt = `
      Analyze this image. Detect all visible text blocks, including vertical text columns (common in Traditional Chinese).
      Translate the text to Traditional Chinese (zh-TW).
      Return a JSON array. Each object must have:
      - "originalText": string
      - "translatedText": string
      - "box_2d": array of 4 integers representing [ymin, xmin, ymax, xmax] on a 1000x1000 coordinate system.
      
      Rules:
      1. Ensure bounding boxes are tight around the text.
      2. For vertical text, the box should be tall and narrow.
      3. Treat vertical lines of text as single blocks.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              originalText: { type: Type.STRING },
              translatedText: { type: Type.STRING },
              box_2d: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: "ymin, xmin, ymax, xmax coordinates (0-1000)"
              }
            },
            required: ["originalText", "translatedText", "box_2d"]
          }
        }
      }
    });

    if (!response.text) {
      return [];
    }

    const data = JSON.parse(response.text) as TranslationItem[];
    return data;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};