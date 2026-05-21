import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Ban, ShieldCheck, RefreshCw, Send, AlertTriangle, EyeOff, Eye, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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
  const [inboxMessage, setInboxMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  // Profili senza account auth corrispondente (orfani): quando un account
  // viene cancellato da Lovable Cloud (auth.users), la riga in `profiles`
  // resta. Li individuiamo verificando in background ogni profilo con
  // admin-get-user-details: se non torna auth_email, e' orfano.
  const [orphanIds, setOrphanIds] = useState<Set<string>>(new Set());
  const [orphanCheckRunning, setOrphanCheckRunning] = useState(false);
  const [showOrphans, setShowOrphans] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  // Quando il delete fallisce mostriamo un dialog con SQL pronto da copiare,
  // perche' il toast scompare troppo in fretta per essere utile.
  const [deleteErrorInfo, setDeleteErrorInfo] = useState<
    { nickname: string; userId: string; message: string } | null
  >(null);

  useEffect(() => {
    loadAllUsers();
  }, []);

  useEffect(() => {
    const base = showOrphans
      ? allUsers
      : allUsers.filter((u) => !orphanIds.has(u.id));
    if (searchQuery.trim() === "") {
      setFilteredUsers(base);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        base.filter(
          (user) =>
            user.nickname.toLowerCase().includes(query) ||
            user.full_name.toLowerCase().includes(query) ||
            user.id.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, allUsers, orphanIds, showOrphans]);

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
      // Lancia il controllo orfani in background (non blocca la UI).
      void checkOrphans(profiles);
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

  // Verifica quali profili non hanno piu' un account auth.users corrispondente.
  // Fa una chiamata a admin-get-user-details per ogni profilo (in batch da 5
  // per non saturare le edge function). I profili senza auth_email vengono
  // marcati come orfani: nella lista vengono nascosti di default.
  const checkOrphans = async (profiles: any[]) => {
    if (profiles.length === 0) return;
    setOrphanCheckRunning(true);
    const detected = new Set<string>();
    const BATCH_SIZE = 5;
    try {
      for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
        const batch = profiles.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (p) => {
            try {
              const { data, error } = await supabase.functions.invoke(
                'admin-get-user-details',
                { body: { user_id: p.id } }
              );
              if (error || !data?.success) return { id: p.id, orphan: false };
              // auth_email mancante o vuoto = utente cancellato da auth.users
              const hasAuth = Boolean(data?.auth_email);
              return { id: p.id, orphan: !hasAuth };
            } catch {
              return { id: p.id, orphan: false };
            }
          })
        );
        results.forEach((r) => {
          if (r.orphan) detected.add(r.id);
        });
      }
      setOrphanIds(detected);
    } finally {
      setOrphanCheckRunning(false);
    }
  };

  // Tenta di eliminare un utente direttamente dalla tabella profiles.
  // Funziona solo se le RLS permettono agli admin il DELETE su profiles. In
  // caso contrario mostra un errore chiaro: l'eliminazione definitiva andra'
  // fatta da Lovable Cloud via SQL.
  //
  // Per i profili orfani (auth gia' cancellato) la rimozione e' definitiva.
  // Per gli utenti normali questa azione cancella solo la riga profile: il
  // record auth.users resta su Lovable Cloud finche' non lo elimini da li'.
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    const isOrphan = orphanIds.has(selectedUser.id);
    const confirmMsg = isOrphan
      ? `Eliminare definitivamente il profilo orfano "${selectedUser.nickname}"?`
      : `Eliminare definitivamente l'utente "${selectedUser.nickname}"?\n\n` +
        `Questa operazione cancella la riga del profilo dal database.\n` +
        `L'account auth (e-mail di login) NON viene rimosso da qui: per\n` +
        `cancellarlo del tutto vai anche su Lovable Cloud > Authentication\n` +
        `e rimuovi l'utente da li'.\n\n` +
        `Continuare?`;
    if (!confirm(confirmMsg)) return;
    setDeletingUser(true);
    try {
      // IMPORTANTE: usa .select() per sapere quante righe sono state davvero
      // cancellate. Senza .select(), supabase non torna errore neanche quando
      // le RLS bloccano il DELETE (silently fails: 0 righe affette, ma
      // "successo"). Con .select() data e' [] se nessuna riga e' stata
      // cancellata, e possiamo lanciare un errore chiaro all'utente.
      const { data: deletedRows, error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id)
        .select();
      if (error) throw error;
      const affected = Array.isArray(deletedRows) ? deletedRows.length : 0;
      if (affected === 0) {
        throw new Error(
          'RLS_BLOCKED: la cancellazione e\' stata bloccata dalle policy ' +
          'di sicurezza del database (Row Level Security). Vedi i dettagli ' +
          'sotto per sapere come risolvere.'
        );
      }
      toast({
        title: isOrphan ? 'Profilo eliminato' : 'Utente eliminato',
        description: isOrphan
          ? `Il profilo orfano "${selectedUser.nickname}" e' stato rimosso dal database.`
          : `Profilo di "${selectedUser.nickname}" rimosso. Ricordati di cancellare anche l'account auth da Lovable Cloud per la rimozione completa.`,
      });
      setSelectedUser(null);
      setUserDetails(null);
      await loadAllUsers();
    } catch (error: any) {
      console.error('Error deleting user profile:', error);
      // Salviamo i dati dell'errore in stato cosi' apriamo un dialog con il
      // testo SQL gia' pronto da copiare per Lovable Cloud (toast troppo
      // breve e scompare).
      setDeleteErrorInfo({
        nickname: selectedUser.nickname,
        userId: selectedUser.id,
        message: typeof error?.message === 'string' ? error.message : '',
      });
    } finally {
      setDeletingUser(false);
    }
  };

  // Copia negli appunti il comando SQL di cancellazione per Lovable Cloud.
  const copyDeleteSql = async () => {
    if (!deleteErrorInfo) return;
    const sql = `DELETE FROM profiles WHERE id = '${deleteErrorInfo.userId}';`;
    try {
      await navigator.clipboard.writeText(sql);
      toast({ title: 'SQL copiato', description: sql });
    } catch {
      toast({
        title: 'Copia non riuscita',
        description: sql,
        variant: 'destructive',
      });
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

  const handleSendInboxMessage = async () => {
    if (!selectedUser || !inboxMessage.trim()) {
      toast({
        title: 'Errore',
        description: 'Inserisci un messaggio da inviare',
        variant: 'destructive',
      });
      return;
    }

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('inbox_messages')
        .insert({
          user_id: selectedUser.id,
          message: inboxMessage.trim(),
        });

      if (error) throw error;

      toast({
        title: 'Messaggio inviato',
        description: `Il messaggio è stato inviato a ${selectedUser.nickname}`,
      });
      setInboxMessage('');
    } catch (error: any) {
      console.error('Error sending inbox message:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Errore durante l\'invio del messaggio',
        variant: 'destructive',
      });
    } finally {
      setSendingMessage(false);
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
          <Button
            onClick={() => setShowOrphans((v) => !v)}
            variant="outline"
            className="mt-6"
            title={
              showOrphans
                ? 'Nascondi profili senza account auth'
                : 'Mostra anche profili senza account auth (orfani)'
            }
          >
            {showOrphans ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {showOrphans ? 'Nascondi cancellati' : 'Mostra cancellati'}
          </Button>
        </div>

        {/* Riassunto orfani */}
        {(orphanIds.size > 0 || orphanCheckRunning) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
            {orphanCheckRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            )}
            <span>
              {orphanCheckRunning
                ? 'Verifica profili in corso...'
                : showOrphans
                  ? `${orphanIds.size} profili orfani (senza account auth) visibili nella lista.`
                  : `${orphanIds.size} profili orfani nascosti (account auth gia' cancellato).`}
            </span>
          </div>
        )}

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
                    const isOrphan = orphanIds.has(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => selectUser(user)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/10 border-primary"
                            : isOrphan
                              ? "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10"
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
                              {isOrphan && (
                                <span
                                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 flex-shrink-0"
                                  title="Profilo senza account auth (orfano)"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  CANCELLATO
                                </span>
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

                    {orphanIds.has(selectedUser.id) && (
                      <div className="border border-amber-500/40 bg-amber-500/10 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-semibold text-sm">Profilo orfano</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          L'account auth.users di questo utente e' stato cancellato (probabilmente da
                          Lovable Cloud), ma la riga in <code>profiles</code> e' rimasta. Puoi tentare
                          la rimozione qui sotto. Se l'operazione non e' permessa dalle RLS, esegui
                          su Lovable Cloud: <code>DELETE FROM profiles WHERE id = '{selectedUser.id}';</code>
                        </p>
                        <Button
                          onClick={handleDeleteUser}
                          disabled={deletingUser}
                          variant="destructive"
                          size="sm"
                          className="w-full"
                        >
                          {deletingUser ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Eliminazione in corso...
                            </>
                          ) : (
                            <>
                              <Ban className="h-4 w-4 mr-2" />
                              Elimina profilo orfano dal database
                            </>
                          )}
                        </Button>
                      </div>
                    )}

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
                          <span className="text-muted-foreground">Email:</span>{" "}
                          <span className="font-medium break-all">{userDetails?.auth_email || "N/A"}</span>
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

                    {/* Eliminazione utente: azione distruttiva, separata dal
                        ban perche' rimuove il profilo dal database. Per i
                        profili orfani il blocco ambra in alto resta la via
                        principale, ma questo bottone funziona ugualmente. */}
                    {!orphanIds.has(selectedUser.id) && (
                      <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-3 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Cancella la riga del profilo dal database. <strong>L'account
                          auth (e-mail di login) non viene rimosso da qui</strong>: per
                          eliminarlo del tutto vai anche su Lovable Cloud &gt;
                          Authentication.
                        </p>
                        <Button
                          onClick={handleDeleteUser}
                          disabled={deletingUser || loading}
                          variant="destructive"
                          className="w-full"
                        >
                          {deletingUser ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Eliminazione in corso...
                            </>
                          ) : (
                            <>
                              <Ban className="h-4 w-4 mr-2" />
                              Elimina Utente
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    <div className="space-y-2 border-t pt-3">
                      <Label htmlFor="inboxMessage">Invia messaggio all'utente</Label>
                      <Textarea
                        id="inboxMessage"
                        placeholder="Scrivi un messaggio da inviare nella inbox dell'utente..."
                        value={inboxMessage}
                        onChange={(e) => setInboxMessage(e.target.value)}
                        rows={3}
                      />
                      <Button
                        onClick={handleSendInboxMessage}
                        disabled={sendingMessage || !inboxMessage.trim()}
                        className="w-full"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {sendingMessage ? 'Invio in corso...' : 'Invia Messaggio Inbox'}
                      </Button>
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

      {/* Dialog mostrato quando l'eliminazione fallisce (RLS o altro errore).
          Il toast scompare in 5 secondi, ma qui l'utente puo' leggere con
          calma il problema e copiare l'SQL da incollare su Lovable Cloud. */}
      <Dialog
        open={!!deleteErrorInfo}
        onOpenChange={(open) => {
          if (!open) setDeleteErrorInfo(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Eliminazione bloccata
            </DialogTitle>
            <DialogDescription>
              Non sono riuscito a cancellare il profilo di{" "}
              <strong>{deleteErrorInfo?.nickname}</strong> direttamente dal sito.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
              <p className="font-semibold text-amber-700 dark:text-amber-400">
                Perche' non funziona?
              </p>
              <p className="text-muted-foreground">
                Le policy di sicurezza del database (Row Level Security) non
                permettono al client di cancellare righe dalla tabella{" "}
                <code className="text-foreground">profiles</code>. E' una
                protezione voluta: senza questa policy chiunque potrebbe
                cancellare account altrui. Per le cancellazioni serve passare
                da Lovable Cloud.
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-semibold">Soluzione rapida (1 minuto):</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Apri Lovable Cloud per il progetto LoveableConnect.</li>
                <li>
                  Vai su <strong>SQL Editor</strong> (o &laquo;Database &gt; SQL&raquo;).
                </li>
                <li>Incolla ed esegui il comando qui sotto.</li>
                <li>
                  Torna su questa pagina e premi <strong>Ricarica</strong>: il
                  profilo sara' sparito.
                </li>
              </ol>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Comando SQL da eseguire
              </p>
              <div className="rounded-lg bg-muted p-3 font-mono text-xs break-all border">
                DELETE FROM profiles WHERE id = '{deleteErrorInfo?.userId}';
              </div>
              <Button
                onClick={copyDeleteSql}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Copia comando SQL
              </Button>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="font-semibold">
                Soluzione definitiva (consigliata)
              </p>
              <p className="text-xs text-muted-foreground">
                Chiedi a Lovable di aggiungere una RLS policy che permette agli
                admin di cancellare i profili. Cosi' il bottone &laquo;Elimina
                Utente&raquo; funzionera' direttamente da qui, senza dover
                passare ogni volta dal SQL Editor. Vedi nella chat con
                l'assistente il testo gia' pronto da inviargli.
              </p>
            </div>

            {deleteErrorInfo?.message &&
              !deleteErrorInfo.message.startsWith('RLS_BLOCKED') && (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    Dettagli tecnici dell'errore
                  </p>
                  <p className="text-xs font-mono break-all">
                    {deleteErrorInfo.message}
                  </p>
                </div>
              )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteErrorInfo(null)}
              className="w-full"
            >
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
