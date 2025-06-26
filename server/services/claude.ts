// Load environment variables first
import { config } from "dotenv";
config();

import Anthropic from '@anthropic-ai/sdk';

// Debug the API key at module load time
console.log('Claude service - API key check:');
console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
console.log('ANTHROPIC_API_KEY first 10 chars:', process.env.ANTHROPIC_API_KEY?.substring(0, 10));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GeneratedContent {
  englishContent: string;
  spanishQuestions: {
    question: string;
    options: string[];
    correctOptionIndex: number;
  }[];
  spanishPhoneticTranscription?: string; // New field for phonetic transcription
}

/**
 * Generate English content from a Spanish prompt and create related quiz questions
 * Optimized for adult Spanish-speaking learners with middle school education
 */
export async function generateContentAndQuestions(
  spanishPrompt: string,
): Promise<GeneratedContent> {
  try {
    // Parse the prompt to extract context if provided
    const lines = spanishPrompt.split('\n');
    const mainTopic = lines[0];
    let jobContext = '';
    let levelContext = '';
    
    // Look for additional context
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('tipo de trabajo') || line.includes('estudios:')) {
        jobContext = lines[i].split(':')[1]?.trim() || '';
      }
      if (line.includes('nivel de inglés:')) {
        levelContext = lines[i].split(':')[1]?.trim() || '';
      }
    }

    // Build context-aware instruction
    let instruction = `You are helping adult Spanish-speaking learners improve their English. They have middle school education and need practical, everyday vocabulary.`;
    
    if (jobContext) {
      instruction += ` The learner works in or studies: ${jobContext}. Tailor the vocabulary and examples to be relevant to this field.`;
    }
    
    if (levelContext) {
      const levelAdjustments = {
        'básico': 'Use very simple vocabulary, short sentences, and focus on the most essential phrases. Avoid complex grammar.',
        'intermedio': 'Use moderate vocabulary. Include slightly longer sentences but keep them clear.',
        'avanzado': 'Use more sophisticated vocabulary and longer sentences. Include more complex scenarios.'
      };
      instruction += ` The learner's English level is ${levelContext}. ${levelAdjustments[levelContext as keyof typeof levelAdjustments] || 'Use moderate difficulty appropriate for everyday communication.'}`;
    }

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `${instruction}

Topic request (in Spanish): "${mainTopic}"

Create a JSON response with:
1. "englishContent": 5-7 short, practical English statements about this topic. Use:
   - Simple, everyday vocabulary
   - Common phrases people use in daily life
   - Clear, natural language (avoid overly technical jargon)
   - Each statement should be 1-2 sentences maximum

2. "spanishQuestions": Exactly 5 English comprehension exercises. Each should present one English sentence from the content above, followed by 4 Spanish translation options where only one is correct. 

IMPORTANT: This tests ENGLISH comprehension, NOT Spanish grammar. ALL four Spanish options must be grammatically correct and use proper middle school level Spanish. The incorrect options should test whether the learner understood the ENGLISH correctly by:
   - Misunderstanding key English words (confusing 'day off' with 'work day', 'safety glasses' with 'sunglasses', 'shift' with 'shirt')
   - Mishearing similar English sounds ('Thursday' vs 'Tuesday', 'noon' vs 'moon')
   - Confusing English prepositions, verb tenses, or word order
   - Misunderstanding English terminology or context
   - Confusing English homophones or similar-sounding words

Use clear, simple Spanish that a middle school graduate would easily understand. Avoid complex Spanish vocabulary, subjunctive mood, or advanced grammar structures. All Spanish should be straightforward and natural.

3. "spanishPhoneticTranscription": A phonetic transcription of the English content using Spanish alphabet letters (like in Barron's bilingual dictionaries). Help Spanish speakers pronounce the English words by writing them as they would sound using Spanish spelling patterns.

Focus on practical vocabulary for: daily life situations, basic communication, common activities, and general useful phrases.

Example format:
{
  "englishContent": "1. Put on your safety glasses before starting work.\\n2. The supervisor will check your progress at noon.\\n3. Clean your tools at the end of each shift.",
  "spanishQuestions": [
    {
      "question": "Put on your safety glasses before starting work.",
      "options": ["Ponte los lentes de seguridad antes de empezar a trabajar.", "Ponte los guantes de seguridad antes de empezar a trabajar.", "Ponte las gafas de sol antes de empezar a trabajar.", "Ponte el casco de seguridad antes de empezar a trabajar."],
      "correctOptionIndex": 0
    }
  ],
  "spanishPhoneticTranscription": "1. Put on yor sefti glases bifor starting guork.\\n2. De supervaisor guil chek yor progres at nun.\\n3. Klin yor tuls at de end of ich shift."
}

Note: In this example, all Spanish options are grammatically correct, but they test whether the learner understood "safety glasses" vs "gloves/sunglasses/helmet" in English.

Respond only with valid JSON.`
        }
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const parsedContent = JSON.parse(content.text) as GeneratedContent;
    
    // Validate the response structure
    if (!parsedContent.englishContent || !parsedContent.spanishQuestions || !Array.isArray(parsedContent.spanishQuestions)) {
      throw new Error('Invalid response structure from Claude');
    }

    // Ensure we have exactly 5 questions
    if (parsedContent.spanishQuestions.length !== 5) {
      throw new Error(`Expected 5 questions, got ${parsedContent.spanishQuestions.length}`);
    }

    return parsedContent;
  } catch (error) {
    console.error("Error generating content with Claude:", error);
    
    // Retry logic for API failures
    if (error instanceof Error && error.message.includes('rate_limit')) {
      // Wait and retry once for rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
      return generateContentAndQuestions(spanishPrompt);
    }
    
    throw new Error("Failed to generate content. Please try again later.");
  }
}

/**
 * Cost monitoring function - tracks API usage
 */
export function estimateClaudeTokens(prompt: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(prompt.length / 4);
}

/**
 * Safety wrapper to prevent runaway costs
 */
export async function generateContentWithSafeguards(spanishPrompt: string): Promise<GeneratedContent> {
  const estimatedTokens = estimateClaudeTokens(spanishPrompt);
  
  // Safety check: reject extremely long prompts
  if (estimatedTokens > 500) {
    throw new Error("Prompt too long. Please use a shorter topic description.");
  }
  
  return generateContentAndQuestions(spanishPrompt);
}

/**
 * Translate text from Spanish to English using Claude
 */
export async function translateSpanishToEnglish(text: string): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Translate this Spanish text to natural-sounding English suitable for workplace communication: "${text}"`
        }
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return content.text.trim();
  } catch (error) {
    console.error("Error translating text with Claude:", error);
    throw new Error("Failed to translate text. Please try again later.");
  }
}
