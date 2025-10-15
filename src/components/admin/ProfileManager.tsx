import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, MessageSquare, Save, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Profile {
  id: string;
  nickname: string;
  full_name: string;
  age: number | null;
  bio: string | null;
  city: string | null;
  gender: string | null;
  sexual_orientation: string | null;
  relationship_status: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  photos: string[] | null;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  sender_profile?: { nickname: string; avatar_url?: string };
  receiver_profile?: { nickname: string; avatar_url?: string };
}

export const ProfileManager = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error("Error fetching profiles:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i profili",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileMessages = async (profileId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          created_at,
          sender_id,
          receiver_id,
          sender_profile:profiles!messages_sender_id_fkey(nickname, avatar_url),
          receiver_profile:profiles!messages_receiver_id_fkey(nickname, avatar_url)
        `)
        .or(`sender_id.eq.${profileId},receiver_id.eq.${profileId}`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setMessages(data as any || []);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i messaggi",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleUpdateProfile = async (profile: Profile) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nickname: profile.nickname,
          full_name: profile.full_name,
          age: profile.age,
          bio: profile.bio,
          city: profile.city,
          gender: profile.gender,
          sexual_orientation: profile.sexual_orientation,
          relationship_status: profile.relationship_status,
          interests: profile.interests,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Profilo aggiornato",
        description: "Le modifiche sono state salvate",
      });

      fetchProfiles();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleInterestsChange = (profileId: string, value: string) => {
    const interests = value.split(",").map((i) => i.trim()).filter(Boolean);
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      const updated = { ...profile, interests };
      setProfiles(profiles.map((p) => (p.id === profileId ? updated : p)));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Caricamento profili...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestione Profili ({profiles.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <Accordion type="single" collapsible className="space-y-2">
            {profiles.map((profile) => (
              <AccordionItem key={profile.id} value={profile.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>{profile.nickname[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-semibold">{profile.nickname}</p>
                      <p className="text-sm text-muted-foreground">{profile.full_name}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    {/* Info Base */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nickname</Label>
                        <Input
                          value={profile.nickname}
                          onChange={(e) => {
                            const updated = { ...profile, nickname: e.target.value };
                            setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <Input
                          value={profile.full_name}
                          onChange={(e) => {
                            const updated = { ...profile, full_name: e.target.value };
                            setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Età</Label>
                        <Input
                          type="number"
                          value={profile.age || ""}
                          onChange={(e) => {
                            const updated = { ...profile, age: parseInt(e.target.value) || null };
                            setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Città</Label>
                        <Input
                          value={profile.city || ""}
                          onChange={(e) => {
                            const updated = { ...profile, city: e.target.value };
                            setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                          }}
                        />
                      </div>
                    </div>

                    {/* Genere e Orientamento */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Genere</Label>
                        <Select
                          value={profile.gender || ""}
                          onValueChange={(value) => {
                            const updated = { ...profile, gender: value };
                            setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona genere" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Uomo</SelectItem>
                            <SelectItem value="female">Donna</SelectItem>
                            <SelectItem value="non-binary">Non binario</SelectItem>
                            <SelectItem value="other">Altro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Orientamento Sessuale</Label>
                        <Select
                          value={profile.sexual_orientation || ""}
                          onValueChange={(value) => {
                            const updated = { ...profile, sexual_orientation: value };
                            setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona orientamento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="heterosexual">Eterosessuale</SelectItem>
                            <SelectItem value="homosexual">Omosessuale</SelectItem>
                            <SelectItem value="bisexual">Bisessuale</SelectItem>
                            <SelectItem value="pansexual">Pansessuale</SelectItem>
                            <SelectItem value="asexual">Asessuale</SelectItem>
                            <SelectItem value="other">Altro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Stato Relazione */}
                    <div className="space-y-2">
                      <Label>Stato Relazione</Label>
                      <Select
                        value={profile.relationship_status || ""}
                        onValueChange={(value) => {
                          const updated = { ...profile, relationship_status: value };
                          setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona stato" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="in_relationship">In una relazione</SelectItem>
                          <SelectItem value="married">Sposato/a</SelectItem>
                          <SelectItem value="divorced">Divorziato/a</SelectItem>
                          <SelectItem value="widowed">Vedovo/a</SelectItem>
                          <SelectItem value="complicated">È complicato</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Interessi */}
                    <div className="space-y-2">
                      <Label>Interessi (separati da virgola)</Label>
                      <Input
                        value={profile.interests?.join(", ") || ""}
                        onChange={(e) => handleInterestsChange(profile.id, e.target.value)}
                        placeholder="Es: Cinema, Sport, Viaggi"
                      />
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <Textarea
                        value={profile.bio || ""}
                        onChange={(e) => {
                          const updated = { ...profile, bio: e.target.value };
                          setProfiles(profiles.map((p) => (p.id === profile.id ? updated : p)));
                        }}
                        rows={3}
                        placeholder="Scrivi qualcosa su di te..."
                      />
                    </div>

                    {/* Azioni */}
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => handleUpdateProfile(profile)} className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Salva Modifiche
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedProfile(profile);
                              fetchProfileMessages(profile.id);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Chat di {profile.nickname}</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="h-[500px] pr-4">
                            {loadingMessages ? (
                              <p className="text-muted-foreground">Caricamento...</p>
                            ) : messages.length === 0 ? (
                              <p className="text-muted-foreground">Nessun messaggio</p>
                            ) : (
                              <div className="space-y-3">
                                {messages.map((msg) => (
                                  <div key={msg.id} className="border rounded-lg p-3 space-y-2">
                                    <div className="flex items-center gap-2 text-sm">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={msg.sender_profile?.avatar_url} />
                                        <AvatarFallback>
                                          {msg.sender_profile?.nickname?.[0]?.toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="font-semibold">
                                        {msg.sender_profile?.nickname}
                                      </span>
                                      <span className="text-muted-foreground">→</span>
                                      <span>{msg.receiver_profile?.nickname}</span>
                                      <span className="ml-auto text-xs text-muted-foreground">
                                        {new Date(msg.created_at).toLocaleString("it-IT")}
                                      </span>
                                    </div>
                                    <p className="text-sm">{msg.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
