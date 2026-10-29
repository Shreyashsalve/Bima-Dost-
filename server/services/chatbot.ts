import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiInstance;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatbotResponse {
  reply: string;
  suggestBooking: boolean;
  detectedLanguage?: string;
  error?: string;
}

const SYSTEM_INSTRUCTION = `You are "Bima Dost AI" (बीमा दोस्त) — India's trusted civic insurance grievance advisor.

Your core persona:
1. Always address the user warmly as "Dost" (दोस्त).
2. Language: Automatically detect the user's language and respond naturally in that EXACT language (English, Hindi हिंदी, Marathi मराठी, Bengali, Gujarati, Tamil, Telugu, Kannada, etc.).
3. Knowledge: Provide accurate, concise, empathetic education on Indian insurance rules:
   - IRDAI Protection of Policyholders' Interests Regulations.
   - Section 45 of Insurance Act 1938 (3-year non-contestability clause: policy cannot be repudiated after 3 years for misstatement/non-disclosure).
   - Insurance Ombudsman process under Rule 13 (speedy, zero-fee consumer adjudication).
   - Pre-Existing Disease (PED) rules: Burden of proof lies on insurer.
   - Room rent proportionate deduction: cannot apply to ICU/OT fees or medical implants.
4. Truthfulness: NEVER invent fictitious policy benefits, premiums, coverage, or guarantee claim payouts.
5. Action: If the user describes a rejected, delayed, or stuck claim, or asks how to get legal representation, explain their rights clearly and invite them to book an official consultation session with Bima Dost's panel of ex-claims officers and advocate specialists.
6. Crucial Rule: NEVER claim that you have booked an appointment yourself. Always advise them to use the "Book Consultation" button on the screen to reserve their slot and complete verified payment.
7. Tone: Warm, empathetic, credible, concise (keep answers under 3-4 short paragraphs).`;

export async function askBimaDostChatbot(
  userMessage: string,
  history: ChatMessage[] = []
): Promise<ChatbotResponse> {
  if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    return {
      reply: 'Namaste Dost! Please ask your insurance question or grievance concern.',
      suggestBooking: false
    };
  }

  try {
    const ai = getAIClient();

    // Build chat contents from history + current message
    const formattedContents: any[] = [];

    // Include recent history (up to last 6 turns for context and speed)
    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
      formattedContents.push({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.text }]
      });
    }

    formattedContents.push({
      role: 'user',
      parts: [{ text: userMessage.trim() }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: formattedContents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    const reply = response.text || 'Namaste Dost! I am here to help you navigate your insurance claim. How may I assist you today?';

    // Check if the conversation warrants showing the "Book Consultation" action card
    const lowerMsg = (userMessage + ' ' + reply).toLowerCase();
    const suggestBooking =
      lowerMsg.includes('reject') ||
      lowerMsg.includes('deni') ||
      lowerMsg.includes('nakaar') ||
      lowerMsg.includes('रिजेक्ट') ||
      lowerMsg.includes('अस्वीकृत') ||
      lowerMsg.includes('deduct') ||
      lowerMsg.includes('delay') ||
      lowerMsg.includes('stuck') ||
      lowerMsg.includes('ombudsman') ||
      lowerMsg.includes('advocate') ||
      lowerMsg.includes('consult') ||
      lowerMsg.includes('book') ||
      lowerMsg.includes('अपॉइंटमेंट');

    let detectedLanguage = 'English';
    if (/[\u0900-\u097F]/.test(userMessage)) {
      if (userMessage.includes('आहे') || userMessage.includes('करावे') || userMessage.includes('माझा')) {
        detectedLanguage = 'Marathi';
      } else {
        detectedLanguage = 'Hindi';
      }
    }

    return {
      reply,
      suggestBooking,
      detectedLanguage
    };
  } catch (err: any) {
    console.error('[Chatbot] Gemini error:', err);
    return {
      reply: `Namaste Dost! I encountered a momentary hiccup connecting to the advisory knowledgebase. If your claim is stuck or delayed, you can directly book a 30-minute consultation with our advocate panel using the button below.`,
      suggestBooking: true,
      error: err.message
    };
  }
}
