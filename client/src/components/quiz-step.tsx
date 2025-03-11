import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
}

interface QuizStepProps {
  questions: QuizQuestion[];
  onSubmit: (answers: { questionId: number; selectedOption: number }[]) => void;
  onBack: () => void;
}

export function QuizStep({ questions, onSubmit, onBack }: QuizStepProps) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  
  const handleOptionSelect = (questionId: number, optionIndex: number) => {
    setAnswers({
      ...answers,
      [questionId]: optionIndex,
    });
  };
  
  const handleSubmit = () => {
    // Check if all questions have been answered
    if (Object.keys(answers).length !== questions.length) {
      toast({
        title: "Respuestas incompletas",
        description: "Por favor responde todas las preguntas antes de continuar.",
        variant: "destructive",
      });
      return;
    }
    
    const formattedAnswers = questions.map((question) => ({
      questionId: question.id,
      selectedOption: answers[question.id],
    }));
    
    onSubmit(formattedAnswers);
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-slate-800 mb-4">
        Responde las preguntas
      </h2>
      <p className="text-slate-600 mb-6">
        Selecciona la respuesta correcta para cada pregunta basada en el audio que escuchaste.
      </p>
      
      <div className="space-y-8">
        {questions.map((question, questionIndex) => (
          <div 
            key={question.id}
            className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm"
          >
            <h3 className="font-medium text-slate-800 mb-4">
              {questionIndex + 1}. {question.question}
            </h3>
            
            <RadioGroup
              value={answers[question.id]?.toString()}
              onValueChange={(value) => handleOptionSelect(question.id, parseInt(value))}
            >
              <div className="space-y-3">
                {question.options.map((option, optionIndex) => (
                  <Label
                    key={optionIndex}
                    htmlFor={`question-${question.id}-option-${optionIndex}`}
                    className="block cursor-pointer"
                  >
                    <div 
                      className={`flex items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition ${
                        answers[question.id] === optionIndex ? "bg-primary-50 border-primary-200" : ""
                      }`}
                    >
                      <RadioGroupItem 
                        id={`question-${question.id}-option-${optionIndex}`} 
                        value={optionIndex.toString()}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300"
                      />
                      <span className="ml-3 text-slate-700">{option}</span>
                    </div>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          </div>
        ))}
      </div>
      
      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg shadow-sm transition flex items-center"
          onClick={onBack}
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Volver a escuchar
        </Button>
        <Button 
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition flex items-center"
          onClick={handleSubmit}
        >
          Ver resultados
          <i className="fas fa-arrow-right ml-2"></i>
        </Button>
      </div>
    </div>
  );
}
