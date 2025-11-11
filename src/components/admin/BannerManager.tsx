import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import bannersData from "@/data/banners.json";

export const BannerManager = () => {
  const { toast } = useToast();
  const [banners, setBanners] = useState<string[]>(bannersData.banners);
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);

  const handleAddBanner = () => {
    if (!newBannerUrl) {
      toast({
        title: "Errore",
        description: "Inserisci un URL valido per il banner",
        variant: "destructive"
      });
      return;
    }

    const updatedBanners = [...banners, newBannerUrl];
    setBanners(updatedBanners);
    
    // Save to localStorage for persistence
    localStorage.setItem('adBanners', JSON.stringify(updatedBanners));
    
    toast({
      title: "✓ Banner aggiunto",
      description: "Il nuovo banner è stato aggiunto alla rotazione"
    });
    
    setNewBannerUrl("");
  };

  const handleRemoveBanner = (index: number) => {
    const updatedBanners = banners.filter((_, i) => i !== index);
    setBanners(updatedBanners);
    
    // Save to localStorage
    localStorage.setItem('adBanners', JSON.stringify(updatedBanners));
    
    toast({
      title: "✓ Banner rimosso",
      description: "Il banner è stato rimosso dalla rotazione"
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione Banner Pubblicitari</CardTitle>
        <CardDescription>
          Aggiungi, rimuovi o visualizza i banner pubblicitari in rotazione.
          I banner vengono mostrati ogni 6 minuti agli utenti free.
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
            />
            <Button onClick={handleAddBanner}>
              <Plus className="h-4 w-4 mr-2" />
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
          
          {banners.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nessun banner configurato
            </p>
          ) : (
            <div className="grid gap-3">
              {banners.map((banner, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      #{index + 1}
                    </span>
                    <span className="text-sm truncate">{banner}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewBanner(banner)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveBanner(index)}
                    >
                      <Trash2 className="h-4 w-4" />
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
            <li>• I banner vengono mostrati in sequenza ogni 6 minuti</li>
            <li>• Ogni banner resta visibile per 8 secondi</li>
            <li>• Gli utenti premium (mensile e settimanale) non vedono i banner</li>
            <li>• La rotazione riprende dal primo banner quando finisce la lista</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
