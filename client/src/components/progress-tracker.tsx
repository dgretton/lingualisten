import React from "react";
import { cn } from "@/lib/utils";

interface ProgressTrackerProps {
  currentStep: number;
  steps: {
    id: number;
    label: string;
  }[];
  visitedSteps?: number[];
}

export function ProgressTracker({
  currentStep,
  steps,
  visitedSteps = [],
}: ProgressTrackerProps) {
  return (
    <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isVisited = visitedSteps.includes(step.id);
          const isActivated = isActive || isVisited;

          return (
            <React.Fragment key={step.id}>
              {index > 0 && (
                <div
                  className={cn(
                    "h-px flex-1 mx-2",
                    isActivated && index <= currentStep
                      ? "bg-primary-600"
                      : "bg-slate-300"
                  )}
                />
              )}
              <div className="flex items-center space-x-2" data-step={step.id}>
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-semibold",
                    isActivated
                      ? "bg-primary-600 text-white"
                      : "bg-slate-300 text-slate-600"
                  )}
                >
                  {step.id}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    isActivated ? "text-primary-700" : "text-slate-500"
                  )}
                >
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
