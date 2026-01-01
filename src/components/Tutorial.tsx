import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Volume2, X, Play } from "lucide-react";

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
  const [isStarted, setIsStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
  const audioRef = useRef<HTMLAudioElement>(null);
  const preloadAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (isStarted) {
      playCurrentStep();
      preloadNextAudio();
    }
  }, [currentStep, isStarted]);

  useEffect(() => {
    if (isStarted && currentStepData?.target) {
      updateHighlightPosition();
    }
  }, [currentStep, isStarted]);

  const preloadNextAudio = () => {
    const nextStep = currentStep + 1;
    if (nextStep < tutorialSteps.length && preloadAudioRef.current) {
      preloadAudioRef.current.src = tutorialSteps[nextStep].audio;
      preloadAudioRef.current.load();
    }
  };

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

  const playCurrentStep = async () => {
    if (audioRef.current && currentStep < tutorialSteps.length) {
      const step = tutorialSteps[currentStep];
      audioRef.current.src = step.audio;
      
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        setShowControls(false);
      } catch (error) {
        console.log("Audio autoplay blocked, showing controls");
        setIsPlaying(false);
        if (step.showControls) {
          setShowControls(true);
        } else {
          // Auto-advance for non-control steps if audio fails
          setTimeout(() => {
            if (currentStep === tutorialSteps.length - 1) {
              completeTutorial();
            } else {
              setCurrentStep(prev => prev + 1);
            }
          }, 2000);
        }
      }
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

  const handleStartTutorial = () => {
    setIsStarted(true);
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

  // Welcome screen before tutorial starts
  if (!isStarted) {
    return (
      <>
        <div className="fixed inset-0 bg-black/60 z-[100] pointer-events-auto" />
        
        <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-background rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-border/50">
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Play className="w-10 h-10 text-primary" />
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Benvenuto su Arrettu!
            </h2>
            
            <p className="text-muted-foreground mb-8">
              Ti guideremo attraverso le funzionalità principali dell'app con un breve tutorial audio.
            </p>
            
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleStartTutorial}
                size="lg"
                className="w-full"
              >
                <Volume2 className="mr-2 h-5 w-5" />
                Inizia Tutorial
              </Button>
              
              <Button
                onClick={skipTutorial}
                variant="ghost"
                size="lg"
                className="w-full text-muted-foreground"
              >
                Salta Tutorial
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Overlay semitrasparente leggero che blocca i click */}
      <div className="fixed inset-0 bg-black/20 z-[100] pointer-events-auto" />

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
            className="fixed z-[101] pointer-events-none rounded-xl transition-all duration-300"
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[102] flex gap-4 pointer-events-auto">
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[102] pointer-events-auto">
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
        preload="auto"
      />
      <audio
        ref={preloadAudioRef}
        className="hidden"
        preload="auto"
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
