import { GoogleGenAI } from "@google/genai";
import type { ExtractedData } from '../types';

const apiKey = process.env.API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.error(
    "CRITICAL: API_KEY environment variable not set. " +
    "The application will not be able to connect to the Gemini API. " +
    "Please ensure the API_KEY is set in your deployment environment and not exposed in the client-side code."
  );
}

export const isApiConfigured = (): boolean => {
  return !!ai;
};

export const extractDataFromImage = async (base64Image: string, mimeType: string): Promise<ExtractedData> => {
  if (!ai) {
    throw new Error("Application not configured: API Key is missing. Please ensure the API_KEY environment variable is set for the deployment environment.");
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            text: `You are an expert at transcribing handwritten tabular data from images. 
            Your task is to analyze the provided image, identify the column headers, and extract all rows of data. 
            Return the result as a valid JSON array of objects. 
            Each object in the array represents a single row from the table. 
            The keys of each object must be the column headers identified from the image. 
            The values must be the corresponding data for that row and column. 
            Transcribe the data exactly as it appears. 
            Do not add any explanatory text, markdown, or anything else; your entire response must be only the JSON data.`
          },
          {
            inlineData: {
              data: base64Image,
              mimeType,
            },
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    const jsonText = response.text.trim();
    const data = JSON.parse(jsonText);
    return data as ExtractedData;

  } catch (error) {
    console.error("Error extracting data from image:", error);
    if (error instanceof Error) {
        if (error.message.includes('JSON')) {
          throw new Error("The AI returned data in an unexpected format. This can sometimes happen with complex handwriting. Please try again or use a clearer image.");
        }
        throw new Error(`Failed to process image with Gemini API: ${error.message}`);
    }
    throw new Error("An unknown error occurred while processing the image.");
  }
};
