import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GeneratedContent {
  englishContent: string;
  spanishQuestions: {
    question: string;
    options: string[];
    correctOptionIndex: number;
  }[];
}

/**
 * Generate English content from a Spanish prompt and create related quiz questions
 */
export async function generateContentAndQuestions(
  spanishPrompt: string,
): Promise<GeneratedContent> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a language learning assistant that helps adult Spanish speakers (18+ with middle school education) learn English.
          
          Given a topic prompt in Spanish, create:
          1. 5-10 short, simple English statements or phrases about the requested topic. Focus on:
             - Using everyday vocabulary
             - Simple sentence structures (prefer simple over compound sentences)
             - Practical, real-world language for adult contexts
             - Each statement should be 1-2 sentences maximum
          
          2. Five multiple-choice questions in Spanish that test comprehension of the English content.
             - Questions should be appropriate for adults with middle school education
             - Use everyday Spanish expressions in the questions
             - Avoid complex grammar terminology
          
          Each question should have 4 options (a, b, c, d) with only one correct answer.
          
          Respond with a JSON object in this format:
          {
            "englishContent": "1. Statement one.\n2. Statement two.\n3. Statement three.\n...",
            "spanishQuestions": [
              {
                "question": "Question in Spanish using everyday expressions",
                "options": ["Option A in Spanish", "Option B in Spanish", "Option C in Spanish", "Option D in Spanish"],
                "correctOptionIndex": 0 // Zero-based index of the correct option
              },
              ...
            ]
          }`
        },
        {
          role: "user",
          content: `Por favor, genera contenido en inglés sobre: ${spanishPrompt}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const messageContent = response.choices[0].message.content;
    if (!messageContent) {
      throw new Error("Failed to generate content. OpenAI returned empty content.");
    }
    const content = JSON.parse(messageContent as string) as GeneratedContent;
    return content;
  } catch (error) {
    console.error("Error generating content with OpenAI:", error);
    throw new Error("Failed to generate content. Please try again later.");
  }
}

/**
 * Translate text from Spanish to English
 */
export async function translateSpanishToEnglish(text: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a Spanish to English translator. Translate the Spanish text to natural-sounding English."
        },
        {
          role: "user",
          content: text
        }
      ]
    });

    const content = response.choices[0].message.content || "";
    return content;
  } catch (error) {
    console.error("Error translating text with OpenAI:", error);
    throw new Error("Failed to translate text. Please try again later.");
  }
}
