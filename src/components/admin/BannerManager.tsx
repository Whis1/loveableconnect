import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// 📢 BannerManager: gestione banner pubblicitari, ora DB-backed.
//
// Prima il componente caricava i banner da src/data/banners.json e salvava
// solo su localStorage → modifiche per-browser, mai propagate ad altri utenti
// e non leggeva localStorage al mount (sembrava che 'ricomparissero' dopo
// reload). Ora SELECT/INSERT/DELETE sulla tabella public.app_banners,
// RLS pubblica in SELECT, admin-only in INSERT/DELETE.
interface BannerRow {
  id: string;
  image_path: string;
  position: number;
}

export const BannerManager = () => {
  const { toast } = useToast();
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      // any-cast: la tabella e' stata creata da migration, ma i types
      // generati su supabase/client non includono ancora app_banners.
      const { data, error } = await (supabase as any)
        .from("app_banners")
        .select("id, image_path, position")
        .order("position", { ascending: true });
      if (error) throw error;
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
