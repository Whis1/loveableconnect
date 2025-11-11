import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Volume2, X } from "lucide-react";

interface TutorialStep {
  audio: string;
  target?: string;
  showControls: boolean;
}

const tutorialSteps: TutorialStep[] = [
  { audio: "/audio/tutorial-1.m4a", showControls: false },
  { audio: "/audio/tutorial-2.m4a", showControls: false },
  { audio: "/audio/tutorial-3.m4a", showControls: false },
  { audio: "/audio/tutorial-4.m4a", target: "credits-display", showControls: true },
  { audio: "/audio/tutorial-5.m4a", target: "user-profile-card", showControls: true },
  { audio: "/audio/tutorial-6.m4a", target: "matches-card", showControls: true },
  { audio: "/audio/tutorial-7.m4a", target: "likes-card", showControls: true },
  { audio: "/audio/tutorial-8.m4a", target: "discover-card", showControls: true },
  { audio: "/audio/tutorial-9.m4a", target: "support-card", showControls: true },
  { audio: "/audio/tutorial-10.m4a", showControls: false },
];

export const Tutorial = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    playCurrentStep();
  }, [currentStep]);

  useEffect(() => {
    if (currentStepData?.target) {
      updateHighlightPosition();
    }
  }, [currentStep]);

  const updateHighlightPosition = () => {
    const step = tutorialSteps[currentStep];
    if (!step.target) return;

    const element = document.getElementById(step.target);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    
    setHighlightStyle({
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });

    setArrowStyle({
      top: `${rect.top - 80}px`,
      left: `${rect.left + rect.width / 2 - 30}px`,
    });
  };

  const playCurrentStep = () => {
    if (audioRef.current && currentStep < tutorialSteps.length) {
      const step = tutorialSteps[currentStep];
      audioRef.current.src = step.audio;
      audioRef.current.play();
      setIsPlaying(true);
      setShowControls(false);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    const step = tutorialSteps[currentStep];
    
    if (currentStep === tutorialSteps.length - 1) {
      completeTutorial();
    } else if (step.showControls) {
      setShowControls(true);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleReplay = () => {
    setShowControls(false);
    playCurrentStep();
  };

  const handleNext = () => {
    setShowControls(false);
    setCurrentStep(prev => prev + 1);
  };

  const handleConclude = () => {
    setShowControls(false);
    setCurrentStep(prev => prev + 1);
  };

  const completeTutorial = async () => {
    setIsCompleting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ tutorial_completed: true })
        .eq("id", user.id);
    }
  };

  const skipTutorial = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    await completeTutorial();
  };

  const currentStepData = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;

  if (isCompleting) {
    return null;
  }

  return (
    <>
      {/* Overlay semitrasparente leggero */}
      <div className="fixed inset-0 bg-black/20 z-[100] pointer-events-none" />

      <Button
        onClick={skipTutorial}
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 z-[102] bg-background/90 hover:bg-background pointer-events-auto shadow-lg"
      >
        <X className="h-5 w-5" />
      </Button>

      {currentStepData?.target && (
        <>
          {/* Spotlight effect: crea un "buco" nell'overlay per mostrare l'elemento */}
          <div
            className="fixed z-[101] pointer-events-auto rounded-xl transition-all duration-300"
            style={{
              ...highlightStyle,
              boxShadow: '0 0 0 4px hsl(var(--primary)), 0 0 0 9999px rgba(0, 0, 0, 0.5)',
              animation: 'tutorial-pulse 2s ease-in-out infinite',
            }}
          />
          <div
            className="fixed z-[101] pointer-events-none"
            style={arrowStyle}
          >
            <svg width="60" height="60" viewBox="0 0 60 60" className="animate-bounce">
              <path
                d="M30 10 L30 45 M30 45 L20 35 M30 45 L40 35"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5))' }}
              />
            </svg>
          </div>
        </>
      )}

      {showControls && !isLastStep && currentStep !== 8 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[102] flex gap-4 pointer-events-auto animate-fade-in">
          <Button
            onClick={handleReplay}
            variant="outline"
            size="lg"
            className="bg-background/90 hover:bg-background backdrop-blur-sm shadow-lg min-w-[140px]"
          >
            <Volume2 className="mr-2 h-5 w-5" />
            Riascolta
          </Button>
          <Button
            onClick={handleNext}
            size="lg"
            className="shadow-lg min-w-[140px]"
          >
            Prosegui →
          </Button>
        </div>
      )}

      {showControls && currentStep === 8 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[102] pointer-events-auto animate-fade-in">
          <Button
            onClick={handleConclude}
            size="lg"
            className="shadow-lg min-w-[180px] bg-primary hover:bg-primary/90"
          >
            Concludi Tutorial
          </Button>
        </div>
      )}

      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        className="hidden"
      />

      <style>{`
        @keyframes tutorial-pulse {
          0%, 100% {
            box-shadow: 0 0 0 4px hsl(var(--primary)), 0 0 0 9999px rgba(0, 0, 0, 0.5);
          }
          50% {
            box-shadow: 0 0 0 6px hsl(var(--primary)), 0 0 0 9999px rgba(0, 0, 0, 0.6);
          }
        }
      `}</style>
    </>
  );
};
