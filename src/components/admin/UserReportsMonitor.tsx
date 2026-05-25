import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Calendar, Trash2, ArrowRight, Flag, MessageSquareWarning, Repeat, Copy } from "lucide-react";
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
  reporter_nickname: string;
  reporter_avatar: string | null;
  reported_nickname: string;
  reported_avatar: string | null;
  // Quante volte questo utente segnalato e' stato segnalato in TOTALE
  reported_total_count: number;
}

const reportTypeLabels: Record<string, string> = {
  fake_profile: "Profilo falso / sospetto",
  scam_money: "Truffa / Richiesta soldi",
  spam: "Spam / Contenuti non richiesti",
  explicit_sexual: "Contenuti sessuali espliciti",
  inappropriate_nudity: "Nudità inappropriata",
  harassment_stalking: "Molestie / Stalking",
  threats_violence: "Minacce o violenza",
  hate_discrimination: "Incitamento all'odio",
  suspected_minor: "Sospetto minorenne",
  privacy_violation: "Violazione della privacy",
  impersonation: "Impersonificazione / Falso nome",
  paid_meetings: "Richiesta di incontri a pagamento",
  other: "Altro",
};

// Gravità per ordinare la severità visiva (gradient della card)
const reportTypeSeverity: Record<string, "critical" | "high" | "medium" | "low"> = {
  suspected_minor: "critical",
  threats_violence: "critical",
  hate_discrimination: "critical",
  explicit_sexual: "high",
  harassment_stalking: "high",
  scam_money: "high",
  privacy_violation: "high",
  inappropriate_nudity: "high",
  fake_profile: "medium",
  impersonation: "medium",
  paid_meetings: "medium",
  spam: "low",
  other: "low",
};

const severityStyles: Record<string, { card: string; badge: string; icon: string }> = {
  critical: {
    card: "border-l-red-600 bg-gradient-to-r from-red-600/10 via-transparent to-transparent",
    badge: "bg-red-600 text-white border-red-700",
    icon: "text-red-500",
  },
  high: {
    card: "border-l-orange-500 bg-gradient-to-r from-orange-500/10 via-transparent to-transparent",
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/50",
    icon: "text-orange-400",
  },
  medium: {
    card: "border-l-yellow-500 bg-gradient-to-r from-yellow-500/10 via-transparent to-transparent",
    badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
    icon: "text-yellow-400",
  },
  low: {
    card: "border-l-blue-500 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/50",
    icon: "text-blue-400",
  },
};

