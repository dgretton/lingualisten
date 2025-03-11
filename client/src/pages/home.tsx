import { useState } from "react";
import { useMultiStepForm } from "@/hooks/use-multi-step-form";
import { TopicInputStep } from "@/components/topic-input-step";
import { ListeningExerciseStep } from "@/components/listening-exercise-step";
import { QuizStep, QuizQuestion } from "@/components/quiz-step";
import { ResultsStep, QuizResult } from "@/components/results-step";
import { ProgressTracker } from "@/components/progress-tracker";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { generateContent, submitAnswers } from "@/lib/api";

const STEPS = [
  { id: 1, label: "Tema" },
  { id: 2, label: "Escuchar" },
  { id: 3, label: "Responder" },
  { id: 4, label: "Resultados" },
];

export default function Home() {
  const { toast } = useToast();
  const [userName, setUserName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState<{
    topicId: number;
    content: string;
    audioUrl: string;
    questions: QuizQuestion[];
  } | null>(null);
  const [questionMap, setQuestionMap] = useState<Record<number, { question: string; options: string[] }>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  
  const { currentStep, goToStep, nextStep, prevStep, reset, progress } = useMultiStepForm(STEPS.length);
  
  // Mutation for generating content
  const generateContentMutation = useMutation({
    mutationFn: generateContent,
    onSuccess: (data) => {
      setGeneratedContent(data);
      
      // Create a map of questions for easier access later
      const questionMapData: Record<number, { question: string; options: string[] }> = {};
      data.questions.forEach(question => {
        questionMapData[question.id] = {
          question: question.question,
          options: question.options,
        };
      });
      setQuestionMap(questionMapData);
      
      nextStep();
    },
    onError: (error) => {
      console.error("Error generating content:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el contenido. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for submitting answers
  const submitAnswersMutation = useMutation({
    mutationFn: submitAnswers,
    onSuccess: (data) => {
      setQuizResult(data);
      nextStep();
    },
    onError: (error) => {
      console.error("Error submitting answers:", error);
      toast({
        title: "Error",
        description: "No se pudieron enviar tus respuestas. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    },
  });
  
  const handleTopicSubmit = (values: { userName: string; topicText: string }) => {
    setUserName(values.userName);
    setPrompt(values.topicText);
    
    generateContentMutation.mutate({
      prompt: values.topicText,
      userName: values.userName,
    });
  };
  
  const handleQuizSubmit = (answers: { questionId: number; selectedOption: number }[]) => {
    if (!generatedContent) return;
    
    submitAnswersMutation.mutate({
      topicId: generatedContent.topicId,
      userName,
      answers,
    });
  };
  
  const handleReset = () => {
    setUserName("");
    setPrompt("");
    setGeneratedContent(null);
    setQuizResult(null);
    reset();
  };
  
  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700 mb-2">LinguaListen</h1>
          <p className="text-slate-600">Mejora tu comprensión auditiva en inglés con práctica personalizada</p>
        </header>
        
        {/* Multi-step Form */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Progress Tracker */}
          <ProgressTracker
            currentStep={currentStep}
            steps={STEPS}
            visitedSteps={progress}
          />
          
          {/* Step Content Area */}
          <div className="p-6">
            {/* Step 1: Topic Input */}
            {currentStep === 1 && (
              <TopicInputStep onSubmit={handleTopicSubmit} />
            )}
            
            {/* Step 2: Listening Exercise */}
            {currentStep === 2 && generatedContent && (
              <ListeningExerciseStep
                title={prompt}
                audioUrl={generatedContent.audioUrl}
                onContinue={nextStep}
                onBack={prevStep}
              />
            )}
            
            {/* Step 3: Answer Questions */}
            {currentStep === 3 && generatedContent && (
              <QuizStep
                questions={generatedContent.questions}
                onSubmit={handleQuizSubmit}
                onBack={prevStep}
              />
            )}
            
            {/* Step 4: Results */}
            {currentStep === 4 && quizResult && (
              <ResultsStep
                result={quizResult}
                questionTexts={questionMap}
                onReset={handleReset}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
