import { cn } from "@/lib/utils";
import { ChevronRight, Check } from "lucide-react";

interface CheckoutStepsProps {
  steps: string[];
  currentStep: string;
}

export function CheckoutSteps({ steps, currentStep }: CheckoutStepsProps) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="bg-white border-b border-muted sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="flex items-center justify-around md:justify-center md:gap-12 overflow-x-hidden">
          {steps.map((label, i) => {
            const isCompleted = currentIndex > i;
            const isActive = currentIndex === i;
            const isPending = currentIndex < i;

            return (
              <div key={label} className="flex items-center">
                {/* Step Circle & Label */}
                <div className="flex items-center gap-2 md:gap-3">
                  <div
                    className={cn(
                      "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-[10px] md:text-xs transition-all duration-300",
                      isCompleted && "bg-green-500 text-white",
                      isActive && "bg-accent text-white ring-4 ring-accent/10",
                      isPending && "bg-muted text-muted-foreground",
                    )}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                  </div>

                  <span
                    className={cn(
                      "text-[10px] md:text-xs font-black uppercase tracking-wider transition-colors",
                      isActive
                        ? "block text-foreground"
                        : "hidden md:block text-muted-foreground",
                      isCompleted && "md:text-green-600",
                    )}
                  >
                    {label}
                  </span>
                </div>

                {/* Separator Arrow */}
                {i < steps.length - 1 && (
                  <div className="mx-2 md:mx-12">
                    <ChevronRight
                      className={cn(
                        "w-4 h-4",
                        isCompleted ? "text-green-500" : "text-muted/30",
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
