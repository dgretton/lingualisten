import { Button } from "@/components/ui/button";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface SpeechInputProps {
  onTranscriptChange?: (transcript: string) => void;
}

export function SpeechInput({ onTranscriptChange }: SpeechInputProps) {
  const { toast } = useToast();
  const {
    transcript,
    isListening,
    startListening,
    stopListening,
    supportsSpeechRecognition,
    resetTranscript,
  } = useSpeechRecognition({
    language: "es-ES",
    onResult: (text) => {
      if (onTranscriptChange) {
        onTranscriptChange(text);
      }
    },
  });

  const [status, setStatus] = useState("Presiona para hablar");

  useEffect(() => {
    if (isListening) {
      setStatus("Escuchando...");
    } else if (transcript) {
      setStatus("Procesando...");
      setTimeout(() => {
        setStatus("Presiona para hablar");
      }, 1000);
    } else {
      setStatus("Presiona para hablar");
    }
  }, [isListening, transcript]);

  const toggleRecording = () => {
    if (!supportsSpeechRecognition) {
      toast({
        title: "No soportado",
        description: "Tu navegador no soporta reconocimiento de voz.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
      <p className="block text-sm font-medium text-slate-700 mb-2">
        O dímelo por voz
      </p>
      <div className="flex items-center justify-center py-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={`flex items-center justify-center bg-white hover:bg-slate-50 text-primary-700 border border-slate-300 rounded-full w-16 h-16 shadow-sm transition ${
            isListening ? "bg-red-50" : ""
          }`}
          onClick={toggleRecording}
        >
          <i
            className={`fas fa-microphone text-xl ${
              isListening ? "text-red-500" : ""
            }`}
          ></i>
        </Button>
      </div>
      <div id="speech-status" className="text-center text-sm text-slate-500 mt-2">
        {status}
      </div>
      <div className="text-center mt-2 h-12 flex items-center justify-center italic text-slate-600">
        {transcript}
      </div>
    </div>
  );
}
