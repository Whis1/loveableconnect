import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
  isPremiumMonthly?: boolean;
  onPremiumRequired?: () => void;
}

export const VoiceRecorder = ({ onRecordingComplete, disabled = false, isPremiumMonthly = false, onPremiumRequired }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    console.log('🎤 Start recording - isPremiumMonthly:', isPremiumMonthly);
    if (!isPremiumMonthly) {
      console.log('🎤 Not premium - calling onPremiumRequired');
      onPremiumRequired?.();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(audioBlob);
        setIsProcessing(false);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Errore",
        description: "Impossibile accedere al microfono",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const buttonContent = (
    <Button
      type="button"
      size="icon"
      variant="default"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled || isProcessing || !isPremiumMonthly}
      className="bg-gradient-to-br from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 border-0 shrink-0 shadow-lg"
    >
      {isProcessing ? (
        <Loader2 className="h-6 w-6 animate-spin text-white" />
      ) : isRecording ? (
        <Square className="h-6 w-6 text-white fill-white" />
      ) : (
        <Mic className="h-6 w-6 text-white" />
      )}
    </Button>
  );

  if (!isPremiumMonthly) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>Messaggio vocale inviabile solo tramite l'Abbonamento PREMIUM</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonContent;
};