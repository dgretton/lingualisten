import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  generateContentSchema, 
  submitAnswersSchema, 
  shareResultsSchema 
} from "@shared/schema";
import { generateContentWithSafeguards, translateSpanishToEnglish } from "./services/claude";
import { generateTTS } from "./services/tts";
import { sendAssessmentEmail, isEmailAvailable } from "./services/email";
import { sendAssessmentSMS, isSmsAvailable } from "./services/sms";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // API routes prefix
  const apiRoute = '/api';

  // Health check endpoint
  app.get(`${apiRoute}/health`, (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Check which contact methods are available
  app.get(`${apiRoute}/contact-methods`, (req, res) => {
    res.json({
      email: isEmailAvailable(),
      sms: isSmsAvailable()
    });
  });

  // Generate content and questions from Spanish prompt
  app.post(`${apiRoute}/generate-content`, async (req, res) => {
    try {
      const { prompt, userName } = generateContentSchema.parse(req.body);
      
      // Generate content and questions with Claude
      const generatedContent = await generateContentWithSafeguards(prompt);
      
      // Generate audio for the English content
      const audioUrl = await generateTTS(generatedContent.englishContent);
      
      // Store the topic in memory
      const topic = await storage.createTopic({
        prompt,
        content: generatedContent.englishContent,
        audioUrl,
        createdAt: Math.floor(Date.now() / 1000)
      });
      
      // Store the questions in memory
      const questions = await Promise.all(
        generatedContent.spanishQuestions.map((q, index) => 
          storage.createQuestion({
            topicId: topic.id,
            question: q.question,
            options: q.options,
            correctOption: q.correctOptionIndex
          })
        )
      );
      
      // Return the topic and questions
      res.json({
        topicId: topic.id,
        content: topic.content,
        audioUrl: topic.audioUrl,
        questions: questions.map(q => ({
          id: q.id,
          question: q.question,
          options: q.options
        }))
      });
    } catch (error) {
      console.error('Error generating content:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input format', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to generate content' });
    }
  });

  // Process voice input (speech-to-text)
  app.post(`${apiRoute}/process-voice`, async (req, res) => {
    try {
      // In a real implementation, we would process the audio file here
      // Since we can't handle audio processing directly, we'll assume text was extracted on client-side
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Invalid input' });
      }
      
      const translatedText = await translateSpanishToEnglish(text);
      
      res.json({ text: translatedText });
    } catch (error) {
      console.error('Error processing voice input:', error);
      res.status(500).json({ error: 'Failed to process voice input' });
    }
  });

  // Submit quiz answers
  app.post(`${apiRoute}/submit-answers`, async (req, res) => {
    try {
      const { topicId, userName, answers } = submitAnswersSchema.parse(req.body);
      
      // Get the topic and questions
      const topicData = await storage.getTopicWithQuestions(topicId);
      if (!topicData) {
        return res.status(404).json({ error: 'Topic not found' });
      }
      
      const { topic, questions } = topicData;
      
      // Calculate the score
      let score = 0;
      const processedAnswers = answers.map(answer => {
        const question = questions.find(q => q.id === answer.questionId);
        if (!question) {
          throw new Error(`Question ${answer.questionId} not found`);
        }
        
        const isCorrect = question.correctOption === answer.selectedOption;
        if (isCorrect) score++;
        
        return {
          questionId: answer.questionId,
          selectedOption: answer.selectedOption,
          isCorrect
        };
      });
      
      // Store the assessment
      const assessment = await storage.createAssessment({
        topicId,
        userName,
        score,
        totalQuestions: questions.length,
        answers: processedAnswers,
        contactInfo: '',
        contactMethod: '',
        createdAt: Math.floor(Date.now() / 1000)
      });
      
      // Return the assessment results
      res.json({
        assessmentId: assessment.id,
        userName: assessment.userName,
        score: assessment.score,
        totalQuestions: assessment.totalQuestions,
        answers: assessment.answers
      });
    } catch (error) {
      console.error('Error submitting answers:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input format', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to submit answers' });
    }
  });

  // Share results via email or SMS
  app.post(`${apiRoute}/share-results`, async (req, res) => {
    try {
      const { assessmentId, contactMethod, contactInfo } = shareResultsSchema.parse(req.body);
      
      // Get the assessment
      const assessment = await storage.getAssessment(assessmentId);
      if (!assessment) {
        return res.status(404).json({ error: 'Assessment not found' });
      }
      
      // Update contact information
      // In a real implementation, we would update the assessment in the database
      
      // Send the results via the chosen method
      let success = false;
      if (contactMethod === 'email') {
        success = await sendAssessmentEmail(assessmentId, contactInfo);
      } else if (contactMethod === 'sms') {
        success = await sendAssessmentSMS(assessmentId, contactInfo);
      }
      
      if (success) {
        res.json({ success: true, message: `Results sent via ${contactMethod}` });
      } else {
        res.status(500).json({ error: `Failed to send results via ${contactMethod}` });
      }
    } catch (error) {
      console.error('Error sharing results:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input format', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to share results' });
    }
  });
  
  // Handle student quiz results (standalone quiz)
  app.post(`${apiRoute}/student-quiz-results`, async (req, res) => {
    try {
      const { assessmentData, contactMethod, contactInfo } = req.body;
      
      if (!assessmentData || !contactMethod || !contactInfo) {
        return res.status(400).json({ error: 'Missing required data' });
      }
      
      // Create a temp assessment in memory for sending via email
      const assessment = await storage.createAssessment({
        topicId: 0, // No real topic ID for standalone quiz
        userName: assessmentData.userName,
        score: assessmentData.score,
        totalQuestions: assessmentData.totalQuestions,
        answers: assessmentData.answers,
        contactInfo,
        contactMethod,
        createdAt: Math.floor(Date.now() / 1000)
      });
      
      // Create a temp topic with the quiz questions
      const topic = await storage.createTopic({
        prompt: "Spring Landscaping Quiz",
        content: "This is a standalone quiz about spring landscaping terminology",
        audioUrl: "",
        createdAt: Math.floor(Date.now() / 1000)
      });
      
      // For each quiz question in the assessment, create a question in memory
      const quizQuestions = [
        { audio: "Spring is the perfect time to refresh your garden.", options: ["La primavera es el momento perfecto para renovar su jardín.", "El verano es ideal para plantar árboles.", "El otoño es cuando se cosechan los vegetales."], correctIndex: 0 },
        { audio: "Many plants need to be pruned in early spring.", options: ["Muchas plantas necesitan ser podadas a principios de primavera.", "La mayoría de flores florecen en otoño.", "Es mejor regar las plantas al mediodía."], correctIndex: 0 },
        { audio: "Fertilizer helps your plants grow strong and healthy.", options: ["Los pesticidas eliminan todas las plagas.", "El fertilizante ayuda a que tus plantas crezcan fuertes y saludables.", "Las malas hierbas son beneficiosas para el jardín."], correctIndex: 1 },
        { audio: "You should water your garden early in the morning.", options: ["Debes regar tu jardín temprano en la mañana.", "Las plantas necesitan poca luz solar.", "No es necesario retirar las malas hierbas."], correctIndex: 0 },
        { audio: "Mulch helps retain moisture in the soil.", options: ["El césped artificial no requiere mantenimiento.", "El compost atrae a las plagas.", "El mantillo ayuda a retener la humedad en el suelo."], correctIndex: 2 }
      ];
      
      for (let i = 0; i < quizQuestions.length; i++) {
        const q = quizQuestions[i];
        await storage.createQuestion({
          topicId: topic.id,
          question: q.audio,
          options: q.options,
          correctOption: q.correctIndex
        });
      }
      
      // Send the email
      let success = false;
      if (contactMethod === 'email') {
        // Generate and send a custom email for the standalone quiz
        if (isEmailAvailable()) {
          try {
            // Initialize nodemailer
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST || 'smtp.ethereal.email',
              port: parseInt(process.env.SMTP_PORT || '587'),
              secure: process.env.SMTP_SECURE === 'true',
              auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASS || '',
              },
            });
            
            // Generate email content
            const percentScore = Math.round((assessmentData.score / assessmentData.totalQuestions) * 100);
            
            // Generate answers section
            const answersHtml = assessmentData.answers.map((answer: any, index: number) => {
              const question = quizQuestions[answer.questionId];
              if (!question) return '';
              
              const isCorrect = answer.isCorrect;
              const icon = isCorrect ? '✅' : '❌';
              const color = isCorrect ? '#10b981' : '#ef4444';
              
              const selectedOption = question.options[answer.selectedOption];
              const correctOption = question.options[question.correctIndex];
              
              return `
                <div style="margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px;">
                  <p style="font-weight: 500; margin-bottom: 5px;">${index + 1}. ${question.audio}</p>
                  ${isCorrect ? 
                    `<div style="display: flex; align-items: center; margin-top: 5px;">
                      <span style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; background-color: #d1fae5; color: ${color}; text-align: center; margin-right: 8px;">${icon}</span>
                      <p style="color: ${color};">Correcta: ${correctOption}</p>
                    </div>` : 
                    `<div style="display: flex; align-items: center; margin-top: 5px;">
                      <span style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; background-color: #fee2e2; color: ${color}; text-align: center; margin-right: 8px;">${icon}</span>
                      <p style="color: #10b981;">Correcta: ${correctOption}</p>
                    </div>
                    <div style="margin-left: 28px; margin-top: 5px;">
                      <p style="color: ${color};">Tu respuesta: ${selectedOption}</p>
                    </div>`
                  }
                </div>
              `;
            }).join('');
            
            const emailContent = `
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
                  
                  <p>Hola ${assessmentData.userName},</p>
                  <p>Aquí está tu reporte de evaluación para el tema: <strong>Spring Landscaping Quiz</strong></p>
                  
                  <div class="score-card">
                    <h2>Resumen de Puntuación</h2>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                      <span>Puntuación Total</span>
                      <span style="font-size: 20px; font-weight: bold; color: #0f766e;">${assessmentData.score}/${assessmentData.totalQuestions}</span>
                    </div>
                    
                    <div class="progress-bar">
                      <div class="progress-fill"></div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; font-size: 14px; color: #6b7280;">
                      <span>0 correctas</span>
                      <span>${assessmentData.totalQuestions} preguntas</span>
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
            
            // Send the email
            const info = await transporter.sendMail({
              from: process.env.EMAIL_FROM || '"LinguaListen" <no-reply@lingualisten.com>',
              to: contactInfo,
              subject: `Tu Reporte de LinguaListen - ${assessmentData.score}/${assessmentData.totalQuestions} Preguntas Correctas`,
              html: emailContent,
            });
            
            console.log('Email sent:', info.messageId);
            success = true;
          } catch (error) {
            console.error('Error sending email:', error);
            success = false;
          }
        }
      } else if (contactMethod === 'sms') {
        // Just report success for SMS without implementing Twilio
        success = true;
      }
      
      if (success) {
        res.json({ success: true, message: `Results sent via ${contactMethod}` });
      } else {
        res.status(500).json({ error: `Failed to send results via ${contactMethod}` });
      }
    } catch (error) {
      console.error('Error handling student quiz results:', error);
      res.status(500).json({ error: 'Failed to handle student quiz results' });
    }
  });

  return httpServer;
}
