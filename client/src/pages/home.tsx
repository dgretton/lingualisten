import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { generateContent, submitAnswers } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctOption: number;
}

interface Answer {
  questionId: number;
  selectedOptionIndex: number;
  isCorrect: boolean;
  question?: string;
  selectedAnswer?: string;
  correctAnswer?: string;
}

export default function Home() {
  const { toast } = useToast();
  
  // App state
  const [currentStep, setCurrentStep] = useState<'setup' | 'quiz' | 'results'>('setup');
  const [topic, setTopic] = useState("");
  
  // Quiz state
  const [topicId, setTopicId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionMap, setQuestionMap] = useState<Record<number, { question: string; options: string[]; correctOption: number }>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [englishVoice, setEnglishVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voiceError, setVoiceError] = useState(false);
  
  // Results state
  const [finalResult, setFinalResult] = useState<any>(null);

  // Initialize voices for speech synthesis
  useEffect(() => {
    function initVoices() {
      if (!window.speechSynthesis) {
        setVoiceError(true);
        return;
      }
      
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang === 'en-US') || 
                  voices.find(v => v.lang.startsWith('en'));
      
      if (voice) {
        setEnglishVoice(voice);
        setVoiceError(false);
      } else {
        setVoiceError(true);
      }
    }

    if (window.speechSynthesis) {
      if (window.speechSynthesis.getVoices().length > 0) {
        initVoices();
      }
      window.speechSynthesis.onvoiceschanged = initVoices;
      
      return () => {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      };
    } else {
      setVoiceError(true);
    }
  }, []);
  
  // Get current question
  const currentQuestion = questions[currentQuestionIndex];
  const correctAnswersCount = answers.filter(a => a.isCorrect).length;

  // Mutations
  const generateContentMutation = useMutation({
    mutationFn: generateContent,
    onSuccess: (data) => {
      setTopicId(data.topicId);
      setQuestions(data.questions);
      
      // Create a map of questions for easier access later
      const questionMapData: Record<number, { question: string; options: string[]; correctOption: number }> = {};
      data.questions.forEach(question => {
        questionMapData[question.id] = {
          question: question.question,
          options: question.options,
          correctOption: question.correctOption // Use the correct answer from the API
        };
      });
      setQuestionMap(questionMapData);
      
      setCurrentStep('quiz');
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
  
  const submitAnswersMutation = useMutation({
    mutationFn: submitAnswers,
    onSuccess: (data) => {
      setFinalResult(data);
      setCurrentStep('results');
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

  // Speech synthesis
  const speakText = (text: string) => {
    if (voiceError || !window.speechSynthesis) {
      toast({
        title: "Error",
        description: "Text-to-speech no disponible. Asegúrate de que tu navegador tiene instalado el idioma inglés.",
        variant: "destructive"
      });
      return;
    }
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    utterance.rate = 0.85; // Slower for learning
    window.speechSynthesis.speak(utterance);
  };

  // Handle topic submission
  const handleTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast({
        title: "Campo requerido",
        description: "Por favor, ingresa un tema.",
        variant: "destructive"
      });
      return;
    }
    
    generateContentMutation.mutate({
      prompt: topic,
      userName: "Usuario"
    });
  };

  // Handle option selection
  const handleOptionClick = (optionIndex: number) => {
    if (isAnswerRevealed) return;
    
    const questionData = questionMap[currentQuestion.id];
    const isCorrect = questionData && optionIndex === questionData.correctOption;
    
    setSelectedOption(optionIndex);
    setIsAnswerRevealed(true);
    
    // Add to answers
    setAnswers(prev => [
      ...prev.filter(a => a.questionId !== currentQuestion.id),
      {
        questionId: currentQuestion.id,
        selectedOptionIndex: optionIndex,
        isCorrect,
        question: currentQuestion.question,
        selectedAnswer: currentQuestion.options[optionIndex],
        correctAnswer: questionData ? questionData.options[questionData.correctOption] : "Unknown"
      }
    ]);
  };

  // Move to next question or finish quiz
  const handleNextQuestion = () => {
    if (!isAnswerRevealed) {
      toast({
        title: "Respuesta requerida",
        description: "Por favor, selecciona una respuesta antes de continuar.",
        variant: "destructive"
      });
      return;
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    } else {
      // Quiz completed - submit answers
      if (topicId) {
        submitAnswersMutation.mutate({
          topicId,
          userName: "Usuario",
          answers: answers.map(a => ({
            questionId: a.questionId,
            selectedOption: a.selectedOptionIndex
          }))
        });
      }
    }
  };

  // Reset quiz
  const handleReset = () => {
    setCurrentStep('setup');
    setTopic("");
    setTopicId(null);
    setQuestions([]);
    setQuestionMap({});
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setAnswers([]);
    setFinalResult(null);
  };

  // Setup Step
  if (currentStep === 'setup') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">LinguaListen</h1>
            <p className="text-slate-600">Mejora tu comprensión auditiva en inglés</p>
          </div>
          
          <Card className="p-6">
            <form onSubmit={handleTopicSubmit} className="space-y-4">
              <div>
                <Label htmlFor="topic" className="text-sm font-medium text-slate-700">
                  ¿Sobre qué tema quieres practicar?
                </Label>
                <Textarea
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ejemplo: Conversaciones en restaurantes, herramientas de trabajo, entrevistas..."
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={generateContentMutation.isPending}
              >
                {generateContentMutation.isPending ? "Generando..." : "Comenzar práctica"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <a 
                href="/quiz" 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Ver ejemplo de quiz para estudiantes →
              </a>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Quiz Step
  if (currentStep === 'quiz' && currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={handleReset}
                className="text-blue-600 hover:text-blue-800"
              >
                ← Volver
              </Button>
              <h1 className="text-xl font-bold text-slate-800">Práctica de Comprensión</h1>
            </div>
            <div className="text-lg font-semibold text-slate-700">
              {correctAnswersCount}/{currentQuestionIndex + 1}
            </div>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Pregunta {currentQuestionIndex + 1}</span>
              <span>{questions.length} preguntas</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                !
              </div>
              <div>
                <p className="text-blue-800 font-medium">Instrucciones:</p>
                <ol className="text-blue-700 text-sm mt-1 list-decimal pl-5">
                  <li>Haz clic en el botón de audio para escuchar la frase en inglés</li>
                  <li>Selecciona la traducción española correcta</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Question Card */}
          <Card className="overflow-hidden mb-6">
            <div className="p-4 bg-slate-50 border-b">
              <div className="flex justify-between items-center mb-3">
                <div className="font-semibold text-slate-800">
                  Pregunta {currentQuestionIndex + 1}
                </div>
              </div>
              <button 
                onClick={() => speakText(currentQuestion.question)}
                className="w-full flex items-center p-3 border rounded border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 mr-3">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
                <span className="font-bold text-left text-blue-800">{currentQuestion.question}</span>
              </button>
            </div>
            
            <div className="p-4">
              <div className="space-y-2">
                {currentQuestion.options.map((option, i) => {
                  const questionData = questionMap[currentQuestion.id];
                  const isCorrect = questionData && i === questionData.correctOption;
                  const isSelected = selectedOption === i;
                  
                  let optionClassName = "w-full text-left p-3 border rounded transition-colors";
                  
                  if (isAnswerRevealed) {
                    if (isCorrect) {
                      optionClassName += " bg-green-50 border-green-400 font-semibold text-green-800";
                    } else if (isSelected) {
                      optionClassName += " bg-red-50 border-red-400 line-through text-red-700";
                    } else {
                      optionClassName += " bg-slate-50 border-slate-200 text-slate-500";
                    }
                  } else {
                    optionClassName += " hover:bg-slate-50 border-slate-200";
                    if (isSelected) {
                      optionClassName += " border-2 border-blue-500 bg-blue-50";
                    }
                  }
                  
                  return (
                    <button
                      key={i}
                      onClick={() => handleOptionClick(i)}
                      className={optionClassName}
                      disabled={isAnswerRevealed}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <div className="text-slate-600">
              {correctAnswersCount} correctas de {currentQuestionIndex + 1} preguntas
            </div>
            <Button 
              onClick={handleNextQuestion} 
              disabled={!isAnswerRevealed}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {currentQuestionIndex === questions.length - 1 ? "Finalizar" : "Siguiente"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Results Step
  if (currentStep === 'results' && finalResult) {
    const percentScore = Math.round((finalResult.score / finalResult.totalQuestions) * 100);
    
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <Card className="p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Excelente trabajo!</h2>
              <p className="text-slate-600">Has completado la práctica de comprensión auditiva</p>
            </div>

            <div className="bg-white rounded-lg border p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Tu puntuación</h3>
              <div className="text-4xl font-bold text-green-600 mb-2">
                {finalResult.score}/{finalResult.totalQuestions}
              </div>
              <div className="text-slate-600 mb-4">{percentScore}% correcto</div>
              
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${percentScore}%` }}
                />
              </div>
            </div>

            {/* Detailed Results */}
            <div className="bg-white rounded-lg border p-6 mb-6 text-left">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Resumen detallado</h3>
              <div className="space-y-3">
                {finalResult.answers.map((answer: any, index: number) => (
                  <div key={answer.questionId} className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                      answer.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {answer.isCorrect ? '✓' : '✗'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{answer.question}</p>
                      <p className={`text-sm ${answer.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        Tu respuesta: {answer.selectedAnswer}
                      </p>
                      {!answer.isCorrect && (
                        <p className="text-sm text-slate-600">
                          Respuesta correcta: {answer.correctAnswer}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={handleReset}
                className="px-6"
              >
                Practicar otro tema
              </Button>
              <Button
                onClick={() => window.print()}
                className="px-6 bg-blue-600 hover:bg-blue-700"
              >
                Imprimir resultados
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
