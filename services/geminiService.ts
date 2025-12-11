
import { GoogleGenAI, Type } from "@google/genai";
import { PromptItem, BrandVibe, StudioConfig, StudioShotType } from "../types";

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
  vibe: BrandVibe = 'Clean & Clinical',
  brandGuidelines: string = ""
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

  const guidelinesBlock = brandGuidelines ? `
    BRAND GUIDELINES (STRICTLY OVERRIDE ALL OTHER DEFAULTS):
    The user has provided the following brand rules. You MUST follow them for colors, tone, and forbidden elements:
    """
    ${brandGuidelines}
    """
  ` : "";

  const prompt = `
    You are an expert Amazon A+ Content Strategist & Art Director.
    
    INPUT CONTEXT:
    Category: "${category}"
    Market Research on Trends: "${marketTrends}"
    User Notes: "${additionalContext}"
    Desired Vibe: "${vibe}"
    Is Bundle/Combo: ${isBundle ? "YES (Contains " + base64Images.length + " items)" : "NO"}
    
    ${guidelinesBlock}

    Step 1: VISUAL IDENTITY LOCK (Mental Sandbox)
    Analyze the uploaded product image(s) to strictly define physical properties.
    ${isBundle ? "Since this is a bundle, analyze EACH product's container, color, and texture." : "Analyze the liquid color, viscosity, and container."}
    
    Step 2: EXECUTION
    Create 7 distinct image prompts.
    
    CRITICAL CONSISTENCY RULE:
    You MUST enforce the visual identity defined in Step 1 across ALL 7 prompts.
    ${isBundle ? "For 'Group Shots', ensure ALL analyzed products are present." : "If the product is a 'Transparent Blue Gel', every prompt must say so."}
    
    PRODUCT FIDELITY RULE (EXTREMELY IMPORTANT):
    - Do not write prompts that describe the bottle/container in a way that encourages redrawing. 
    - Use phrases like "The exact product from the reference image", "The original bottle".
    - Explicitly state: "Do not alter the label text or logo on the product."
    - The goal is to place the EXISTING product into a new scene, not to generate a similar looking product.

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
 * STUDIO MODE: Generate a specific shot based on strict config
 */
export const generateStudioShot = async (
    base64ProductImage: string[],
    config: StudioConfig,
    shotType: StudioShotType,
    customText: string,
    brandGuidelines: string = ""
): Promise<string> => {
    
    // Construct the creative brief
    let shotInstruction = "";
    let defaultText = "";

    switch(shotType) {
        case 'HERO':
            shotInstruction = "High-impact, cinematic hero shot of the product. The product should be the absolute center of attention. Commercial aesthetic.";
            defaultText = "PREMIUM QUALITY";
            break;
        case 'TEXTURE':
            shotInstruction = "Extreme macro close-up showing the texture of the product (liquid, cream, or powder) interacting with the container or spilling artistically.";
            defaultText = "RICH TEXTURE";
            break;
        case 'INGREDIENTS':
            shotInstruction = "Infographic style. The product surrounded by its key ingredients (botanicals, molecules, or raw elements) floating in 3D space.";
            defaultText = customText || "KEY INGREDIENTS";
            break;
        case 'HOW_TO':
            shotInstruction = "Instructional layout showing the product in use or being dispensed. Clear, clean action shot.";
            defaultText = customText || "HOW TO USE";
            break;
        case 'SIZE':
            shotInstruction = "Product scale comparison or variant display. Clean, minimal background to emphasize size and packaging details.";
            defaultText = customText || "SIZE VARIANT";
            break;
        case 'RANGE':
            shotInstruction = "Family portrait of the entire product range/bundle. Group shot, balanced composition.";
            defaultText = "COMPLETE RANGE";
            break;
        case 'BEFORE_AFTER':
            shotInstruction = "Split screen composition implies transformation. Left side slightly duller/neutral, right side radiant/perfected. Abstract representation, do not show fake faces.";
            defaultText = "BEFORE / AFTER";
            break;
        case 'SCIENTIFIC':
            shotInstruction = "Scientific trust builder. Lab setting, medical aesthetics, clean glass surfaces, molecular structures in background.";
            defaultText = customText || "CLINICALLY TESTED";
            break;
    }

    const guidelinesBlock = brandGuidelines ? `
    BRAND GUIDELINES (STRICTLY OVERRIDE ALL OTHER DEFAULTS):
    The user has provided the following brand rules. You MUST follow them for colors, tone, and forbidden elements:
    """
    ${brandGuidelines}
    """
    ` : "";

    let fullPrompt = `
    Role: Senior Art Director for a Luxury Brand.
    
    TASK: Generate a ${shotType} image for this product.
    
    ${guidelinesBlock}

    CREATIVE DIRECTION (Strictly Follow):
    - Theme: ${config.theme}
    - Lighting: ${config.lighting}
    - Composition: ${config.composition}
    - Background: ${config.background}
    - Key Elements/Props to Include: ${config.elements.join(", ")}
    
    USER CUSTOM INSTRUCTIONS (Apply these specific details):
    "${config.customInstructions || "No additional specific instructions."}"
    
    SHOT SPECIFIC INSTRUCTION:
    ${shotInstruction}
    
    TEXT RENDERING:
    Render the text: "${customText || defaultText}"
    (Ensure the text is legible, professional, and integrated into the scene)
    
    PRODUCT FIDELITY (IMMUTABLE RULE):
    - The product image provided MUST be treated as a rigid 3D asset.
    - Do NOT redraw the bottle or packaging.
    - Do NOT change, misspell, or alter the label text on the product itself.
    - Preserve all logos and brand markings exactly as they appear in the source.
    - If multiple source images are provided, this is a bundle/group shot.
    
    ${config.referenceImage ? "STYLE REFERENCE: Use the mood of the provided Reference Image." : ""}
    `;

    // Add Brand Vibe Match Logic
    if (config.matchBrandVibe) {
        fullPrompt += `
        \nBRAND VIBE MATCHING MODE: ACTIVE
        1. Analyze the color palette and mood of the provided [Style Reference Image].
        2. If no reference image is provided, analyze the [Product Source Image] for brand identity.
        3. EXTRACT the dominant brand colors.
        4. APPLY these colors to the background elements, lighting, and props.
        5. OVERRIDE the selected Theme/Background settings if they clash with the extracted brand identity.
        6. Ensure the final image feels like it belongs to the same brand identity as the reference.
        `;
    }

    // Prepare inputs
    const parts = base64ProductImage.map(b64 => ({
        inlineData: { mimeType: "image/png", data: b64 }
    }));

    // Add reference image if exists
    if (config.referenceImage) {
        parts.push({
            inlineData: { 
                mimeType: "image/png", 
                // strip header if present
                data: config.referenceImage.includes(',') ? config.referenceImage.split(',')[1] : config.referenceImage 
            }
        });
    }

    // Reuse the generation logic (which handles API call + fallback)
    return generateMarketingAsset([], fullPrompt, parts);
}


/**
 * Step 3: Generate a specific marketing image.
 * Tries the PRO model first, falls back to FLASH model if quota exceeded.
 * Now accepts optional explicit 'parts' for advanced usage (Studio Mode).
 */
export const generateMarketingAsset = async (
  base64SourceImages: string[],
  prompt: string,
  explicitParts?: any[]
): Promise<string> => {
  // @ts-ignore
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Create content parts for all source images (if not provided explicitly)
  const imageParts = explicitParts || base64SourceImages.map(b64 => ({
      inlineData: {
          mimeType: "image/png",
          data: b64,
      }
  }));

  const fullPrompt = `
    ${prompt}
    
    CRITICAL GENERATION RULES:
    1. **Text Rendering**: If you can, render the text provided.
    2. **Product Fidelity (ZERO TOLERANCE)**: 
       - The main product(s) in the image MUST be visually identical to the source image provided.
       - Do NOT redraw the packaging or labels.
       - Do NOT hallucinate new text onto the bottle itself.
       - Keep the original label text exactly as it is.
    3. **A+ Quality**: Commercial studio quality lighting.
  `;

  try {
    // 1. Try PRO Model
    const modelId = "gemini-3-pro-image-preview";
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

    return extractImageFromResponse(response);

  } catch (error: any) {
    // 2. Catch Quota/Rate Limit Errors
    const errorMessage = error.message || JSON.stringify(error);
    if (
        errorMessage.includes('429') || 
        errorMessage.includes('quota') || 
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        error.status === 'RESOURCE_EXHAUSTED'
    ) {
        console.warn("Gemini 3 Pro quota exceeded. Falling back to Gemini 2.5 Flash Image...");
        
        try {
            // 3. Fallback to Flash Image
            // Note: Flash Image does not support 'imageConfig.imageSize' but supports 'aspectRatio'
            const fallbackResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-image",
                contents: {
                    parts: [
                        ...imageParts,
                        { text: fullPrompt + " (High quality photorealistic product photography)" },
                    ],
                },
                config: {
                    // Flash model specific config
                }
            });
            
            return extractImageFromResponse(fallbackResponse);
        } catch (fallbackError) {
             console.error("Fallback generation failed:", fallbackError);
             throw fallbackError;
        }
    }
    
    console.error("Image generation failed:", error);
    throw error;
  }
};

// Helper to extract image bytes
const extractImageFromResponse = (response: any): string => {
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("No content generated");

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return part.inlineData.data;
      }
    }
    
    // Check if the model returned text refusal (common with image models if safety triggers)
    const textPart = parts.find((p: any) => p.text);
    if (textPart) {
        console.warn("Model refused to generate image, returned text:", textPart.text);
        throw new Error("Model refused generation: " + textPart.text);
    }

    throw new Error("Model did not return an image.");
}
