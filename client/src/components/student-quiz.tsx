import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface QuizQuestion {
  audio: string;
  options: string[];
  correctIndex: number;
}

// Re-using the Spring Landscaping quiz content from your HTML
const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    audio: "Cut back the branches.",
    options: [
      "Riegue las plantas.",
      "Pode las ramas.",
      "Plante los arbustos.",
      "Mueva los árboles."
    ],
    correctIndex: 1
  },
  {
    audio: "Did you rake the beds?",
    options: [
      "¿Rastrillaste las camas?",
      "¿Cortaste las plantas?",
      "¿Regaste las flores?",
      "¿Plantaste las semillas?"
    ],
    correctIndex: 0
  },
  {
    audio: "We need more mulch.",
    options: [
      "Necesitamos más agua.",
      "Necesitamos más herramientas.",
      "Necesitamos más mantillo.",
      "Necesitamos más plantas."
    ],
    correctIndex: 2
  },
  {
    audio: "Where are the leaf bags?",
    options: [
      "¿Dónde están las tijeras?",
      "¿Dónde están las bolsas para hojas?",
      "¿Dónde están los rastrillos?",
      "¿Dónde están los guantes?"
    ],
    correctIndex: 1
  },
  {
    audio: "Take out the dead plants.",
    options: [
      "Quite las plantas muertas.",
      "Riegue las plantas secas.",
      "Mueva las plantas viejas.",
      "Corte las plantas altas."
    ],
    correctIndex: 0
  },
  {
    audio: "Clean up the walkway.",
    options: [
      "Limpie la casa.",
      "Limpie el garaje.",
      "Limpie el camino.",
      "Limpie el patio."
    ],
    correctIndex: 2
  },
  {
    audio: "Can you finish by noon?",
    options: [
      "¿Puedes empezar mañana?",
      "¿Puedes terminar al mediodía?",
      "¿Puedes trabajar esta tarde?",
      "¿Puedes venir temprano?"
    ],
    correctIndex: 1
  },
  {
    audio: "Trim the hedge straight.",
    options: [
      "Corte el césped alto.",
      "Plante el arbusto nuevo.",
      "Riegue el jardín entero.",
      "Pode el seto recto."
    ],
    correctIndex: 3
  },
  {
    audio: "Bring the wheelbarrow here.",
    options: [
      "Traiga el rastrillo aquí.",
      "Traiga la carretilla aquí.",
      "Traiga las tijeras aquí.",
      "Traiga la manguera aquí."
    ],
    correctIndex: 1
  },
  {
    audio: "Use the blower for leaves.",
    options: [
      "Use el cortacésped para el pasto.",
      "Use la pala para la tierra.",
      "Use el soplador para las hojas.",
      "Use el rastrillo para los escombros."
    ],
    correctIndex: 2
  }
];

interface StudentAnswer {
  questionIndex: number;
  selectedOptionIndex: number;
  isCorrect: boolean;
}

