import { GoogleGenAI, Type } from "@google/genai";
import { PromptItem, BrandVibe } from "../types";

/**
 * Helper to clean JSON strings if the model wraps them in markdown
 */
const cleanJson = (text: string): string => {
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return clean;
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
  base64Image: string,
  category: string,
  marketTrends: string,
  additionalContext: string = "",
  vibe: BrandVibe = 'Clean & Clinical'
): Promise<PromptItem[]> => {
  // @ts-ignore
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-2.5-flash";

  const prompt = `
    You are an expert Amazon A+ Content Strategist & Art Director.
    
    INPUT CONTEXT:
    Category: "${category}"
    Market Research on Trends: "${marketTrends}"
    User Notes: "${additionalContext}"
    Desired Vibe: "${vibe}"
    
    Step 1: VISUAL IDENTITY LOCK (Mental Sandbox)
    Analyze the uploaded product image to strictly define its physical properties.
    - LIQUID COLOR: Is it transparent blue? Milky white? Clear? Golden oil? (Look closely at the bottle content).
    - VISCOSITY: Is it a Thick Gel? Watery Toner? Rich Cream? Foamy?
    - PACKAGING: Matte finish? Glossy? 
    
    Step 2: EXECUTION
    Create 7 distinct image prompts.
    
    CRITICAL CONSISTENCY RULE:
    You MUST enforce the visual identity defined in Step 1 across ALL 7 prompts.
    If the product is a "Transparent Blue Gel", every single prompt describing texture, drops, or splashes MUST explicitly say "Transparent Blue Gel".
    Do not allow the model to hallucinate "clear water" if the product is blue.
    
    PRODUCT FIDELITY RULE:
    Do not write prompts that describe the bottle in a way that encourages redrawing (e.g. avoid "A blue bottle with white text"). 
    Instead, use phrases like "The exact product from the reference image" combined with the environment description.

    STRICT TEXT RENDERING SYNTAX:
    When asking for text on the image, you MUST use this exact format: 
    Render the text: "YOUR TEXT HERE"
    (Do not use other variations like "Text saying..." or "Label it...").
    
    REQUIRED ARCHETYPES (Adapt these based on the Market Research):
    
    1.  **The "Market Leader" Hero**: 
        *   Standard clear product shot but styled according to the researched trends (e.g. if research says "minimalist", do that).
        *   Include a short 2-3 word slogan text if appropriate.
        *   Syntax: Render the text: "SLOGAN"
    
    2.  **The "Ingredient Map" (Infographic)**:
        *   Product + Floating ingredients.
        *   TEXT RULE: Explicitly label the ingredients (e.g. "ALOE", "BHA") pointing to them.
        *   Syntax: Render the text: "INGREDIENT NAME"
    
    3.  **The "Benefit Callout" (Infographic)**:
        *   Product with arrows or lines pointing to features.
        *   TEXT RULE: Render texts like "HYDRATES" or "GENTLE" based on what is standard for this category.
        *   Syntax: Render the text: "BENEFIT"
    
    4.  **The "Texture/Zoom"**:
        *   Macro shot of the texture (foam/gel/serum).
        *   **CONSISTENCY**: Use the exact LIQUID COLOR and VISCOSITY from Step 1.
        *   TEXT RULE: Render the texture name (e.g. "MICRO-FOAM") largely in the background.
        *   Syntax: Render the text: "TEXTURE NAME"
    
    5.  **The "Routine/Usage"**:
        *   Show usage context (bathroom/kitchen/outdoors).
        *   TEXT RULE: "DAILY USE" or "AM/PM" text.
        *   Syntax: Render the text: "DAILY USE"
    
    6.  **The "Scientific Trust"**:
        *   Lab or Clean setting.
        *   TEXT RULE: "CLINICALLY PROVEN" or "DERM TESTED" badge style text.
        *   Syntax: Render the text: "CLINICALLY PROVEN"
        
    7.  **The "Comparison/Result"**:
        *   Visualizing the result (e.g. clear skin, shiny hair).
        *   TEXT RULE: "BEFORE" / "AFTER" style or "VISIBLE RESULTS".
        *   Syntax: Render the text: "VISIBLE RESULTS"

    OUTPUT FORMAT:
    Return a raw JSON array of 7 objects.
    Each object must have:
    - "category": Short name (e.g., "Benefit Anatomy").
    - "visualPrompt": A highly detailed prompt for Gemini Image Generation.
       - **MUST include consistency phrase**: e.g., "The liquid drops are transparent blue."
       - **MUST include strict text syntax**: Render the text: "YOUR TEXT HERE"
       - Specify font style: "Modern sans-serif dark font".
    - "layoutType": One of ["SPLASH", "FLATLAY", "NEGATIVE_SPACE", "MACRO", "LIFESTYLE", "INFOGRAPHIC", "BENEFIT_MAP", "INGREDIENT_LIST"].
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: base64Image,
            },
          },
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
    
    const cleanedText = cleanJson(text);
    return JSON.parse(cleanedText) as PromptItem[];
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
  base64SourceImage: string,
  prompt: string
): Promise<string> => {
  // @ts-ignore
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-3-pro-image-preview";

  const fullPrompt = `
    ${prompt}
    
    CRITICAL GENERATION RULES:
    1. **Text Rendering**: You are required to render specific text onto the image. The spelling must be perfect. The font should be clean, modern, and legible (San Francisco or Helvetica style).
    2. **Product Fidelity (VERY IMPORTANT)**: 
       - The main product in the image MUST be identical to the reference image provided.
       - Do NOT alter the logo, brand text, fonts, or container shape.
       - Treat the reference product as a rigid object that cannot be modified.
       - If the reference image has a specific label, that label must appear on the product in the generated image.
    3. **A+ Quality**: This is for a high-end Amazon listing. Lighting must be commercial studio quality.
    4. **Consistency**: Ensure any liquid, drops, or texture swatches match the color and viscosity described in the prompt.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: base64SourceImage,
            },
          },
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

    throw new Error("Model did not return an image.");
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};