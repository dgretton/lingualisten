import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
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
 * Optimized for adult Spanish-speaking migrant workers with middle school education
 */
export async function generateContentAndQuestions(
  spanishPrompt: string,
): Promise<GeneratedContent> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are helping adult Spanish-speaking workers (dairy workers, landscapers) learn English for their jobs. They have middle school education and need practical workplace vocabulary.

Topic request (in Spanish): "${spanishPrompt}"

Create a JSON response with:
1. "englishContent": 5-7 short, practical English statements about this topic. Use:
   - Simple workplace vocabulary 
   - Common phrases workers actually hear on the job
   - Clear, everyday language (avoid technical jargon)
   - Each statement should be 1-2 sentences maximum

2. "spanishQuestions": Exactly 5 multiple-choice questions in Spanish that test understanding of the English content. Each question should have 4 options with only one correct answer. Use everyday Spanish expressions suitable for adult learners.

3. "spanishPhoneticTranscription": A phonetic transcription of the English content using Spanish alphabet letters (like in Barron's bilingual dictionaries). Help Spanish speakers pronounce the English words by writing them as they would sound using Spanish spelling patterns.

Focus on practical vocabulary for: workplace safety, tools, instructions, time, weather, basic communication.

Example format:
{
  "englishContent": "1. Put on your safety glasses before starting work.\\n2. The supervisor will check your progress at noon.\\n3. Clean your tools at the end of each shift.",
  "spanishQuestions": [
    {
      "question": "¿Qué debes ponerte antes de empezar a trabajar?",
      "options": ["Los guantes", "Los lentes de seguridad", "El casco", "Las botas"],
      "correctOptionIndex": 1
    }
  ],
  "spanishPhoneticTranscription": "1. Put on yor sefti glases bifor starting guork.\\n2. De supervaisor guil chek yor progres at nun.\\n3. Klin yor tuls at de end of ich shift."
}

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
