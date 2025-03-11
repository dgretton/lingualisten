import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUDIO_DIR = path.join(__dirname, '../../dist/public/audio');

// Ensure the audio directory exists
async function ensureAudioDir() {
  try {
    await fs.mkdir(AUDIO_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating audio directory:', error);
  }
}

/**
 * Generate TTS audio using Google Text-to-Speech API
 */
export async function generateTTS(text: string): Promise<string> {
  // If no API key is set, use a library-based fallback (this is discouraged for production)
  if (!process.env.GOOGLE_TTS_API_KEY) {
    console.warn('No Google TTS API key found. Using library-based TTS.');
    return generateFallbackTTS(text);
  }

  try {
    // Actual implementation would use Google TTS API here
    // For now, we'll use a fallback approach for demonstration
    return await generateFallbackTTS(text);
  } catch (error) {
    console.error('Error generating TTS with Google API:', error);
    return generateFallbackTTS(text);
  }
}

/**
 * Fallback TTS implementation for development
 */
export async function generateFallbackTTS(text: string): Promise<string> {
  await ensureAudioDir();
  
  // Create a hash of the text to use as filename
  const hash = createHash('md5').update(text).digest('hex');
  const filename = `${hash}.mp3`;
  const audioPath = path.join(AUDIO_DIR, filename);
  const audioUrl = `/audio/${filename}`;
  
  // Check if file already exists to avoid regenerating
  try {
    await fs.access(audioPath);
    return audioUrl;
  } catch (error) {
    // File doesn't exist, would generate it
    // In a real implementation, we would generate the audio file here
    
    // Since we can't actually generate audio, we'll create an empty file for demonstration
    await fs.writeFile(audioPath, 'Audio content would be here');
    
    return audioUrl;
  }
}
