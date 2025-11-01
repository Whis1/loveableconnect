import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Send } from "lucide-react";

interface VoicePreviewProps {
  audioUrl: string;
  onSend: () => void;
  onDelete: () => void;
}

export const VoicePreview = ({ audioUrl, onSend, onDelete }: VoicePreviewProps) => {
  return (
    <Card className="p-4 space-y-3 border-amber-500/30 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
        🎤 Messaggio vocale registrato
      </p>
      <audio 
        controls 
        src={audioUrl} 
        className="w-full"
      />
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Elimina
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSend}
          className="gap-2 bg-gradient-to-br from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
        >
          <Send className="h-4 w-4" />
          Invia
        </Button>
      </div>
    </Card>
  );
};
