import { Assessment } from '@shared/schema';
import { storage } from '../storage';

// Lazy-load nodemailer to avoid errors if the package isn't available
let nodemailer: any;
let transporter: any = null;

/**
 * Check if email functionality is available
 * This allows us to conditionally show email options in the UI
 */
export function isEmailAvailable(): boolean {
  try {
    // Try to load nodemailer and check required environment variables
    if (!nodemailer) {
      nodemailer = require('nodemailer');
    }
    return true;
  } catch (e) {
    console.log('Email functionality is disabled: Nodemailer may not be installed');
    return false;
  }
}

/**
 * Initialize nodemailer transporter if not already initialized
 * This is called only when attempting to send an email
 */
function initEmailTransporter(): boolean {
  try {
    if (!nodemailer) {
      nodemailer = require('nodemailer');
    }
    
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      });
    }
    
    return !!transporter;
  } catch (e) {
    console.error('Failed to initialize nodemailer:', e);
    return false;
  }
}

export async function sendAssessmentEmail(
  assessmentId: number, 
  email: string
): Promise<boolean> {
  try {
    // Check if email is available and initialize if needed
    if (!isEmailAvailable() || !initEmailTransporter()) {
      console.error('Email functionality not available: Nodemailer may not be installed');
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

    const questions = await storage.getQuestionsByTopicId(assessment.topicId);
    
    // Generate assessment report
    const emailContent = generateAssessmentEmail(assessment, topic.prompt, questions);

    // Send the email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"LinguaListen" <no-reply@lingualisten.com>',
      to: email,
      subject: `Tu Reporte de LinguaListen - ${assessment.score}/${assessment.totalQuestions} Preguntas Correctas`,
      html: emailContent,
    });

    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending assessment email:', error);
    return false;
  }
}

function generateAssessmentEmail(
  assessment: Assessment, 
  topicPrompt: string,
  questions: any[]
): string {
  const percentScore = Math.round((assessment.score / assessment.totalQuestions) * 100);
  
  // Generate answers section
  const answersHtml = assessment.answers.map((answer, index) => {
    const question = questions.find(q => q.id === answer.questionId);
    if (!question) return '';
    
    const isCorrect = answer.isCorrect;
    const icon = isCorrect ? '✅' : '❌';
    const color = isCorrect ? '#10b981' : '#ef4444';
    
    const selectedOption = question.options[answer.selectedOption];
    const correctOption = isCorrect ? selectedOption : question.options[question.correctOption];
    
    return `
      <div style="margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px;">
        <p style="font-weight: 500; margin-bottom: 5px;">${index + 1}. ${question.question}</p>
        <div style="display: flex; align-items: center; margin-top: 5px;">
          <span style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; background-color: ${isCorrect ? '#d1fae5' : '#fee2e2'}; color: ${color}; text-align: center; margin-right: 8px;">${icon}</span>
          <p style="color: ${color};">Tu respuesta: ${selectedOption}</p>
        </div>
        ${!isCorrect ? `<div style="margin-left: 28px; margin-top: 5px;"><p style="color: #6b7280;">Respuesta correcta: ${correctOption}</p></div>` : ''}
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; color: #1f2937; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .score-card { background-color: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .progress-bar { height: 10px; background-color: #e5e7eb; border-radius: 5px; margin: 15px 0; }
        .progress-fill { height: 100%; border-radius: 5px; background-color: #0f766e; width: ${percentScore}%; }
        .answers-card { background-color: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        h1 { color: #0f766e; font-size: 24px; }
        h2 { color: #1f2937; font-size: 18px; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>LinguaListen</h1>
          <p>Reporte de Comprensión Auditiva en Inglés</p>
        </div>
        
        <p>Hola ${assessment.userName},</p>
        <p>Aquí está tu reporte de evaluación para el tema: <strong>${topicPrompt}</strong></p>
        
        <div class="score-card">
          <h2>Resumen de Puntuación</h2>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span>Puntuación Total</span>
            <span style="font-size: 20px; font-weight: bold; color: #0f766e;">${assessment.score}/${assessment.totalQuestions}</span>
          </div>
          
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          
          <div style="display: flex; justify-content: space-between; font-size: 14px; color: #6b7280;">
            <span>0 correctas</span>
            <span>${assessment.totalQuestions} preguntas</span>
          </div>
        </div>
        
        <div class="answers-card">
          <h2>Detalle de Respuestas</h2>
          ${answersHtml}
        </div>
        
        <p>Sigue practicando para mejorar tu comprensión auditiva en inglés. ¡Puedes hacerlo!</p>
        <p>El equipo de LinguaListen</p>
      </div>
    </body>
    </html>
  `;
}