export function StudentQuiz() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [englishVoice, setEnglishVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voiceError, setVoiceError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { toast } = useToast();

  // Current question
  const currentQuestion = QUIZ_QUESTIONS[currentQuestionIndex];
  
  // Score calculation
  const correctAnswersCount = answers.filter(a => a.isCorrect).length;

  // Handle speech synthesis voices
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
      
      // This event fires when the voices are ready/changed
      window.speechSynthesis.onvoiceschanged = initVoices;
      
      // Clean up
      return () => {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      };
    } else {
      setVoiceError(true);
    }
  }, []);

  // Initialize from localStorage when component mounts
  useEffect(() => {
    const savedState = localStorage.getItem('quizState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setCurrentQuestionIndex(state.currentQuestionIndex || 0);
        setAnswers(state.answers || []);
        setQuizCompleted(state.quizCompleted || false);
        setStudentName(state.studentName || "");
        
        // Set selected option and revealed state if we have an answer for current question
        const currentAnswer = state.answers?.find(
          (a: StudentAnswer) => a.questionIndex === state.currentQuestionIndex
        );
        if (currentAnswer) {
          setSelectedOption(currentAnswer.selectedOptionIndex);
          setIsAnswerRevealed(true);
        }
        
        if (state.answers?.length > 0) {
          toast({
            title: "Sesión anterior cargada",
            description: "Continuando desde tu sesión anterior. Tus respuestas han sido guardadas.",
          });
        }
      } catch (e) {
        console.error('Error loading saved state:', e);
      }
    }
  }, [toast]);

  // Save state to localStorage when it changes
  useEffect(() => {
    const state = {
      currentQuestionIndex,
      answers,
      quizCompleted,
      studentName
    };
    localStorage.setItem('quizState', JSON.stringify(state));
  }, [currentQuestionIndex, answers, quizCompleted, studentName]);

  // Speak the current question's audio text
  const speakText = (text: string) => {
    if (voiceError || !window.speechSynthesis) {
      toast({
        title: "Error",
        description: "Text-to-speech no disponible. Por favor, asegúrate de que tu navegador tiene instalado el idioma inglés.",
        variant: "destructive"
      });
      return;
    }
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Explicitly set language to English
    utterance.lang = 'en-US';
    
    // Use a specific English voice if available
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    
    // Slow down slightly for learning
    utterance.rate = 0.85;
    
    window.speechSynthesis.speak(utterance);
  };

  // Handle option selection
  const handleOptionClick = (optionIndex: number) => {
    if (isAnswerRevealed) return;
    
    const isCorrect = optionIndex === currentQuestion.correctIndex;
    setSelectedOption(optionIndex);
    setIsAnswerRevealed(true);
    
    // Add to answers
    setAnswers(prev => [
      ...prev.filter(a => a.questionIndex !== currentQuestionIndex),
      {
        questionIndex: currentQuestionIndex,
        selectedOptionIndex: optionIndex,
        isCorrect
      }
    ]);
  };

  // Move to next question
  const handleNextQuestion = () => {
    // Check if name is entered on first question
    if (currentQuestionIndex === 0 && !studentName) {
      toast({
        title: "Campo requerido",
        description: "Por favor, escribe tu nombre antes de continuar.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if answer is selected
    if (!isAnswerRevealed) {
      toast({
        title: "Respuesta requerida",
        description: "Por favor, selecciona una respuesta antes de continuar.",
        variant: "destructive"
      });
      return;
    }
    
    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      
      // Removed auto-speak for next question
    } else {
      // Quiz completed
      setQuizCompleted(true);
    }
  };

  // Reset the quiz
  const handleReset = () => {
    if (window.confirm('¿Estás seguro que quieres borrar todas tus respuestas y comenzar de nuevo?')) {
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setQuizCompleted(false);
      
      // Clear localStorage
      localStorage.removeItem('quizState');
      
      toast({
        title: "Quiz reiniciado",
        description: "Se han borrado todos los datos guardados."
      });
      
      // Removed auto-speak of first question
    }
  };

  // Send results by email (just a simulation)
  const handleSendEmail = (email: string) => {
    if (!email) {
      toast({
        title: "Email requerido",
        description: "Por favor, ingresa una dirección de correo electrónico válida.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Resultados enviados",
      description: `Los resultados han sido enviados a ${email}.`
    });
  };

  // Send results by SMS (just a simulation)
  const handleSendSMS = (phone: string) => {
    if (!phone) {
      toast({
        title: "Teléfono requerido",
        description: "Por favor, ingresa un número de teléfono válido.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Resultados enviados",
      description: `Los resultados han sido enviados al número ${phone}.`
    });
  };

  // Remove auto-speech on component mount
  // We'll only speak when the user clicks the Escuchar button

  if (quizCompleted) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <a 
            href="/" 
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path>
            </svg>
            Volver a la página de inicio
          </a>
        </div>
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">Resumen de la Prueba</h2>
          
          <div className="mb-4">
            <p className="text-lg mb-4">¡Has completado la prueba!</p>
            <p className="font-semibold text-lg">
              Tu puntuación: {correctAnswersCount} de {QUIZ_QUESTIONS.length}
            </p>
          </div>
          
          <div className="space-y-4 mb-6">
            <h3 className="font-bold">Detalles:</h3>
            
            {answers.map((answer, i) => {
              const question = QUIZ_QUESTIONS[answer.questionIndex];
              return (
                <div key={i} className="border-b pb-2">
                  <div className="font-medium mb-2">
                    Pregunta {answer.questionIndex + 1}:
                  </div>
                  <button 
                    onClick={() => speakText(question.audio)}
                    className="w-full flex items-center p-2 mb-2 border rounded border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 mr-2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </svg>
                    <span className="font-bold text-left text-blue-800">{question.audio}</span>
                  </button>
                  {answer.isCorrect ? (
                    <div className="ml-4 text-green-600">
                      Correcta: {question.options[question.correctIndex]} ✓
                    </div>
                  ) : (
                    <>
                      <div className="ml-4 text-green-600">
                        Correcta: {question.options[question.correctIndex]}
                      </div>
                      <div className="ml-4 text-red-600">
                        Tu respuesta: {question.options[answer.selectedOptionIndex]} ✗
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-bold mb-3">Enviar resultados:</h3>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
              <div>
                <Label htmlFor="email-input" className="mb-2 block">
                  Por correo electrónico:
                </Label>
                <div className="flex">
                  <Input
                    id="email-input"
                    type="email"
                    placeholder="tu@email.com"
                    className="rounded-r-none"
                  />
                  <Button 
                    onClick={() => handleSendEmail((document.getElementById('email-input') as HTMLInputElement)?.value || '')}
                    className="rounded-l-none"
                  >
                    Enviar
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="phone-input" className="mb-2 block">
                  Por mensaje de texto:
                </Label>
                <div className="flex">
                  <Input
                    id="phone-input"
                    type="tel"
                    placeholder="Tu número de teléfono"
                    className="rounded-r-none"
                  />
                  <Button 
                    onClick={() => handleSendSMS((document.getElementById('phone-input') as HTMLInputElement)?.value || '')}
                    className="rounded-l-none"
                  >
                    Enviar
                  </Button>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleReset}
              variant="destructive"
              className="w-full"
            >
              Comenzar de nuevo / Borrar todo
            </Button>
            <p className="text-sm text-gray-500 mt-2 text-center">
              Esto borrará todas tus respuestas y reiniciará el quiz
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <a 
            href="/" 
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path>
            </svg>
            Volver
          </a>
          <h1 className="text-2xl font-bold">Spring Landscaping Quiz</h1>
        </div>
        <div className="text-lg font-semibold">
          {correctAnswersCount}/{currentQuestionIndex + 1}
        </div>
      </div>
      
      <div className="mb-6">
        <Label htmlFor="student-name" className="block text-gray-700 font-bold mb-2">
          Nombre:
        </Label>
        <Input
          id="student-name"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Escribe tu nombre aquí"
          required
        />
      </div>
      
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <p className="text-blue-800">
          <strong>Instrucciones:</strong>
        </p>
        <ol className="text-blue-800 mt-1 list-decimal pl-5">
          <li>Haz clic en el texto en inglés con el ícono de audio para escucharlo</li>
          <li>Selecciona la traducción española correcta entre las opciones</li>
        </ol>
      </div>
      
      <Card className="overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex justify-between items-center mb-3">
            <div className="font-semibold">Pregunta {currentQuestionIndex + 1}</div>
          </div>
          <button 
            onClick={() => speakText(currentQuestion.audio)}
            className="w-full flex items-center p-3 border rounded border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 mr-3">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
            <span className="font-bold text-left text-blue-800">{currentQuestion.audio}</span>
          </button>
        </div>
        
        <div className="p-4">
          <div className="space-y-2">
            {currentQuestion.options.map((option, i) => {
              const isCorrect = i === currentQuestion.correctIndex;
              const isSelected = selectedOption === i;
              
              let optionClassName = "w-full text-left p-3 border rounded";
              
              if (isAnswerRevealed) {
                if (isCorrect) {
                  optionClassName += " bg-green-50 border-green-400 font-semibold";
                } else if (isSelected) {
                  optionClassName += " bg-red-50 border-red-400 line-through";
                }
              }
              
              if (isSelected) {
                optionClassName += " border-2 border-blue-500";
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
      
      <div className="flex justify-between items-center">
        <div className="text-gray-600">
          {correctAnswersCount} correctas de {currentQuestionIndex + 1} preguntas
        </div>
        <Button onClick={handleNextQuestion} disabled={!isAnswerRevealed}>
          {currentQuestionIndex === QUIZ_QUESTIONS.length - 1 ? "Finalizar" : "Siguiente"}
        </Button>
      </div>
      
      {/* Hidden audio element for browsers that don't support SpeechSynthesis */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}