import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, User, Mail, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface UserReport {
  id: string;
  reporter_id: string;
  reported_id: string;
  report_type: string;
  reason: string | null;
  created_at: string;
  reporter_email: string; // Sarà l'ID abbreviato
  reporter_nickname: string;
  reported_email: string; // Sarà l'ID abbreviato
  reported_nickname: string;
}

const reportTypeLabels: Record<string, string> = {
  fake_profile: "Profilo falso / sospetto (fake)",
  scam_money: "Truffa / Richiesta soldi",
  spam: "Spam / Contenuti non richiesti",
  explicit_sexual: "Contenuti sessuali espliciti / Pornografia",
  inappropriate_nudity: "Nudità inappropriata",
  harassment_stalking: "Molestie / Stalking",
  threats_violence: "Minacce o violenza",
  hate_discrimination: "Incitamento all'odio / Discriminazione",
  suspected_minor: "Sospetto minorenne",
  privacy_violation: "Violazione della privacy / condivisione contenuti privati",
  impersonation: "Impersonificazione / Falso nome",
  paid_meetings: "Richiesta di incontri a pagamento / escort",
  other: "Altro",
};

const reportTypeBadgeColor: Record<string, string> = {
  fake_profile: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  scam_money: "bg-red-500/10 text-red-700 dark:text-red-400",
  spam: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  explicit_sexual: "bg-red-600/10 text-red-800 dark:text-red-300",
  inappropriate_nudity: "bg-red-500/10 text-red-700 dark:text-red-400",
  harassment_stalking: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  threats_violence: "bg-red-700/10 text-red-900 dark:text-red-200",
  hate_discrimination: "bg-red-600/10 text-red-800 dark:text-red-300",
  suspected_minor: "bg-red-700/10 text-red-900 dark:text-red-200",
  privacy_violation: "bg-orange-600/10 text-orange-800 dark:text-orange-300",
  impersonation: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  paid_meetings: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  other: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

export const UserReportsMonitor = () => {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
    
    const channel = supabase
      .channel("user_reports_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_reports",
        },
        () => {
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // Query per ottenere le segnalazioni con i dati degli utenti
      const { data: reportsData, error } = await supabase
        .from("user_reports")
        .select(`
          id,
          reporter_id,
          reported_id,
          report_type,
          reason,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!reportsData || reportsData.length === 0) {
        setReports([]);
        setLoading(false);
        return;
      }

      // Ottieni i profili e le email degli utenti
      const userIds = [
        ...new Set([
          ...reportsData.map((r) => r.reporter_id),
          ...reportsData.map((r) => r.reported_id),
        ]),
      ];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nickname")
        .in("id", userIds);

      // Per le email dobbiamo usare una chiamata edge function visto che l'API admin non è disponibile nel browser
      // Per ora usiamo solo i nickname, le email possono essere aggiunte in seguito
      
      // Crea una mappa per accesso rapido
      const profileMap = new Map<string, string>();
      profiles?.forEach((p) => profileMap.set(p.id, p.nickname));

      const enrichedReports: UserReport[] = reportsData.map((report) => ({
        ...report,
        reporter_email: report.reporter_id.substring(0, 8) + "...", // ID abbreviato invece dell'email
        reporter_nickname: profileMap.get(report.reporter_id) || "Utente",
        reported_email: report.reported_id.substring(0, 8) + "...", // ID abbreviato invece dell'email
        reported_nickname: profileMap.get(report.reported_id) || "Utente",
      }));

      setReports(enrichedReports);
    } catch (error) {
      console.error("Errore nel recupero delle segnalazioni:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      setDeletingId(reportId);
      
      const { error } = await supabase
        .from("user_reports")
        .delete()
        .eq("id", reportId);

      if (error) throw error;

      setReports((prev) => prev.filter((r) => r.id !== reportId));
      
      toast({
        title: "✓ Segnalazione eliminata",
        description: "La segnalazione è stata rimossa con successo",
      });
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la segnalazione",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Segnalazioni Utenti
          {reports.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {reports.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Caricamento segnalazioni...
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessuna segnalazione al momento
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className="border-l-4 border-l-destructive">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Header con tipo di segnalazione e pulsante elimina */}
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          className={`${
                            reportTypeBadgeColor[report.report_type] ||
                            reportTypeBadgeColor.other
                          }`}
                        >
                          {reportTypeLabels[report.report_type] || report.report_type}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(report.created_at), "dd MMM yyyy HH:mm", {
                              locale: it,
                            })}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteReport(report.id)}
                            disabled={deletingId === report.id}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Elimina segnalazione"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Info utente segnalante */}
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">
                          Segnalato da:
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <span className="font-medium">{report.reporter_nickname}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground font-mono">
                            ID: {report.reporter_email}
                          </span>
                        </div>
                      </div>

                      {/* Info utente segnalato */}
                      <div className="bg-destructive/5 rounded-lg p-3 space-y-2">
                        <div className="text-sm font-medium text-destructive">
                          Utente segnalato:
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-destructive" />
                          <span className="font-medium">{report.reported_nickname}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground font-mono">
                            ID: {report.reported_email}
                          </span>
                        </div>
                      </div>

                      {/* Motivazione aggiuntiva */}
                      {report.reason && (
                        <div className="border-t pt-3">
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            Dettagli aggiuntivi:
                          </div>
                          <p className="text-sm bg-muted/30 rounded-lg p-3">
                            {report.reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
