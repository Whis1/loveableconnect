import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Ban, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

export function UserBanManager() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [loading, setLoading] = useState(false);

  const searchUser = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci un nickname da cercare",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Search for user profile by nickname
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("nickname", searchQuery.trim())
        .single();

      if (error || !profile) {
        toast({
          title: "Utente non trovato",
          description: "Nessun utente con questo nickname",
          variant: "destructive",
        });
        setUserProfile(null);
        setIsBanned(false);
        return;
      }

      setUserProfile(profile);

      // Check if user is banned
      const { data: banData } = await supabase
        .from("banned_users")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle();

      setIsBanned(!!banData);
      setBanReason(banData?.reason || "");

      toast({
        title: "Utente trovato",
        description: `${profile.nickname} - ${banData ? "BANNATO" : "Attivo"}`,
      });
    } catch (error) {
      console.error("Error searching user:", error);
      toast({
        title: "Errore",
        description: "Errore durante la ricerca dell'utente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!userProfile) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Errore",
          description: "Devi essere autenticato",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("banned_users").insert({
        user_id: userProfile.id,
        banned_by: user.id,
        reason: banReason || "Ban amministrativo",
      });

      if (error) throw error;

      setIsBanned(true);
      toast({
        title: "Utente bannato",
        description: `${userProfile.nickname} è stato bannato con successo`,
      });
    } catch (error: any) {
      console.error("Error banning user:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante il ban dell'utente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!userProfile) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("banned_users")
        .delete()
        .eq("user_id", userProfile.id);

      if (error) throw error;

      setIsBanned(false);
      setBanReason("");
      toast({
        title: "Utente sbannato",
        description: `${userProfile.nickname} può ora accedere nuovamente`,
      });
    } catch (error: any) {
      console.error("Error unbanning user:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante lo sban dell'utente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Gestione Ban Utenti
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="search">Cerca per nickname</Label>
            <Input
              id="search"
              placeholder="Inserisci nickname..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && searchUser()}
            />
          </div>
          <Button
            onClick={searchUser}
            disabled={loading}
            className="mt-6"
          >
            <Search className="h-4 w-4 mr-2" />
            Cerca
          </Button>
        </div>

        {userProfile && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={userProfile.avatar_url} />
                <AvatarFallback>{userProfile.nickname.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{userProfile.nickname}</h3>
                <p className="text-sm text-muted-foreground">{userProfile.full_name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  UUID: {userProfile.id}
                </p>
              </div>
              {isBanned && (
                <div className="flex items-center gap-2 text-destructive">
                  <Ban className="h-5 w-5" />
                  <span className="font-semibold">BANNATO</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo del ban</Label>
              <Textarea
                id="reason"
                placeholder="Inserisci il motivo del ban..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                disabled={isBanned}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              {!isBanned ? (
                <Button
                  onClick={handleBanUser}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Banna Utente
                </Button>
              ) : (
                <Button
                  onClick={handleUnbanUser}
                  disabled={loading}
                  variant="default"
                  className="flex-1"
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Rimuovi Ban
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
