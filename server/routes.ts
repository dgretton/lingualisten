import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  generateContentSchema, 
  submitAnswersSchema, 
  shareResultsSchema 
} from "@shared/schema";
import { generateContentAndQuestions } from "./services/openai";
import { generateTTS } from "./services/tts";
import { sendAssessmentEmail, isEmailAvailable } from "./services/email";
import { sendAssessmentSMS, isSmsAvailable } from "./services/sms";
import { translateSpanishToEnglish } from "./services/openai";

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
      
      // Generate content and questions with OpenAI
      const generatedContent = await generateContentAndQuestions(prompt);
      
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

  return httpServer;
}
