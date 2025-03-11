import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseSpeechRecognitionProps {
  language?: string;
  onResult?: (transcript: string) => void;
  onEnd?: () => void;
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  supportsSpeechRecognition: boolean;
  resetTranscript: () => void;
}

export function useSpeechRecognition({
  language = "es-ES",
  onResult,
  onEnd,
}: UseSpeechRecognitionProps = {}): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [supportsSpeechRecognition, setSupportsSpeechRecognition] = useState(false);
  const { toast } = useToast();

  // Initialize the speech recognition object
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = language;
        
        setRecognition(recognitionInstance);
        setSupportsSpeechRecognition(true);
      } else {
        setSupportsSpeechRecognition(false);
      }
    }
  }, [language]);

  useEffect(() => {
    if (!recognition) return;

    const handleResult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const fullTranscript = finalTranscript || interimTranscript;
      setTranscript(fullTranscript);
      
      if (onResult) {
        onResult(fullTranscript);
      }
    };

    const handleEnd = () => {
      setIsListening(false);
      if (onEnd) {
        onEnd();
      }
    };

    const handleError = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      console.error("Speech recognition error", event.error);
      toast({
        title: "Error de reconocimiento de voz",
        description: "Hubo un problema al procesar tu voz. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    };

    recognition.onresult = handleResult;
    recognition.onend = handleEnd;
    recognition.onerror = handleError;

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
    };
  }, [recognition, onResult, onEnd, toast]);

  const startListening = useCallback(() => {
    if (!recognition) return;
    
    try {
      setIsListening(true);
      recognition.start();
    } catch (error) {
      console.error("Failed to start speech recognition", error);
      setIsListening(false);
      toast({
        title: "Error",
        description: "No se pudo iniciar el reconocimiento de voz. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  }, [recognition, toast]);

  const stopListening = useCallback(() => {
    if (!recognition) return;
    
    try {
      recognition.stop();
      setIsListening(false);
    } catch (error) {
      console.error("Failed to stop speech recognition", error);
    }
  }, [recognition]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
    supportsSpeechRecognition,
    resetTranscript,
  };
}
