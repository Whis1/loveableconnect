import { useState } from "react";
import { AlertTriangle, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

interface ReportUserDialogProps {
  reportedUserId: string;
  reportedUserName: string;
  matchId?: string;
}

export const ReportUserDialog = ({
  reportedUserId,
  reportedUserName,
  matchId,
}: ReportUserDialogProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reportTypes = [
    { value: "fake_profile", label: "Profilo falso / sospetto (fake)" },
    { value: "scam_money", label: "Truffa / Richiesta soldi" },
    { value: "spam", label: "Spam / Contenuti non richiesti" },
    { value: "explicit_sexual", label: "Contenuti sessuali espliciti / Pornografia" },
    { value: "inappropriate_nudity", label: "Nudità inappropriata" },
    { value: "harassment_stalking", label: "Molestie / Stalking" },
    { value: "threats_violence", label: "Minacce o violenza" },
    { value: "hate_discrimination", label: "Incitamento all'odio / Discriminazione" },
    { value: "suspected_minor", label: "Sospetto minorenne" },
    { value: "privacy_violation", label: "Violazione della privacy / condivisione contenuti privati" },
    { value: "impersonation", label: "Impersonificazione / Falso nome" },
    { value: "paid_meetings", label: "Richiesta di incontri a pagamento / escort" },
    { value: "other", label: "Altro (specifica nei dettagli aggiuntivi)" },
  ];

  const handleSubmit = async () => {
    if (!reportType) {
      toast({
        title: "Errore",
        description: "Seleziona un motivo di segnalazione",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Crea la segnalazione
      const { error: reportError } = await supabase
        .from("user_reports")
        .insert({
          reporter_id: session.user.id,
          reported_id: reportedUserId,
          match_id: matchId || null,
          report_type: reportType,
          reason: reason || null,
        });

      if (reportError) throw reportError;

      console.log("✓ Segnalazione inviata con successo");

      toast({
        title: "✓ Segnalazione inviata",
        description: `Hai segnalato ${reportedUserName}`,
      });

      setOpen(false);
      setReportType("");
      setReason("");
    } catch (error: any) {
      console.error("Errore nella segnalazione:", error);
      toast({
        title: "Errore",
        description: "Impossibile inviare la segnalazione",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Segnala utente"
        >
          <div className="relative">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Segnala {reportedUserName}
          </DialogTitle>
          <DialogDescription>
            Segnala comportamenti inappropriati o sospetti. Il team di moderazione esaminerà la tua segnalazione.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="report-type">Motivo della segnalazione *</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Seleziona un motivo" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Dettagli aggiuntivi (opzionale)</Label>
            <Textarea
              id="reason"
              placeholder="Aggiungi dettagli sulla tua segnalazione..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reportType}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isSubmitting ? "Invio..." : "Invia segnalazione"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};