import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ImageDialogProps {
  src: string;
  alt: string;
  children: React.ReactNode;
  isBlurred?: boolean;
  onRequestAccess?: () => void;
}

export const ImageDialog = ({ src, alt, children, isBlurred = false, onRequestAccess }: ImageDialogProps) => {
  const { t } = useTranslation();
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
        <div className="relative">
          <img
            src={src}
            alt={alt}
            className={`w-full h-auto max-h-[90vh] object-contain ${isBlurred ? 'blur-2xl scale-110' : ''}`}
          />
          {isBlurred && onRequestAccess && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
              <Lock className="h-16 w-16 text-white mb-4" />
              <p className="text-white text-lg mb-4 text-center px-4">
                {t("chat.privateGalleryMessage")}
              </p>
              <Button onClick={onRequestAccess} size="lg">
                <Lock className="h-4 w-4 mr-2" />
                {t("chat.requestAccess")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
