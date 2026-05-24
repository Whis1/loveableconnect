import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Eye, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import bannersData from "@/data/banners.json";

// 📢 BannerManager: gestione banner pubblicitari, DB-backed con fallback locale.
//
// Strategia:
//  - Tenta DB (public.app_banners). Se la tabella esiste tutto persistente
//    e visibile a tutti gli utenti.
//  - Se la tabella NON esiste (errore PGRST205 "Could not find the table"
//    o codice 42P01) cade in modalita' LOCAL: legge/scrive su localStorage
//    e si carica DAVVERO al mount (cosi' il bug originale 'cancello, ricarico,
//    ricompaiono' e' risolto anche senza migration applicata).
//  - Banner di warning in UI per ricordare di applicare la migration.
interface BannerRow {
  id: string;
  image_path: string;
  position: number;
}

const LOCAL_STORAGE_KEY = "adBanners";

function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message ?? "").toLowerCase();
  return (
    err.code === "PGRST205" ||
    err.code === "42P01" ||
    msg.includes("could not find the table") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

function loadLocalBanners(): BannerRow[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        return parsed.map((image_path: string, i: number) => ({
          id: `local-${i}-${image_path}`,
          image_path,
          position: i + 1,
        }));
      }
    }
  } catch {
    // ignore
  }
  // Fallback estremo: lista bundled dal JSON
  return bannersData.banners.map((image_path: string, i: number) => ({
    id: `local-default-${i}`,
    image_path,
    position: i + 1,
  }));
}

function saveLocalBanners(rows: BannerRow[]) {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(rows.map((r) => r.image_path))
    );
  } catch {
    // ignore quota errors
  }
}

