import { apiRequest } from "./queryClient";

export interface GenerateContentRequest {
  prompt: string;
  userName: string;
}

export interface GenerateContentResponse {
  topicId: number;
  content: string;
  audioUrl: string;
  questions: Question[];
}

export interface Question {
  id: number;
  question: string;
  options: string[];
}

export interface SubmitAnswersRequest {
  topicId: number;
  userName: string;
  answers: {
    questionId: number;
    selectedOption: number;
  }[];
}

export interface SubmitAnswersResponse {
  assessmentId: number;
  userName: string;
  score: number;
  totalQuestions: number;
  answers: {
    questionId: number;
    selectedOption: number;
    isCorrect: boolean;
  }[];
}

export interface ShareResultsRequest {
  assessmentId: number;
  contactMethod: 'email' | 'sms';
  contactInfo: string;
}

export async function generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
  const res = await apiRequest('POST', '/api/generate-content', request);
  return await res.json();
}

export async function processVoiceInput(text: string): Promise<{ text: string }> {
  const res = await apiRequest('POST', '/api/process-voice', { text });
  return await res.json();
}

export async function submitAnswers(request: SubmitAnswersRequest): Promise<SubmitAnswersResponse> {
  const res = await apiRequest('POST', '/api/submit-answers', request);
  return await res.json();
}

export async function shareResults(request: ShareResultsRequest): Promise<{ success: boolean; message: string }> {
  const res = await apiRequest('POST', '/api/share-results', request);
  return await res.json();
}
