import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  title: string;
  onPlay?: () => void;
  onComplete?: () => void;
}

export function AudioPlayer({ src, title, onPlay, onComplete }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      
      const handleLoadedMetadata = () => {
        if (!audioRef.current) return;
        
        const totalSeconds = Math.floor(audioRef.current.duration);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        setDuration(`${minutes}:${seconds.toString().padStart(2, "0")}`);
        setIsLoaded(true);
      };
      
      const handleEnded = () => {
        setIsPlaying(false);
        setProgress(100);
        if (onComplete) onComplete();
      };
      
      const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        
        const current = audioRef.current.currentTime;
        const total = audioRef.current.duration || 1;
        const progressValue = (current / total) * 100;
        
        const currentSeconds = Math.floor(current);
        const minutes = Math.floor(currentSeconds / 60);
        const seconds = currentSeconds % 60;
        
        setCurrentTime(`${minutes}:${seconds.toString().padStart(2, "0")}`);
        setProgress(progressValue);
      };
      
      audioRef.current.addEventListener("loadedmetadata", handleLoadedMetadata);
      audioRef.current.addEventListener("ended", handleEnded);
      audioRef.current.addEventListener("timeupdate", handleTimeUpdate);
      
      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeEventListener("loadedmetadata", handleLoadedMetadata);
          audioRef.current.removeEventListener("ended", handleEnded);
          audioRef.current.removeEventListener("timeupdate", handleTimeUpdate);
          audioRef.current = null;
        }
      };
    }
  }, [src, onComplete]);
  
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);
  
  const togglePlayback = () => {
    if (!audioRef.current || !isLoaded) {
      // Fallback to browser speech synthesis if audio file doesn't work
      handleBrowserTTS();
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        // If audio fails to play, use browser TTS as fallback
        handleBrowserTTS();
      });
      if (onPlay) onPlay();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const handleBrowserTTS = () => {
    if ('speechSynthesis' in window) {
      // Stop any existing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(title);
      utterance.lang = 'en-US';
      utterance.rate = 0.7; // Slower for learning
      utterance.pitch = 1.0;
      
      utterance.onstart = () => {
        setIsPlaying(true);
        if (onPlay) onPlay();
      };
      
      utterance.onend = () => {
        setIsPlaying(false);
        if (onComplete) onComplete();
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };
  
  const adjustTime = (seconds: number) => {
    if (!audioRef.current) return;
    
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(audioRef.current.duration, audioRef.current.currentTime + seconds)
    );
  };
  
  const adjustSpeed = (adjustment: number) => {
    const newRate = Math.max(0.5, Math.min(2, playbackRate + adjustment));
    setPlaybackRate(newRate);
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="text-center mb-5">
        <h3 className="text-lg font-medium text-slate-800 mb-1">
          Tu tema: <span className="text-primary-700">{title}</span>
        </h3>
        <p className="text-sm text-slate-500 italic">Escucha este clip en inglés</p>
      </div>
      
      <div className="flex flex-col items-center justify-center mb-4 space-y-3">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "w-16 h-16 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition"
          )}
          onClick={togglePlayback}
        >
          <i className={`fas ${isPlaying ? "fa-pause" : "fa-play"} text-xl`}></i>
        </Button>
        
        {!isLoaded && (
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-2">
              Usando síntesis de voz del navegador
            </p>
            <Button
              onClick={handleBrowserTTS}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2"
              disabled={isPlaying}
            >
              🔊 Reproducir con voz del navegador
            </Button>
          </div>
        )}
      </div>
      
      <div className="mb-3">
        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      
      <div className="flex justify-between text-xs text-slate-500">
        <span>{currentTime}</span>
        <span>{duration}</span>
      </div>
      
      <div className="mt-4 flex justify-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-600 hover:text-primary-600 transition"
          title="Replay 5 seconds"
          onClick={() => adjustTime(-5)}
        >
          <i className="fas fa-undo-alt"></i>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-600 hover:text-primary-600 transition"
          title="Decrease speed"
          onClick={() => adjustSpeed(-0.1)}
        >
          <i className="fas fa-minus-circle"></i>
        </Button>
        <span className="text-sm text-slate-700 font-medium">
          {playbackRate.toFixed(1)}x
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-600 hover:text-primary-600 transition"
          title="Increase speed"
          onClick={() => adjustSpeed(0.1)}
        >
          <i className="fas fa-plus-circle"></i>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-600 hover:text-primary-600 transition"
          title="Forward 5 seconds"
          onClick={() => adjustTime(5)}
        >
          <i className="fas fa-redo-alt"></i>
        </Button>
      </div>
    </div>
  );
}