export const BannerManager = () => {
  const { toast } = useToast();
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);
  // true se la tabella app_banners non esiste sul DB → mostro banner di warning
  // e uso localStorage come storage. Una volta applicata la migration, ricaricando
  // la pagina questo diventa false e si torna automaticamente sul DB.
  const [localMode, setLocalMode] = useState(false);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      // any-cast: la tabella e' stata creata da migration, ma i types
      // generati su supabase/client non includono ancora app_banners.
      const { data, error } = await (supabase as any)
        .from("app_banners")
        .select("id, image_path, position")
        .order("position", { ascending: true });
      if (error) {
        if (isTableMissingError(error)) {
          console.warn("BannerManager: tabella app_banners assente, modalità LOCAL");
          setLocalMode(true);
          setBanners(loadLocalBanners());
          return;
        }
        throw error;
      }
      setLocalMode(false);
      setBanners((data ?? []) as BannerRow[]);
    } catch (e: any) {
      console.error("fetchBanners error:", e);
      toast({
        title: "Errore caricamento banner",
        description: e?.message ?? "Impossibile leggere i banner dal DB",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleAddBanner = async () => {
    if (!newBannerUrl.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci un URL valido per il banner",
        variant: "destructive",
      });
      return;
    }

    // Modalità LOCAL: salva solo su localStorage
    if (localMode) {
      const trimmed = newBannerUrl.trim();
      const nextPosition = banners.length
        ? Math.max(...banners.map((b) => b.position)) + 1
        : 1;
      const newRow: BannerRow = {
        id: `local-${Date.now()}-${trimmed}`,
        image_path: trimmed,
        position: nextPosition,
      };
      const updated = [...banners, newRow];
      setBanners(updated);
      saveLocalBanners(updated);
      toast({
        title: "✓ Banner aggiunto (locale)",
        description: "Salvato in localStorage. Applica la migration per renderlo visibile a tutti.",
      });
      setNewBannerUrl("");
      return;
    }

    setAdding(true);
    try {
      // Nuova posizione = max(position) + 1
      const nextPosition = banners.length
        ? Math.max(...banners.map((b) => b.position)) + 1
        : 1;

      const { data, error } = await (supabase as any)
        .from("app_banners")
        .insert({ image_path: newBannerUrl.trim(), position: nextPosition })
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "INSERT non ha aggiunto nessuna riga. RLS probabilmente blocca l'admin."
        );
      }

      // Refetch per allineare la lista (no race condition)
      await fetchBanners();

      toast({
        title: "✓ Banner aggiunto",
        description: "Il nuovo banner è stato salvato nel DB",
      });
      setNewBannerUrl("");
    } catch (e: any) {
      console.error("handleAddBanner error:", e);
      toast({
        title: "Errore aggiunta",
        description: e?.message ?? "Impossibile aggiungere il banner",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveBanner = async (banner: BannerRow) => {
    // Modalità LOCAL: rimuovi solo da localStorage
    if (localMode) {
      const updated = banners.filter((b) => b.id !== banner.id);
      setBanners(updated);
      saveLocalBanners(updated);
      toast({
        title: "✓ Banner rimosso (locale)",
        description: "Rimosso da localStorage. Applica la migration per propagarlo a tutti.",
      });
      return;
    }

    setDeletingId(banner.id);
    try {
      const { data, error } = await (supabase as any)
        .from("app_banners")
        .delete()
        .eq("id", banner.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "DELETE non ha rimosso nessuna riga. RLS probabilmente blocca l'admin."
        );
      }

      // Aggiornamento ottimistico locale + refetch finale per sicurezza
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
      toast({
        title: "✓ Banner rimosso",
        description: "Il banner è stato eliminato dal DB",
      });
    } catch (e: any) {
      console.error("handleRemoveBanner error:", e);
      toast({
        title: "Errore rimozione",
        description: e?.message ?? "Impossibile rimuovere il banner",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione Banner Pubblicitari</CardTitle>
        <CardDescription>
          Aggiungi, rimuovi o visualizza i banner pubblicitari in rotazione.
          I banner vengono mostrati ogni 3 minuti agli utenti free.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ⚠️ Warning: tabella DB non ancora creata. Si lavora in modalità LOCAL
            (per-browser). Applica la migration per persistenza globale. */}
        {localMode && (
          <div className="p-4 border-2 border-amber-500/50 rounded-lg bg-amber-50 dark:bg-amber-950/30 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                Modalità LOCAL — tabella DB non ancora applicata
              </h4>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              La tabella <code className="px-1 bg-amber-100 dark:bg-amber-900 rounded">public.app_banners</code>{" "}
              non esiste ancora sul database Lovable Cloud. Le modifiche fatte qui restano in{" "}
              <code className="px-1 bg-amber-100 dark:bg-amber-900 rounded">localStorage</code> del tuo browser
              e <strong>non sono visibili agli altri utenti</strong>. Per attivare la persistenza globale apri
              il <strong>SQL Editor di Lovable Cloud</strong> (Dashboard → Cloud → SQL) ed esegui lo script
              contenuto in <code className="px-1 bg-amber-100 dark:bg-amber-900 rounded">supabase/migrations/20260524172512_app_banners_table.sql</code>.
              Dopo l'esecuzione, ricarica questa pagina e tornerà automaticamente in modalità DB.
            </p>
          </div>
        )}

        {/* Add New Banner */}
        <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
          <Label htmlFor="bannerUrl">Aggiungi Nuovo Banner</Label>
          <div className="flex gap-2">
            <Input
              id="bannerUrl"
              placeholder="/images/banners/banner-10.gif"
              value={newBannerUrl}
              onChange={(e) => setNewBannerUrl(e.target.value)}
              disabled={adding}
            />
            <Button onClick={handleAddBanner} disabled={adding}>
              {adding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Aggiungi
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Inserisci il percorso del banner (es: /images/banners/nome-banner.gif)
          </p>
        </div>

        {/* Banner List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Banner Attivi ({banners.length})</h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : banners.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nessun banner configurato
            </p>
          ) : (
            <div className="grid gap-3">
              {banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded shrink-0">
                      #{index + 1}
                    </span>
                    <span className="text-sm truncate">{banner.image_path}</span>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewBanner(banner.image_path)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveBanner(banner)}
                      disabled={deletingId === banner.id}
                    >
                      {deletingId === banner.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {previewBanner && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewBanner(null)}
          >
            <div className="relative max-w-2xl w-full mx-4">
              <Button
                className="absolute -top-12 right-0 mb-2"
                variant="secondary"
                onClick={() => setPreviewBanner(null)}
              >
                Chiudi
              </Button>
              <img
                src={previewBanner}
                alt="Preview banner"
                className="w-full h-auto rounded-lg shadow-2xl"
              />
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
          <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
            ℹ️ Informazioni
          </h4>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>• I banner vengono mostrati in sequenza ogni 3 minuti</li>
            <li>• Ogni banner resta visibile per 8 secondi</li>
            <li>• Gli utenti premium (mensile e settimanale) non vedono i banner</li>
            <li>• La rotazione riprende dal primo banner quando finisce la lista</li>
            <li>• Modifiche persistenti su DB: visibili a TUTTI gli utenti</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
