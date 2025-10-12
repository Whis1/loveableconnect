import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ImageDialogProps {
  src: string;
  alt: string;
  children: React.ReactNode;
}

export const ImageDialog = ({ src, alt, children }: ImageDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full p-0">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto max-h-[90vh] object-contain"
        />
      </DialogContent>
    </Dialog>
  );
};
