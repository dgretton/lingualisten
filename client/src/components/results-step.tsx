import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { shareResults } from "@/lib/api";
import { useContactMethods } from "@/hooks/use-contact-methods";

export interface QuizResult {
  assessmentId: number;
  userName: string;
  score: number;
  totalQuestions: number;
  answers: {
    questionId: number;
    selectedOption: number;
    isCorrect: boolean;
    question?: string;
    selectedOptionText?: string;
    correctOptionText?: string;
  }[];
}

interface ResultsStepProps {
  result: QuizResult;
  questionTexts: Record<number, {
    question: string;
    options: string[];
  }>;
  onReset: () => void;
}

export function ResultsStep({ result, questionTexts, onReset }: ResultsStepProps) {
  const { toast } = useToast();
  const { emailAvailable, smsAvailable } = useContactMethods();
  const [contactMethod, setContactMethod] = useState<"email" | "sms">("email");
  const [contactInfo, setContactInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Set default contact method based on availability
  useEffect(() => {
    if (emailAvailable) {
      setContactMethod("email");
    } else if (smsAvailable) {
      setContactMethod("sms");
    }
  }, [emailAvailable, smsAvailable]);
  
  const percentScore = Math.round((result.score / result.totalQuestions) * 100);
  
  // Enhance the result with question texts and option texts
  const enhancedAnswers = result.answers.map(answer => {
    const questionData = questionTexts[answer.questionId];
    return {
      ...answer,
      question: questionData?.question || "Pregunta no disponible",
      selectedOptionText: questionData?.options[answer.selectedOption] || "Opción no disponible",
      correctOptionText: answer.isCorrect 
        ? questionData?.options[answer.selectedOption]
        : questionData?.options.find((_, i) => 
            result.answers.find(a => a.questionId === answer.questionId && a.isCorrect && a.selectedOption === i)
          ) || "Opción correcta no disponible"
    };
  });
  
  const handleShareResults = async () => {
    if (!contactInfo) {
      toast({
        title: "Información requerida",
        description: "Por favor ingresa tu información de contacto.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await shareResults({
        assessmentId: result.assessmentId,
        contactMethod,
        contactInfo,
      });
      
      toast({
        title: "¡Éxito!",
        description: `Se han enviado los resultados a tu ${contactMethod === "email" ? "correo electrónico" : "teléfono"}.`,
      });
    } catch (error) {
      console.error("Error sharing results:", error);
      toast({
        title: "Error",
        description: "No se pudieron enviar los resultados. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-primary-100 text-primary-600 mb-4">
          <i className="fas fa-check-circle text-3xl"></i>
        </div>
        <h2 className="text-2xl font-semibold text-slate-800">¡Excelente trabajo!</h2>
        <p className="text-slate-600 mt-2">{result.userName}, aquí están tus resultados</p>
      </div>
      
      {/* Score Overview */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium text-slate-800">Resumen de puntuación</h3>
          <div className="text-2xl font-bold text-primary-600">{result.score}/{result.totalQuestions}</div>
        </div>
        
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4">
          <div 
            className="bg-primary-600 h-2.5 rounded-full" 
            style={{ width: `${percentScore}%` }}
          ></div>
        </div>
        
        <div className="text-sm text-slate-600 flex justify-between">
          <span>0 correctas</span>
          <span>{result.totalQuestions} preguntas</span>
        </div>
      </div>
      
      {/* Detailed Results */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8 shadow-sm">
        <h3 className="font-medium text-slate-800 mb-4">Detalle de respuestas</h3>
        
        <div className="space-y-4">
          {enhancedAnswers.map((answer, index) => (
            <div key={answer.questionId} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
              <p className="text-sm font-medium text-slate-700 mb-1">
                {index + 1}. {answer.question}
              </p>
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full ${answer.isCorrect ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center mr-2`}>
                  <i className={`fas ${answer.isCorrect ? 'fa-check text-green-600' : 'fa-times text-red-600'} text-xs`}></i>
                </div>
                <p className={`${answer.isCorrect ? 'text-green-700' : 'text-red-700'} text-sm`}>
                  {answer.isCorrect 
                    ? answer.selectedOptionText
                    : `Tu respuesta: ${answer.selectedOptionText}`
                  }
                </p>
              </div>
              {!answer.isCorrect && (
                <div className="flex items-center mt-1 ml-7">
                  <p className="text-slate-600 text-sm">Respuesta correcta: {answer.correctOptionText}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Share Results */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6 shadow-sm">
        <h3 className="font-medium text-slate-800 mb-4">Compartir resultados</h3>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
            <div className="w-full sm:w-1/2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Método de contacto</label>
              {/* Show Select only if multiple contact methods are available */}
              {(emailAvailable && smsAvailable) ? (
                <Select 
                  value={contactMethod} 
                  onValueChange={(value) => setContactMethod(value as "email" | "sms")}
                >
                  <SelectTrigger className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition">
                    <SelectValue placeholder="Selecciona un método" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailAvailable && <SelectItem value="email">Email</SelectItem>}
                    {smsAvailable && <SelectItem value="sms">Mensaje de texto</SelectItem>}
                  </SelectContent>
                </Select>
              ) : (
                <div className="px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
                  <span className="text-slate-600">
                    {emailAvailable ? "Email" : smsAvailable ? "Mensaje de texto" : "Impresión"}
                  </span>
                </div>
              )}
            </div>
            <div className="w-full sm:w-1/2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Información de contacto</label>
              <Input
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
                placeholder={contactMethod === "email" ? "Correo electrónico" : "Número de teléfono"}
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
              />
            </div>
          </div>
          
          <Button 
            className="w-full bg-secondary-500 hover:bg-secondary-600 text-white px-4 py-2 rounded-lg shadow-sm font-medium transition"
            onClick={handleShareResults}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Enviando..." : "Enviar resultados"}
            <i className="fas fa-paper-plane ml-2"></i>
          </Button>
        </div>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg shadow-sm transition flex items-center"
          onClick={onReset}
        >
          <i className="fas fa-redo mr-2"></i>
          Intentar con otro tema
        </Button>
        <Button 
          variant="default"
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition flex items-center"
          onClick={() => window.print()}
        >
          Imprimir reporte
          <i className="fas fa-download ml-2"></i>
        </Button>
      </div>
    </div>
  );
}
