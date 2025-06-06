import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "./audio-player";
import { Card } from "@/components/ui/card";

interface ListeningExerciseStepProps {
  title: string;
  audioUrl: string;
  content: string;
  onContinue: () => void;
  onBack: () => void;
}

export function ListeningExerciseStep({ 
  title, 
  audioUrl, 
  content,
  onContinue, 
  onBack 
}: ListeningExerciseStepProps) {
  const [hasListened, setHasListened] = useState(false);
  const [showText, setShowText] = useState(false);
  
  const handlePlayStart = () => {
    setHasListened(true);
  };
  
  // Allow continuing after a short delay even if audio doesn't work
  useState(() => {
    const timer = setTimeout(() => {
      setHasListened(true);
    }, 3000); // Enable continue button after 3 seconds as fallback
    
    return () => clearTimeout(timer);
  }, []);
  
  // Format the content if it's a list of numbered statements
  const formatContent = (text: string) => {
    if (!text) return [];
    
    // Check if content is already formatted with numbers (1. 2. 3. etc)
    if (text.match(/^\d+\.\s/m)) {
      return text.split('\n').filter(line => line.trim().length > 0);
    }
    
    // Otherwise, just split by newlines
    return text.split('\n').filter(line => line.trim().length > 0);
  };
  
  const formattedContent = formatContent(content);
  
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-slate-800 mb-3">
        Escucha y lee atentamente
      </h2>
      <p className="text-slate-600 mb-6">
        Reproduce el audio y presta atención. También puedes leer el texto en inglés. Después deberás responder preguntas sobre el contenido.
      </p>
      
      <div className="bg-slate-100 p-6 rounded-lg mb-6 border border-slate-200">
        <AudioPlayer 
          src={audioUrl} 
          title={content} 
          onPlay={handlePlayStart} 
        />
        
        <div className="text-center mt-5">
          <p className="text-sm text-slate-600">
            Puedes reproducir el audio las veces que necesites
          </p>
        </div>
      </div>
      
      {/* Toggle button for showing/hiding text */}
      <div className="text-center mb-6">
        <Button
          variant="outline"
          onClick={() => setShowText(!showText)}
          className="text-sm"
        >
          {showText ? "Ocultar texto" : "Mostrar texto en inglés"} 
          {showText ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
              <path d="m18 15-6-6-6 6"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          )}
        </Button>
      </div>
      
      {/* Text content */}
      {showText && (
        <Card className="p-6 mb-8 border-l-4 border-l-primary-500">
          <h3 className="text-lg font-medium text-slate-800 mb-3">English Content:</h3>
          <div className="space-y-3">
            {formattedContent.map((line, index) => (
              <div key={index} className="flex">
                <div className="text-primary-600 font-medium mr-2">{line.match(/^\d+\./) ? '' : `${index + 1}.`}</div>
                <p className="text-slate-700">{line.replace(/^\d+\.\s/, '')}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg shadow-sm transition flex items-center"
          onClick={onBack}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
            <path d="m15 18-6-6 6-6"></path>
          </svg>
          Atrás
        </Button>
        <Button 
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition flex items-center disabled:bg-gray-400 disabled:text-gray-200"
          onClick={onContinue}
          disabled={!hasListened}
        >
          Responder preguntas
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
            <path d="m9 18 6-6-6-6"></path>
          </svg>
        </Button>
        
        {!hasListened && (
          <p className="text-sm text-slate-500 text-center mt-2">
            Haz clic en el botón de reproducir para continuar
          </p>
        )}
      </div>
    </div>
  );
}
