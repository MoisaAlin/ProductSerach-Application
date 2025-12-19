
import { GoogleGenAI, GroundingChunk } from "@google/genai";
import { ProductInfo, ProductSearchResult, GroundingChunkWeb } from '../types';

const API_KEY = process.env.API_KEY;

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = 'gemini-2.5-flash';

export const searchProductsWithGemini = async (query: string, targetCountry?: string): Promise<ProductSearchResult> => {
  if (!API_KEY) {
     throw new Error("Gemini API Key is not configured. Please set the API_KEY environment variable.");
  }
  if (!query.trim()) {
    return { products: [], sources: [] };
  }

  let countryInstruction = "";
  if (targetCountry && targetCountry.trim() !== "" && targetCountry.toLowerCase() !== 'any country') {
    countryInstruction = ` Focus your search on products available from websites primarily serving or based in ${targetCountry}. If specific results for ${targetCountry} are limited, you may broaden the search but prioritize and clearly indicate products relevant to ${targetCountry}.`;
  }

  const basePrompt = `You are a helpful product search assistant. Based on the query '${query}', find relevant products.`;
  const formattingInstruction = `For each product, provide its name, an estimated price (e.g., "$XX.XX", "Approx. YYY", "Check site for price"), a primary website URL, the country the website primarily serves or is based in (e.g., "USA", "Germany", "Global"), and the domain name extracted from the website URL (e.g., "example.com"). If a direct product page URL is not available, provide the most relevant URL from your search results, such as a category page or homepage. The website URL must be a full, valid URL. Please format your entire response as a JSON array of objects. Each object should have the following keys: 'name' (string), 'price' (string), 'website' (string), 'country' (string), 'domain' (string). Do not include any text outside of this JSON array. If no products are found or the query is too vague, return an empty JSON array []. For example: [{"name": "Super Widget", "price": "$29.99", "website": "https://example.com/superwidget", "country": "USA", "domain": "example.com"}]`;
  
  const fullPrompt = `${basePrompt}${countryInstruction} ${formattingInstruction}`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: fullPrompt, 
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const rawChunks: GroundingChunk[] = groundingMetadata?.groundingChunks || [];
    
    const sources: GroundingChunkWeb[] = rawChunks
      .map(chunk => chunk.web) 
      .filter((webChunk): webChunk is { uri: string; title: string } => 
        Boolean(webChunk && webChunk.uri && webChunk.title)
      )
      .map(webChunk => ({ uri: webChunk.uri, title: webChunk.title }));

    let products: ProductInfo[] = [];
    let jsonStr = response.text.trim();
    
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }

    try {
      const parsedData = JSON.parse(jsonStr);
      let rawProducts: any[] = [];
      
      if (Array.isArray(parsedData)) {
          rawProducts = parsedData;
      } else if (typeof parsedData === 'object' && parsedData !== null) {
          rawProducts = [parsedData];
      }

      products = rawProducts
        .map((item: any): ProductInfo | null => {
          if (
            typeof item === 'object' &&
            item !== null &&
            typeof item.name === 'string' && item.name.trim() !== '' &&
            typeof item.price === 'string' &&
            typeof item.country === 'string' &&
            typeof item.domain === 'string'
          ) {
            return {
              name: item.name,
              price: item.price,
              website: (typeof item.website === 'string' && item.website.startsWith('http')) ? item.website : '',
              country: item.country,
              domain: item.domain
            };
          }
          return null;
        })
        .filter((p): p is ProductInfo => p !== null);

    } catch (parseError) {
      console.error("Failed to parse JSON response from Gemini:", parseError, "Raw text:", response.text);
      // Products array remains empty.
    }
    
    // Fallback logic for products without a website
    products.forEach(product => {
      if (!product.website && sources.length > 0) {
        const productNameLower = product.name.toLowerCase();
        // Find the first source that mentions the product name in its title.
        const bestSource = sources.find(source => 
          source.title.toLowerCase().includes(productNameLower)
        );
        if (bestSource) {
          product.website = bestSource.uri;
          // Also update the domain based on the found URL
          try {
            const url = new URL(bestSource.uri);
            product.domain = url.hostname.replace(/^www\./, '');
          } catch (e) {
            // The domain can remain as it was from the model if parsing fails
            console.warn(`Could not parse hostname from fallback URL: ${bestSource.uri}`);
          }
        }
      }
    });

    return { products, sources };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    let errorMessage = "Failed to fetch product information from Gemini API.";
    if (error instanceof Error) {
        errorMessage += ` Details: ${error.message}`;
        if (error.message.includes("API key not valid")) {
            errorMessage = "The configured Gemini API Key is invalid. Please check your API_KEY environment variable."
        }
    }
    throw new Error(errorMessage);
  }
};
