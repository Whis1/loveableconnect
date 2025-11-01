import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Ban, ShieldCheck, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

export function UserBanManager() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [bannedUsersMap, setBannedUsersMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    loadAllUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(allUsers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        allUsers.filter(
          (user) =>
            user.nickname.toLowerCase().includes(query) ||
            user.full_name.toLowerCase().includes(query) ||
            user.id.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, allUsers]);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      // Use backend functions with service role to bypass RLS for admin tools
      const [{ data: profilesRes, error: profilesError }, { data: bannedRes, error: bannedError }] = await Promise.all([
        supabase.functions.invoke('admin-list-all-profiles'),
        supabase.functions.invoke('admin-list-banned-users')
      ]);

      if (profilesError || !profilesRes?.success) {
        throw new Error(profilesError?.message || profilesRes?.error || 'Failed to load profiles');
      }
      if (bannedError || !bannedRes?.success) {
        throw new Error(bannedError?.message || bannedRes?.error || 'Failed to load bans');
      }

      const profiles = (profilesRes.profiles || []).filter((p: any) => !p.is_admin_profile);
      const bannedUsers = (bannedRes.bans || []);

      // Create map of banned users for quick lookup
      const bannedMap = new Map<string, any>();
      bannedUsers.forEach((ban: any) => {
        bannedMap.set(ban.user_id, ban);
      });

      setAllUsers(profiles);
      setFilteredUsers(profiles);
      setBannedUsersMap(bannedMap);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: 'Errore',
        description: error?.message || 'Errore nel caricamento degli utenti',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectUser = async (user: any) => {
    setSelectedUser(user);
    const banData = bannedUsersMap.get(user.id);
    setIsBanned(!!banData);
    setBanReason(banData?.reason || "");
    
    // Load detailed user info
    setDetailsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-get-user-details', {
        body: { user_id: user.id },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Errore nel caricamento dei dettagli');
      }

      setUserDetails(data);
    } catch (error: any) {
      console.error('Error loading user details:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Errore nel caricamento dei dettagli utente',
        variant: 'destructive',
      });
      setUserDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };


  const handleBanUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-ban-user', {
        body: {
          user_id: selectedUser.id,
          reason: banReason || 'Ban amministrativo',
        },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Errore durante il ban');
      }

      setIsBanned(true);
      await loadAllUsers();
      toast({
        title: 'Utente bannato',
        description: `${selectedUser.nickname} è stato bannato con successo`,
      });
    } catch (error: any) {
      console.error('Error banning user:', error);
      toast({
        title: 'Errore',
        description: error.message || "Errore durante il ban dell'utente",
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-unban-user', {
        body: { user_id: selectedUser.id },
      });
      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Errore durante lo sban');
      }

      setIsBanned(false);
      setBanReason('');
      await loadAllUsers();
      toast({
        title: 'Utente sbannato',
        description: `${selectedUser.nickname} può ora accedere nuovamente`,
      });
    } catch (error: any) {
      console.error('Error unbanning user:', error);
      toast({
        title: 'Errore',
        description: error.message || "Errore durante lo sban dell'utente",
        variant: 'destructive',
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
            <Label htmlFor="search">Cerca utente (nickname, nome, ID)</Label>
            <Input
              id="search"
              placeholder="Cerca per nickname, nome o ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            onClick={loadAllUsers}
            disabled={loading}
            variant="outline"
            className="mt-6"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Ricarica
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Lista utenti */}
          <div className="space-y-2">
            <Label>Utenti trovati ({filteredUsers.length})</Label>
            <ScrollArea className="h-[500px] border rounded-lg p-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Caricamento...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nessun utente trovato
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => {
                    const isUserBanned = bannedUsersMap.has(user.id);
                    const isSelected = selectedUser?.id === user.id;
                    return (
                      <div
                        key={user.id}
                        onClick={() => selectUser(user)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>
                              {user.nickname.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">
                                {user.nickname}
                              </p>
                              {isUserBanned && (
                                <Ban className="h-4 w-4 text-destructive flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.full_name}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Dettagli utente selezionato */}
          <div className="space-y-2">
            <Label>Dettagli utente</Label>
            {selectedUser ? (
              <div className="h-[500px] border rounded-lg p-4 bg-muted/30 overflow-auto">
                {detailsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Caricamento dettagli...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={selectedUser.avatar_url} />
                        <AvatarFallback className="text-2xl">
                          {selectedUser.nickname.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold text-xl">
                          {selectedUser.nickname}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedUser.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          ID: {selectedUser.id}
                        </p>
                      </div>
                      {isBanned && (
                        <div className="flex flex-col items-center gap-1 text-destructive">
                          <Ban className="h-8 w-8" />
                          <span className="font-semibold text-xs">BANNATO</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 border-t pt-3">
                      <h4 className="font-semibold text-sm">Informazioni Base</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Età:</span>{" "}
                          <span className="font-medium">{selectedUser.age || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Genere:</span>{" "}
                          <span className="font-medium capitalize">
                            {selectedUser.gender === 'male' ? 'Maschio' : 
                             selectedUser.gender === 'female' ? 'Femmina' : 'N/A'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Orientamento:</span>{" "}
                          <span className="font-medium capitalize">
                            {selectedUser.sexual_orientation === 'heterosexual' ? 'Eterosessuale' :
                             selectedUser.sexual_orientation === 'homosexual' ? 'Omosessuale' :
                             selectedUser.sexual_orientation === 'bisexual' ? 'Bisessuale' : 'N/A'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Città:</span>{" "}
                          <span className="font-medium">{selectedUser.city || "N/A"}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Registrato il:</span>{" "}
                          <span className="font-medium">
                            {userDetails?.auth_created_at 
                              ? new Date(userDetails.auth_created_at).toLocaleString("it-IT", {
                                  dateStyle: "medium",
                                  timeStyle: "short"
                                })
                              : "N/A"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Metodo:</span>{" "}
                          <span className="font-medium">
                            {userDetails?.auth_provider === "google" ? "Google" : "Registrazione Standard"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {userDetails?.credits && (
                      <div className="space-y-3 border-t pt-3">
                        <h4 className="font-semibold text-sm">Abbonamento e Crediti</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <span className={`font-medium ${userDetails.credits.is_premium ? 'text-primary' : ''}`}>
                              {userDetails.credits.is_premium ? '⭐ Premium' : 'Free'}
                            </span>
                          </div>
                          {userDetails.credits.is_premium && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tipo:</span>
                                <span className="font-medium capitalize">
                                  {userDetails.credits.subscription_type === 'monthly' ? 'Mensile' : 
                                   userDetails.credits.subscription_type === 'weekly' ? 'Settimanale' : 'N/A'}
                                </span>
                              </div>
                              {userDetails.credits.premium_expires_at && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Scadenza:</span>
                                  <span className="font-medium">
                                    {new Date(userDetails.credits.premium_expires_at).toLocaleString("it-IT", {
                                      dateStyle: "medium",
                                      timeStyle: "short"
                                    })}
                                  </span>
                                </div>
                              )}
                              {userDetails.credits.premium_expires_at && (() => {
                                const now = new Date();
                                const expiry = new Date(userDetails.credits.premium_expires_at);
                                const diff = expiry.getTime() - now.getTime();
                                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                
                                return (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tempo rimanente:</span>
                                    <span className="font-medium">
                                      {diff > 0 
                                        ? `${days}g ${hours}h ${minutes}m`
                                        : 'Scaduto'}
                                    </span>
                                  </div>
                                );
                              })()}
                            </>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Crediti:</span>
                            <span className="font-medium">{userDetails.credits.balance || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Like giornalieri:</span>
                            <span className="font-medium">{userDetails.credits.daily_likes_remaining || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {userDetails?.purchases && userDetails.purchases.length > 0 && (
                      <div className="space-y-3 border-t pt-3">
                        <h4 className="font-semibold text-sm">Cronologia Acquisti ({userDetails.purchases.length})</h4>
                        <ScrollArea className="h-[150px]">
                          <div className="space-y-2">
                            {userDetails.purchases.map((purchase: any) => (
                              <div key={purchase.id} className="p-2 bg-background rounded-lg text-xs space-y-1">
                                <div className="flex justify-between">
                                  <span className="font-medium">
                                    {purchase.product_type === 'premium' ? '⭐ Abbonamento Premium' : 
                                     purchase.product_type === 'credits' ? '💎 Crediti' : 
                                     purchase.product_type}
                                  </span>
                                  <span className={`font-semibold ${
                                    purchase.status === 'completed' ? 'text-green-500' : 
                                    purchase.status === 'pending' ? 'text-yellow-500' : 
                                    'text-muted-foreground'
                                  }`}>
                                    {purchase.status === 'completed' ? '✓' : 
                                     purchase.status === 'pending' ? '⏳' : '✗'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                  <span>
                                    {new Date(purchase.created_at).toLocaleDateString("it-IT")}
                                  </span>
                                  <span className="font-medium">
                                    €{(purchase.amount_cents / 100).toFixed(2)}
                                  </span>
                                </div>
                                {purchase.credits_amount && (
                                  <div className="text-muted-foreground">
                                    {purchase.credits_amount} crediti
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    <div className="space-y-2 border-t pt-3">
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
              </div>
            ) : (
              <div className="h-[500px] border rounded-lg flex items-center justify-center text-muted-foreground">
                Seleziona un utente dalla lista
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
