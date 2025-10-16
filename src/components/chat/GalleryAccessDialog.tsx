import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface GalleryAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestAccess: () => void;
  isRequesting: boolean;
}

export const GalleryAccessDialog = ({
  open,
  onOpenChange,
  onRequestAccess,
  isRequesting,
}: GalleryAccessDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            {t("chat.privateGallery") || "Galleria Privata"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            {t("chat.privateGalleryMessage") || 
              "Questo utente ha una galleria privata. Richiedi l'accesso per vedere le foto."}
          </p>
          <Button
            onClick={onRequestAccess}
            disabled={isRequesting}
            className="w-full"
          >
            {isRequesting 
              ? (t("chat.requesting") || "Richiesta in corso...") 
              : (t("chat.requestAccess") || "Richiedi l'accesso alle foto private")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
