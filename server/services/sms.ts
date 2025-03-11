import { Assessment } from '@shared/schema';
import { storage } from '../storage';

// Lazy-load the Twilio client to avoid errors if the package isn't available
let Twilio: any;
let twilioClient: any = null;

/**
 * Check if Twilio functionality is available
 * This allows us to conditionally show SMS options in the UI
 */
export function isSmsAvailable(): boolean {
  try {
    // Try to load Twilio and check required environment variables
    if (!Twilio) {
      Twilio = require('twilio').Twilio;
    }
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    return !!(accountSid && authToken && fromNumber);
  } catch (e) {
    console.log('SMS functionality is disabled: Twilio may not be installed or configured');
    return false;
  }
}

/**
 * Initialize Twilio client if not already initialized
 * This is called only when attempting to send an SMS
 */
function initTwilioClient(): boolean {
  try {
    if (!Twilio) {
      Twilio = require('twilio').Twilio;
    }
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (accountSid && authToken && !twilioClient) {
      twilioClient = new Twilio(accountSid, authToken);
    }
    
    return !!twilioClient;
  } catch (e) {
    console.error('Failed to initialize Twilio client:', e);
    return false;
  }
}

export async function sendAssessmentSMS(
  assessmentId: number, 
  phoneNumber: string
): Promise<boolean> {
  try {
    // Check if Twilio is available and initialize if needed
    if (!isSmsAvailable() || !initTwilioClient()) {
      console.error('Twilio not configured: Missing credentials or package');
      return false;
    }

    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      console.error('Missing Twilio from phone number');
      return false;
    }

    const assessment = await storage.getAssessment(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const topic = await storage.getTopic(assessment.topicId);
    if (!topic) {
      throw new Error('Topic not found');
    }

    // Generate SMS content
    const messageBody = generateAssessmentSMS(assessment, topic.prompt);

    // Send SMS using Twilio
    const message = await twilioClient.messages.create({
      body: messageBody,
      from: fromNumber,
      to: phoneNumber
    });

    console.log('SMS sent with SID:', message.sid);
    return true;
  } catch (error) {
    console.error('Error sending assessment SMS:', error);
    return false;
  }
}

function generateAssessmentSMS(assessment: Assessment, topicPrompt: string): string {
  const percentScore = Math.round((assessment.score / assessment.totalQuestions) * 100);
  
  return `
LinguaListen - Reporte de Evaluación

Hola ${assessment.userName},

Tu puntuación: ${assessment.score}/${assessment.totalQuestions} (${percentScore}%)
Tema: ${topicPrompt}

¡Gracias por practicar con LinguaListen! Visita nuestra aplicación para ver un reporte detallado.
`;
}
