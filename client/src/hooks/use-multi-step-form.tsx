import { useState } from "react";

export function useMultiStepForm(steps: number) {
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState<number[]>([1]);

  const goToStep = (step: number) => {
    if (step < 1 || step > steps) {
      return;
    }

    setCurrentStep(step);
    
    // Add the step to progress if it's not already there
    if (!progress.includes(step)) {
      setProgress([...progress, step].sort((a, b) => a - b));
    }
  };

  const nextStep = () => {
    if (currentStep < steps) {
      goToStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  const reset = () => {
    setCurrentStep(1);
    setProgress([1]);
  };

  return {
    currentStep,
    goToStep,
    nextStep,
    prevStep,
    reset,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === steps,
    progress,
  };
}
