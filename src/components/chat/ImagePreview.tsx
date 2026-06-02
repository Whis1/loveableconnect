import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Send, ImageIcon } from "lucide-react";

interface ImagePreviewProps {
  imageUrl: string;
  onSend: () => void;
  onDelete: () => void;
  sending?: boolean;
}

export const ImagePreview = ({ imageUrl, onSend, onDelete, sending }: ImagePreviewProps) => {
  return (
    <Card className="p-4 space-y-3 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <p className="text-sm font-medium text-foreground flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />
        Anteprima immagine
      </p>
      <div className="flex justify-center">
        <img
          src={imageUrl}
          alt="Anteprima"
          className="max-h-60 w-auto max-w-full rounded-lg object-contain border border-border"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDelete}
          disabled={sending}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Annulla
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSend}
          disabled={sending}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          {sending ? "Invio..." : "Invia"}
        </Button>
      </div>
    </Card>
  );
};
