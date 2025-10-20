import { GoogleGenAI, Type } from "@google/genai";
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

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      row: {
        type: Type.STRING,
        description: 'The row number from the first column.',
      },
      J: {
        type: Type.STRING,
        description: 'The value from column J for this row.',
      },
      K: {
        type: Type.STRING,
        description: 'The value from column K for this row.',
      },
      L: {
        type: Type.STRING,
        description: 'The value from column L for this row.',
      },
    },
    required: ['row', 'J', 'K', 'L'],
  },
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
            text: `Analyze the handwritten data in the provided image. Extract the tabular data into a structured format. 
            The image contains columns labeled 'J', 'K', and 'L', prefixed by a row number. 
            Transcribe the data precisely as written, including fractions (e.g., "4'-7 1/8").
            Return the data as a JSON array where each object represents a row. 
            Each object should have four keys: 'row', 'J', 'K', and 'L'. 
            The 'row' key should correspond to the number at the beginning of each line.`
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
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text.trim();
    const data = JSON.parse(jsonText);
    return data as ExtractedData;

  } catch (error) {
    console.error("Error extracting data from image:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to process image with Gemini API: ${error.message}`);
    }
    throw new Error("An unknown error occurred while processing the image.");
  }
};
