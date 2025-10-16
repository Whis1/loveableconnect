import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Lock, Check, X } from "lucide-react";

interface GalleryAccessRequestMessageProps {
  messageId: string;
  senderId: string;
  receiverId: string;
  matchId: string;
  isReceiver: boolean;
}

export const GalleryAccessRequestMessage = ({
  messageId,
  senderId,
  receiverId,
  matchId,
  isReceiver,
}: GalleryAccessRequestMessageProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected">("pending");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleResponse = async (accept: boolean) => {
    try {
      setIsProcessing(true);
      
      // Update the request status
      const { error: updateError } = await supabase
        .from("gallery_access_requests")
        .update({ 
          status: accept ? "accepted" : "rejected",
          updated_at: new Date().toISOString()
        })
        .eq("requester_id", senderId)
        .eq("profile_id", receiverId);

      if (updateError) throw updateError;

      // Send response message
      const responseText = accept 
        ? t("chat.galleryAccessAccepted") || "Ha accettato la tua richiesta di accesso alla galleria"
        : t("chat.galleryAccessRejected") || "Ha rifiutato la tua richiesta di accesso alla galleria";

      await supabase.from("messages").insert({
        match_id: matchId,
        sender_id: receiverId,
        receiver_id: senderId,
        content: responseText,
        message_type: "gallery_access_response",
      });

      setStatus(accept ? "accepted" : "rejected");

      setStatus(accept ? "accepted" : "rejected");
      
      toast({
        title: accept ? t("chat.requestAccepted") : t("chat.requestRejected"),
        description: accept 
          ? t("chat.accessGranted") || "L'utente può ora vedere la tua galleria"
          : t("chat.accessDenied") || "Richiesta rifiutata",
      });
    } catch (error) {
      console.error("Error responding to request:", error);
      toast({
        title: t("chat.error") || "Errore",
        description: t("chat.responseError") || "Errore nella risposta alla richiesta",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isReceiver) {
    // Sender view - just show that request was sent
    return (
      <Card className="p-3 bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            {t("chat.galleryAccessRequest") || "Ha richiesto l'accesso alla tua galleria privata"}
          </p>
        </div>
      </Card>
    );
  }

  if (status !== "pending") {
    // Show status
    return (
      <Card className={`p-3 border ${status === "accepted" ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"}`}>
        <div className="flex items-center gap-2">
          {status === "accepted" ? (
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
          )}
          <p className="text-sm">
            {status === "accepted" 
              ? t("chat.accessGrantedMessage") || "Accesso consentito alla galleria"
              : t("chat.accessDeniedMessage") || "Accesso negato alla galleria"}
          </p>
        </div>
      </Card>
    );
  }

  // Receiver view - show accept/reject buttons
  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">
            {t("chat.galleryAccessRequestReceived") || "Richiesta di accesso alla tua galleria privata"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => handleResponse(true)}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="h-4 w-4 mr-1" />
            {t("chat.accept") || "Accetta"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleResponse(false)}
            disabled={isProcessing}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-1" />
            {t("chat.reject") || "Rifiuta"}
          </Button>
        </div>
      </div>
    </Card>
  );
};
