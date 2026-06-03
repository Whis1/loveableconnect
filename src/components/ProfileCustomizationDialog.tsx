import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Lock, Crown, Check, Sparkles, Gamepad2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PROFILE_THEMES, getProfileTheme, type ProfileThemeId } from "@/lib/profileThemes";

interface ProfileCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  city?: string | null;
  age?: number | null;
  isPremium: boolean;
  currentTheme: ProfileThemeId;
  onSaved: (theme: ProfileThemeId) => void;
}

export const ProfileCustomizationDialog = ({
  open,
  onOpenChange,
  userId,
  nickname,
  avatarUrl,
  city,
  age,
  isPremium,
  currentTheme,
  onSaved,
}: ProfileCustomizationDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selected, setSelected] = useState<ProfileThemeId>(currentTheme);
  const [saving, setSaving] = useState(false);

  const theme = getProfileTheme(selected);
  const initial = (nickname?.charAt(0) || "?").toUpperCase();
  const locked = theme.premium && !isPremium;

  const handleSelect = (id: ProfileThemeId) => {
    const t = getProfileTheme(id);
    if (t.comingSoon) return;
    setSelected(id);
  };

  const handleSave = async () => {
    // Tema riservato e utente non Premium → invito all'upgrade.
    if (locked) {
      onOpenChange(false);
      navigate("/credits");
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase.from("profiles") as any)
        .update({ profile_theme: selected })
        .eq("id", userId);
      if (error) throw error;
      onSaved(selected);
      toast({
        title: "Personalizzazione salvata",
        description: selected === "none" ? "Tema rimosso dal profilo." : `Tema "${theme.name}" applicato al tuo profilo.`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const AvatarVisual = ({ className }: { className: string }) => (
    <div className={className}>
      <div className="h-full w-full rounded-full overflow-hidden bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-white font-bold text-xl">{initial}</span>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Personalizzazione
          </DialogTitle>
          <DialogDescription>
            Scegli un tema estetico e guarda in tempo reale come ti vedono gli altri utenti.
          </DialogDescription>
        </DialogHeader>

        {/* Selettore temi */}
        <div className="flex flex-wrap gap-2">
          {PROFILE_THEMES.map((th) => {
            const active = th.id === selected;
            const thLocked = th.premium && !isPremium;
            return (
              <button
                key={th.id}
                type="button"
                onClick={() => handleSelect(th.id)}
                disabled={th.comingSoon}
                className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 transition-all ${
                  active ? "border-amber-500 ring-2 ring-amber-400/50" : "border-border hover:border-primary/50"
                } ${th.comingSoon ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className="h-6 w-6 rounded-full border border-white/40 shadow"
                  style={{ background: th.swatch }}
                />
                <span className="text-sm font-medium">{th.name}</span>
                {active && !th.comingSoon && <Check className="h-4 w-4 text-amber-500" />}
                {thLocked && !th.comingSoon && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                {th.comingSoon && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Presto</Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Descrizione tema + nota lucchetto */}
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          {theme.description}
          {locked && (
            <div className="mt-1.5 flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
              <Crown className="h-4 w-4" /> Riservato agli abbonati Premium.
            </div>
          )}
        </div>

        {/* Anteprime card */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Card esterna (bacheca) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Card esterna (bacheca)
            </div>
            <div className={theme.frameClass}>
              <div className="rounded-[0.8rem] overflow-hidden border border-border bg-card shadow-lg">
                <div className="aspect-[3/4] bg-gradient-to-br from-pink-500/20 to-purple-600/10 relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-6xl font-black text-primary/30">
                      {initial}
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <div className={`text-lg font-bold ${theme.nameClass || "text-foreground"}`}>
                    {nickname}{age ? `, ${age}` : ""}
                  </div>
                  {city && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {city}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <span className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-primary/10 text-primary text-xs py-1.5">
                      <Heart className="h-3.5 w-3.5" /> Like
                    </span>
                    <span className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-secondary/10 text-secondary text-xs py-1.5">
                      <MessageCircle className="h-3.5 w-3.5" /> Chat
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card interna (profilo) */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Card interna (profilo)
            </div>
            <div className={theme.frameClass}>
              <div className="rounded-[0.8rem] border border-border bg-card shadow-lg p-5 flex flex-col items-center text-center gap-3">
                <AvatarVisual className={`h-24 w-24 ${theme.avatarClass}`} />
                <div
                  className={`text-xl font-black ${
                    theme.nameClass || "bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent"
                  }`}
                >
                  {nickname}
                </div>
                {(city || age) && (
                  <div className="text-xs text-muted-foreground">
                    {[age ? `${age} anni` : null, city].filter(Boolean).join(" · ")}
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px]">Relazione</span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[11px]">Musica</span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px]">Viaggi</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Avatar negli altri contesti */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Avatar negli altri contesti
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "I tuoi match", Icon: Heart },
              { label: "Like ricevuti", Icon: Heart },
              { label: "Sfide", Icon: Gamepad2 },
            ].map(({ label, Icon }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card/50 p-3"
              >
                <AvatarVisual className={`h-14 w-14 ${theme.avatarClass}`} />
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Icon className="h-3 w-3" /> {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          {locked ? (
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
            >
              <Crown className="h-4 w-4 mr-2" /> Sblocca con Premium
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvataggio..." : "Salva personalizzazione"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
