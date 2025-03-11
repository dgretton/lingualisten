import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "./audio-player";

interface ListeningExerciseStepProps {
  title: string;
  audioUrl: string;
  onContinue: () => void;
  onBack: () => void;
}

export function ListeningExerciseStep({ 
  title, 
  audioUrl, 
  onContinue, 
  onBack 
}: ListeningExerciseStepProps) {
  const [hasListened, setHasListened] = useState(false);
  
  const handlePlayStart = () => {
    setHasListened(true);
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-slate-800 mb-3">
        Escucha atentamente
      </h2>
      <p className="text-slate-600 mb-6">
        Reproduce el audio y presta atención. Después deberás responder preguntas sobre lo que escuchaste.
      </p>
      
      <div className="bg-slate-100 p-6 rounded-lg mb-8 border border-slate-200">
        <AudioPlayer 
          src={audioUrl} 
          title={title} 
          onPlay={handlePlayStart} 
        />
        
        <div className="text-center mt-5">
          <p className="text-sm text-slate-600">
            Puedes reproducir el audio las veces que necesites
          </p>
        </div>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg shadow-sm transition flex items-center"
          onClick={onBack}
        >
          <i className="fas fa-arrow-left mr-2"></i>
          Atrás
        </Button>
        <Button 
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition flex items-center"
          onClick={onContinue}
          disabled={!hasListened}
        >
          Responder preguntas
          <i className="fas fa-arrow-right ml-2"></i>
        </Button>
      </div>
    </div>
  );
}
