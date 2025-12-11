import { GoogleGenAI, Type } from "@google/genai";
import { PromptItem, BrandVibe } from "../types";

/**
 * Helper to clean JSON strings.
 * Robustly extracts the JSON array block from the response, ignoring markdown or conversational text.
 */
const cleanJson = (text: string): string => {
  // Find the first '[' and the last ']'
  const firstOpen = text.indexOf('[');
  const lastClose = text.lastIndexOf(']');
  
  if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
    return text.substring(firstOpen, lastClose + 1);
  }
  
  // Fallback: Remove markdown code blocks if regex didn't match
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

/**
 * Step 1: Market Research
 * Uses Google Search to find what works best for this specific category right now.
 */
export const researchCategoryTrends = async (category: string): Promise<string> => {
    // @ts-ignore
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = "gemini-2.5-flash"; // Flash is perfect for tool use/search

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `Research the latest high-converting Amazon A+ content visual trends for "${category}" products in 2024-2025.
            Look for:
            1. Common infographic styles (e.g. ingredient zooms, step-by-step).
            2. Color palette trends.
            3. Key selling points visually highlighted (e.g. "Dermatologist Tested", "Vegan").
            
            Summarize the visual strategy in 3 bullet points.`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        // Extract grounding metadata if available to show we actually searched (optional for UI, but good for debug)
        const trends = response.text || "Focus on clean, ingredient-forward imagery with clear benefits.";
        return trends;
    } catch (error) {
        console.warn("Market research failed, falling back to default strategy", error);
        return "Focus on high-contrast, benefit-driven imagery with clear typography.";
    }
}

/**
 * Step 2: Analyze the product image + Market Research to generate marketing prompts.
 */
