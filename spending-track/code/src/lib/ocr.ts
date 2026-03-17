import * as FileSystem from 'expo-file-system';

export interface ReceiptData {
  title: string;
  amount: number;
  date: string;
  category: string;
}

// Configuration: Point this to your secure self-hosted backend (e.g., Python + Ollama)
const SELF_HOSTED_OCR_ENDPOINT = 'http://192.168.1.10:3000/api/analyze-receipt';

/**
 * Analyze receipt using a Self-Hosted Backend (Secure, Private).
 * 
 * Architecture:
 * 1. App sends Image to Your Server.
 * 2. Server runs Local LLM (Llama 3, Mistral) or OCR (PaddleOCR).
 * 3. Server returns JSON.
 * 4. No data leaves your infrastructure.
 */
export const analyzeReceipt = async (imageUri: string): Promise<ReceiptData> => {
  try {
    // 1. Prepare Form Data
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: 'receipt.jpg',
      type: 'image/jpeg',
    } as any);

    // 2. Uncomment this to enable real backend call
    /*
    const response = await fetch(SELF_HOSTED_OCR_ENDPOINT, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    if (!response.ok) throw new Error("Backend failed");
    return await response.json();
    */

    // 3. Fallback: Mocking "On-Device" Extraction
    // simulating a proprietary small model running locally
    console.log('[Privacy Mode] Analyzing locally (simulated)...');
    return await mockLocalExtraction(imageUri);

  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};

/**
 * Simulates a Local Heuristic Parser (SLM logic).
 * In a real Native app (not Expo Go), you would feed OCR results into this.
 */
const mockLocalExtraction = async (uri: string): Promise<ReceiptData> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // This represents the extraction logic running on secure extracted text
            resolve({
                title: "Local Market (Private)", // Indicates local processing
                amount: 42.50,
                date: new Date().toLocaleDateString(),
                category: "Food",
            });
        }, 1500);
    });
};


/**
 * LOGIC: Heuristic Parser Helper
 * If you use simple on-device OCR (Text Recognition) instead of an LLM,
 * use this logic to extract fields from the raw text lines.
 */
export const parseRawOCRText = (lines: string[]): ReceiptData => {
    let maxAmount = 0;
    let foundDate = new Date().toLocaleDateString();
    let merchant = lines[0] || "Unknown Merchant";

    // Regex Patterns
    const pricePattern = /\d+\.\d{2}/;
    const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/;

    lines.forEach(line => {
        // Find Price (simple logic: largest number is usually total)
        const priceMatch = line.match(pricePattern);
        if (priceMatch) {
            const val = parseFloat(priceMatch[0]);
            if (val > maxAmount) maxAmount = val;
        }

        // Find Date
        const dateMatch = line.match(datePattern);
        if (dateMatch) foundDate = dateMatch[0];
    });

    return {
        title: merchant,
        amount: maxAmount,
        date: foundDate,
        category: "Other" // Inference is hard without LLM
    };
};
