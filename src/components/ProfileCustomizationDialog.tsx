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
import { Heart, Lock, Crown, Check, Sparkles, Gamepad2, User, Music } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SpotifySongCard } from "@/components/SpotifySongCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PROFILE_THEMES, getProfileTheme, type ProfileThemeId } from "@/lib/profileThemes";
import {
  getGenderLabel,
  getOrientationLabel,
  getRelationshipStatusLabel,
  getRelationshipTypeLabel,
} from "@/lib/profileLabels";
import { ProfileGridCard } from "@/components/ProfileGridCard";
import { PremiumBadge } from "@/components/PremiumBadge";

interface ProfileCustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  /** Profilo completo (per renderizzare la card di bacheca reale). */
  profile: any;
  currentUserId: string;
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
  profile,
  currentUserId,
  nickname,
  avatarUrl,
  age,
  isPremium,
  currentTheme,
  onSaved,
}: ProfileCustomizationDialogProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
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
          {/* Card esterna (bacheca) — componente REALE, esattamente come la
              vedono gli altri utenti nella bacheca. */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Card esterna (bacheca)
            </div>
            {/* pointer-events-none: anteprima visiva, niente like/chat su se stessi.
                profile_theme: selected → la card mostra il tema in anteprima. */}
            <div className="pointer-events-none select-none">
              <ProfileGridCard
                profile={{ ...profile, profile_theme: selected }}
                currentUserId={currentUserId}
                onLike={() => {}}
              />
            </div>
          </div>

          {/* Card interna (scheda che si apre cliccando la card esterna).
              Altezza pari alla card esterna (stretch della griglia) + scroll
              interno per i contenuti, cosi' il pannello non diventa lunghissimo. */}
          <div className="space-y-2 flex flex-col">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Card interna (profilo aperto)
            </div>
            <div className="relative flex-1 min-h-[500px]">
              <div className={`absolute inset-0 ${theme.frameClass} h-full`}>
                <div className="h-full rounded-[0.8rem] overflow-hidden border border-border bg-card shadow-lg flex flex-col">
                  {/* Header con foto verticale grande, come nella scheda reale */}
                  <div className="relative shrink-0 px-4 pt-5 pb-3 bg-gradient-to-br from-primary/20 via-primary/10 to-background flex flex-col items-center">
                  {/* Contorno della foto tematizzato col tema selezionato. */}
                  <div className={theme.frameClass}>
                    <div className="relative w-40 h-48 rounded-2xl border-4 border-background shadow-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-7xl font-bold text-primary/40">
                          {initial}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    </div>
                  </div>
                </div>
                {/* Contenuto come la scheda reale: nome + pill eta'/genere/
                    orientamento + Bio + Stato relazionale + Cerca.
                    NB: nessun luogo (nella scheda del proprio profilo e'
                    nascosto, niente "vicino alle tue parti"). */}
                <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-3">
                  <div className="text-center space-y-2">
                    {theme.badge && (
                      <div className="flex justify-center">
                        <PremiumBadge />
                      </div>
                    )}
                    <div
                      className={`text-xl font-black ${
                        theme.nameClass || "bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent"
                      }`}
                    >
                      {nickname}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {age != null && (
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {age} {t("userProfile.years")}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                        <User className="h-3 w-3" /> {getGenderLabel(t, profile?.gender)}
                      </span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 text-xs font-semibold">
                        <User className="h-3 w-3" /> {getOrientationLabel(t, profile?.sexual_orientation)}
                      </span>
                    </div>
                  </div>

                  {profile?.bio && (
                    <div className="rounded-xl border border-border/50 bg-card/60 p-3">
                      <div className="flex items-center gap-1.5 text-sm font-semibold mb-1">
                        <User className={`h-4 w-4 ${theme.iconClass || "text-primary"}`} /> <span className={theme.nameClass}>Bio</span>
                      </div>
                      <p className="text-xs text-muted-foreground italic">"{profile.bio}"</p>
                    </div>
                  )}

                  <div className="rounded-xl border border-border/50 bg-card/60 p-3">
                    <div className="flex items-center gap-1.5 text-sm font-semibold mb-1">
                      <User className={`h-4 w-4 ${theme.iconClass || "text-primary"}`} /> <span className={theme.nameClass}>{t("common.relationshipStatus")}</span>
                    </div>
                    <div className="text-xs font-medium">
                      {getRelationshipStatusLabel(t, profile?.relationship_status)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center gap-1.5 text-sm font-semibold mb-1">
                      <User className={`h-4 w-4 ${theme.iconClass || "text-primary"}`} /> <span className={theme.nameClass}>{t("common.lookingFor")}</span>
                    </div>
                    <div className="text-xs font-medium">
                      {getRelationshipTypeLabel(t, profile?.relationship_type)}
                    </div>
                  </div>

                  {/* Interessi: solo se l'utente ne ha inseriti. */}
                  {profile?.interests && profile.interests.length > 0 && (
                    <div className="rounded-xl border border-border/50 bg-card/60 p-3">
                      <div className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                        <User className={`h-4 w-4 ${theme.iconClass || "text-primary"}`} /> <span className={theme.nameClass}>{t("common.interests")}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.interests.map((interest: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Canzoni preferite: solo se l'utente ne ha inserite. */}
                  {profile?.favorite_songs && profile.favorite_songs.length > 0 && (
                    <div className="rounded-xl border border-border/50 bg-card/60 p-3">
                      <div className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                        <Music className={`h-4 w-4 ${theme.iconClass || "text-primary"}`} /> <span className={theme.nameClass}>Canzoni Preferite</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {profile.favorite_songs.map((song: any, i: number) => (
                          <SpotifySongCard key={i} song={song} size="small" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Avatar negli altri contesti */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Come ti vedono gli altri utenti
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