const getAvatarUrl = (path: string | null | undefined): string => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return supabase.storage.from("profile-images").getPublicUrl(path).data.publicUrl;
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
        { event: "INSERT", schema: "public", table: "user_reports" },
        () => fetchReports()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data: reportsData, error } = await supabase
        .from("user_reports")
        .select("id, reporter_id, reported_id, report_type, reason, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!reportsData || reportsData.length === 0) {
        setReports([]);
        return;
      }

      const userIds = [
        ...new Set([
          ...reportsData.map((r) => r.reporter_id),
          ...reportsData.map((r) => r.reported_id),
        ]),
      ];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url")
        .in("id", userIds);

      const profileMap = new Map<string, { nickname: string; avatar_url: string | null }>();
      profiles?.forEach((p) => profileMap.set(p.id, { nickname: p.nickname, avatar_url: p.avatar_url }));

      // Conta quante segnalazioni TOTALI ha ricevuto ciascun reported_id (incluso storico)
      const reportedCounts = new Map<string, number>();
      reportsData.forEach((r) => {
        reportedCounts.set(r.reported_id, (reportedCounts.get(r.reported_id) ?? 0) + 1);
      });

      const enriched: UserReport[] = reportsData.map((report) => {
        const reporterProfile = profileMap.get(report.reporter_id);
        const reportedProfile = profileMap.get(report.reported_id);
        return {
          ...report,
          reporter_nickname: reporterProfile?.nickname ?? "Utente sconosciuto",
          reporter_avatar: reporterProfile?.avatar_url ?? null,
          reported_nickname: reportedProfile?.nickname ?? "Utente sconosciuto",
          reported_avatar: reportedProfile?.avatar_url ?? null,
          reported_total_count: reportedCounts.get(report.reported_id) ?? 1,
        };
      });
      setReports(enriched);
    } catch (error) {
      console.error("Errore fetch segnalazioni:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      setDeletingId(reportId);
      const { error } = await supabase.from("user_reports").delete().eq("id", reportId);
      if (error) throw error;
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast({ title: "✓ Segnalazione eliminata" });
    } catch (error) {
      console.error("Errore eliminazione:", error);
      toast({ title: "Errore", description: "Impossibile eliminare", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiato`, description: text });
  };

  // Conta totale segnalazioni "calde" (utenti con 3+ segnalazioni)
  const repeatOffendersCount = new Set(
    reports.filter((r) => r.reported_total_count >= 3).map((r) => r.reported_id)
  ).size;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Segnalazioni Utenti
            {reports.length > 0 && (
              <Badge variant="destructive" className="ml-1">{reports.length}</Badge>
            )}
          </CardTitle>
          {repeatOffendersCount > 0 && (
            <Badge className="bg-red-500/20 text-red-300 border border-red-500/50 gap-1">
              <Repeat className="h-3 w-3" />
              {repeatOffendersCount} utenti recidivi
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Caricamento segnalazioni...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-semibold text-muted-foreground">Nessuna segnalazione attiva</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Quando un utente segnala un profilo, apparirà qui in tempo reale.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[700px] pr-3">
            <div className="space-y-3">
              {reports.map((report) => {
                const severity = reportTypeSeverity[report.report_type] ?? "low";
                const style = severityStyles[severity];
                const reporterUrl = getAvatarUrl(report.reporter_avatar);
                const reportedUrl = getAvatarUrl(report.reported_avatar);
                return (
                  <div
                    key={report.id}
                    className={`relative border border-border/60 border-l-4 ${style.card} rounded-lg overflow-hidden`}
                  >
                    {/* Header: categoria + gravità + data + delete */}
                    <div className="flex items-start justify-between gap-2 p-3 pb-2 border-b border-border/40 bg-background/30">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${style.badge} border gap-1 font-bold`}>
                          <MessageSquareWarning className={`h-3 w-3 ${style.icon}`} />
                          {reportTypeLabels[report.report_type] ?? report.report_type}
                        </Badge>
                        {report.reported_total_count >= 3 && (
                          <Badge className="bg-red-500/20 text-red-300 border border-red-500/50 gap-1">
                            <Repeat className="h-3 w-3" />
                            {report.reported_total_count}ª segnalazione su questo utente
                          </Badge>
                        )}
                        {report.reported_total_count === 2 && (
                          <Badge className="bg-orange-500/15 text-orange-300 border border-orange-500/40 gap-1">
                            <Repeat className="h-3 w-3" />
                            2ª segnalazione
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(report.created_at), "dd MMM yyyy 'alle' HH:mm", { locale: it })}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteReport(report.id)}
                          disabled={deletingId === report.id}
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Elimina segnalazione"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Flusso visivo: segnalatore → segnalato */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-3">
                      {/* Segnalatore */}
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/40">
                        <Avatar className="h-11 w-11 ring-2 ring-blue-500/40 shrink-0">
                          <AvatarImage src={reporterUrl} />
                          <AvatarFallback className="bg-blue-500/20 text-blue-300 font-bold">
                            {report.reporter_nickname.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] uppercase tracking-wider font-bold text-blue-400">
                            Segnalatore
                          </div>
                          <p className="font-bold truncate">{report.reporter_nickname}</p>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(report.reporter_id, "ID segnalatore")}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-mono mt-0.5 group"
                            title="Clicca per copiare ID completo"
                          >
                            <span>ID: {report.reporter_id.slice(0, 8)}...</span>
                            <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                      </div>

                      {/* Freccia centro */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="p-1.5 rounded-full bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-red-500/30 border border-border/40">
                          <ArrowRight className="h-4 w-4 text-foreground/70" />
                        </div>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">
                          segnala
                        </span>
                      </div>

                      {/* Segnalato */}
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
                        <Avatar className="h-11 w-11 ring-2 ring-red-500/50 shrink-0">
                          <AvatarImage src={reportedUrl} />
                          <AvatarFallback className="bg-red-500/20 text-red-300 font-bold">
                            {report.reported_nickname.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] uppercase tracking-wider font-bold text-red-400">
                            Utente segnalato
                          </div>
                          <p className="font-bold truncate">{report.reported_nickname}</p>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(report.reported_id, "ID segnalato")}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-mono mt-0.5 group"
                            title="Clicca per copiare ID completo"
                          >
                            <span>ID: {report.reported_id.slice(0, 8)}...</span>
                            <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Dettagli aggiuntivi (se presenti) */}
                    {report.reason && (
                      <div className="mx-3 mb-3 p-3 rounded-lg bg-background/40 border border-border/40">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
                          <MessageSquareWarning className="h-3 w-3" />
                          Dettagli forniti
                        </div>
                        <p className="text-sm italic leading-relaxed text-foreground/90">
                          "{report.reason}"
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
