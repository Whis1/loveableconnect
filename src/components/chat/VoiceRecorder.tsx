import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
  isPremiumMonthly?: boolean;
}

export const VoiceRecorder = ({ onRecordingComplete, disabled = false, isPremiumMonthly = false }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    if (!isPremiumMonthly) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        stream.getTracks().forEach(track => track.stop());
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

  const button = (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled || isProcessing || !isPremiumMonthly}
      className={!isPremiumMonthly ? "opacity-50 cursor-not-allowed" : ""}
    >
      {isProcessing ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isRecording ? (
        <Square className="h-5 w-5 text-destructive" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );

  if (!isPremiumMonthly) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>Messaggio vocale inviabile solo tramite l'Abbonamento PREMIUM</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};