export const analyzeAndPlanAssets = async (
  base64Images: string[],
  category: string,
  marketTrends: string,
  additionalContext: string = "",
  vibe: BrandVibe = 'Clean & Clinical'
): Promise<PromptItem[]> => {
  // @ts-ignore
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-2.5-flash";

  const isBundle = base64Images.length > 1;

  // Create content parts for all uploaded images
  const imageParts = base64Images.map(b64 => ({
      inlineData: {
          mimeType: "image/png",
          data: b64,
      }
  }));

  const prompt = `
    You are an expert Amazon A+ Content Strategist & Art Director.
    
    INPUT CONTEXT:
    Category: "${category}"
    Market Research on Trends: "${marketTrends}"
    User Notes: "${additionalContext}"
    Desired Vibe: "${vibe}"
    Is Bundle/Combo: ${isBundle ? "YES (Contains " + base64Images.length + " items)" : "NO"}
    
    Step 1: VISUAL IDENTITY LOCK (Mental Sandbox)
    Analyze the uploaded product image(s) to strictly define physical properties.
    ${isBundle ? "Since this is a bundle, analyze EACH product's container, color, and texture." : "Analyze the liquid color, viscosity, and container."}
    
    Step 2: EXECUTION
    Create 7 distinct image prompts.
    
    CRITICAL CONSISTENCY RULE:
    You MUST enforce the visual identity defined in Step 1 across ALL 7 prompts.
    ${isBundle ? "For 'Group Shots', ensure ALL analyzed products are present." : "If the product is a 'Transparent Blue Gel', every prompt must say so."}
    
    PRODUCT FIDELITY RULE:
    Do not write prompts that describe the bottle/container in a way that encourages redrawing. 
    Use phrases like "The exact product from the reference image".

    STRICT TEXT RENDERING SYNTAX:
    When asking for text on the image, you MUST use this exact format: 
    Render the text: "YOUR TEXT HERE"
    
    REQUIRED ARCHETYPES (Adapt these based on the Market Research):
    
    1.  **The "${isBundle ? 'Ultimate Bundle Hero' : 'Market Leader Hero'}"**: 
        *   ${isBundle ? "Show ALL products arranged aesthetically together." : "Standard clear product shot styled to trends."}
        *   Include a short slogan.
        *   Syntax: Render the text: "${isBundle ? 'COMPLETE KIT' : 'SLOGAN'}"
    
    2.  **The "${isBundle ? 'Routine Steps' : 'Ingredient Map'}" (Infographic)**:
        *   ${isBundle ? "Show the products in order of use (Step 1, Step 2)." : "Product + Floating ingredients."}
        *   Syntax: Render the text: "${isBundle ? 'STEP 1 & 2' : 'INGREDIENT NAME'}"
    
    3.  **The "Benefit Callout" (Infographic)**:
        *   ${isBundle ? "Highlight why using these together is better (Synergy)." : "Product with arrows pointing to features."}
        *   Syntax: Render the text: "${isBundle ? 'BETTER TOGETHER' : 'BENEFIT'}"
    
    4.  **The "Texture/Zoom"**:
        *   Macro shot of the texture(s).
        *   ${isBundle ? "Show textures of BOTH/ALL products side-by-side or mixing." : "Macro shot of the texture."}
        *   Syntax: Render the text: "TEXTURE"
    
    5.  **The "Lifestyle/Usage"**:
        *   Show usage context.
        *   Syntax: Render the text: "DAILY USE"
    
    6.  **The "Scientific Trust"**:
        *   Lab or Clean setting.
        *   Syntax: Render the text: "CLINICALLY PROVEN"
        
    7.  **The "Comparison/Result"**:
        *   Visualizing the result (e.g. clear skin).
        *   Syntax: Render the text: "VISIBLE RESULTS"

    OUTPUT FORMAT:
    Return a raw JSON array of 7 objects.
    Each object must have:
    - "category": Short name.
    - "visualPrompt": A highly detailed prompt.
    - "layoutType": One of ["SPLASH", "FLATLAY", "NEGATIVE_SPACE", "MACRO", "LIFESTYLE", "INFOGRAPHIC", "BENEFIT_MAP", "INGREDIENT_LIST"].
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          ...imageParts,
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              visualPrompt: { type: Type.STRING },
              layoutType: { type: Type.STRING },
            },
            required: ["category", "visualPrompt", "layoutType"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from analysis model");
    
    try {
        const cleanedText = cleanJson(text);
        return JSON.parse(cleanedText) as PromptItem[];
    } catch (parseError) {
        console.error("JSON Parse Error. Raw text:", text);
        throw new Error("Failed to parse the AI strategy plan.");
    }
  } catch (error) {
    console.error("Analysis failed:", error);
    throw new Error("Failed to analyze product context.");
  }
};

/**
 * Step 3: Generate a specific marketing image.
 * Uses gemini-3-pro-image-preview (Nano Banana Pro) for superior text rendering.
 */
export const generateMarketingAsset = async (
  base64SourceImages: string[],
  prompt: string
): Promise<string> => {
  // @ts-ignore
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-3-pro-image-preview";

  const fullPrompt = `
    ${prompt}
    
    CRITICAL GENERATION RULES:
    1. **Text Rendering**: You are required to render specific text onto the image. The spelling must be perfect. The font should be clean, modern, and legible.
    2. **Product Fidelity (VERY IMPORTANT)**: 
       - The main product(s) in the image MUST be identical to the reference image(s) provided.
       - Do NOT alter logos, brand text, or container shapes.
       - If multiple products are provided, ensure all relevant ones described in the prompt are present.
    3. **A+ Quality**: Commercial studio quality lighting.
    4. **Consistency**: Ensure liquid colors and textures match the reference.
  `;

  // Create content parts for all source images
  const imageParts = base64SourceImages.map(b64 => ({
      inlineData: {
          mimeType: "image/png",
          data: b64,
      }
  }));

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          ...imageParts,
          { text: fullPrompt },
        ],
      },
      config: {
        imageConfig: {
          imageSize: "1K",
          aspectRatio: "1:1"
        }
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("No content generated");

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return part.inlineData.data;
      }
    }
    
    // Check if the model returned text refusal (common with image models if safety triggers)
    const textPart = parts.find(p => p.text);
    if (textPart) {
        console.warn("Model refused to generate image, returned text:", textPart.text);
        throw new Error("Model refused generation: " + textPart.text);
    }

    throw new Error("Model did not return an image.");
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};