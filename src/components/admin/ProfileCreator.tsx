import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Users } from "lucide-react";

export const ProfileCreator = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [formData, setFormData] = useState({
    nickname: "",
    age: "",
    birthdate: "",
    bio: "",
    gender: "",
    sexual_orientation: "",
    relationship_status: "",
    looking_for: [] as string[],
  });

  // Calcola automaticamente birthdate quando cambia l'età
  const handleAgeChange = (age: string) => {
    let birthdate = "";
    if (age && parseInt(age) > 0) {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - parseInt(age);
      birthdate = `${birthYear}-01-01`;
    }
    setFormData({ ...formData, age, birthdate });
  };

  const handleSeedProfiles = async () => {
    setSeedLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-profiles');

      if (error) throw error;

      toast({
        title: "Profili caricati",
        description: `${data.count} profili creati con successo!`,
      });

      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error("Error seeding profiles:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante il caricamento dei profili",
        variant: "destructive",
      });
    } finally {
      setSeedLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!formData.nickname) {
      toast({
        title: "Errore",
        description: "Inserisci almeno il nickname",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const profileId = crypto.randomUUID();
      console.log("Creating profile with ID:", profileId);

      const { data, error: profileError } = await supabase.from("profiles").insert({
        id: profileId,
        nickname: formData.nickname,
        full_name: formData.nickname,
        age: formData.age ? parseInt(formData.age) : null,
        birthdate: formData.birthdate || null,
        bio: formData.bio || null,
        gender: formData.gender || null,
        sexual_orientation: formData.sexual_orientation || null,
        relationship_status: formData.relationship_status || null,
        looking_for: formData.looking_for.length > 0 ? formData.looking_for : null,
        is_admin_profile: true,
      }).select();

      console.log("Insert result:", { data, error: profileError });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        throw profileError;
      }

      toast({
        title: "Profilo creato",
        description: `Profilo ${formData.nickname} creato con successo`,
      });

      setFormData({
        nickname: "",
        age: "",
        birthdate: "",
        bio: "",
        gender: "",
        sexual_orientation: "",
        relationship_status: "",
        looking_for: [],
      });

      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error("Error creating profile:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione del profilo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate50Profiles = async () => {
    if (!formData.nickname) {
      toast({
        title: "Errore",
        description: "Compila almeno il nickname per creare profili in batch",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const profiles = [];
      for (let i = 1; i <= 50; i++) {
        profiles.push({
          id: crypto.randomUUID(),
          nickname: `${formData.nickname}${i}`,
          full_name: `${formData.nickname}${i}`,
          age: formData.age ? parseInt(formData.age) : null,
          birthdate: formData.birthdate || null,
          bio: formData.bio || null,
          gender: formData.gender || null,
          sexual_orientation: formData.sexual_orientation || null,
          relationship_status: formData.relationship_status || null,
          looking_for: formData.looking_for.length > 0 ? formData.looking_for : null,
          is_admin_profile: true,
        });
      }

      const { error: profileError } = await supabase.from("profiles").insert(profiles);

      if (profileError) {
        console.error("Batch profile creation error:", profileError);
        throw profileError;
      }

      toast({
        title: "✓ 50 Profili creati",
        description: "I profili sono stati creati con successo",
      });

      setFormData({
        nickname: "",
        age: "",
        birthdate: "",
        bio: "",
        gender: "",
        sexual_orientation: "",
        relationship_status: "",
        looking_for: [],
      });

      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error("Error creating batch profiles:", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la creazione dei profili in batch",
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
          <UserPlus className="h-5 w-5" />
          Crea Nuovo Profilo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={handleSeedProfiles} 
            disabled={seedLoading || loading}
            variant="secondary"
            className="w-full"
          >
            <Users className="h-4 w-4 mr-2" />
            {seedLoading ? "Caricamento..." : "Carica 50 Casuali"}
          </Button>
          <Button 
            onClick={handleCreate50Profiles} 
            disabled={loading || seedLoading}
            variant="outline"
            className="w-full"
          >
            <Users className="h-4 w-4 mr-2" />
            {loading ? "Creando..." : "Aggiungi 50 con Criteri"}
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">oppure crea manualmente</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="nickname">Nickname *</Label>
          <Input
            id="nickname"
            value={formData.nickname}
            onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="age">Età (calcola data di nascita automaticamente)</Label>
          <Input
            id="age"
            type="number"
            value={formData.age}
            onChange={(e) => handleAgeChange(e.target.value)}
          />
          {formData.birthdate && (
            <p className="text-xs text-muted-foreground">
              Data di nascita calcolata: {new Date(formData.birthdate).toLocaleDateString('it-IT')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gender">Genere</Label>
            <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona genere" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Uomo</SelectItem>
                <SelectItem value="female">Donna</SelectItem>
                <SelectItem value="transgender">Transgender</SelectItem>
                <SelectItem value="genderfluid">Genderfluid</SelectItem>
                <SelectItem value="non-binary">Non binario</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="orientation">Orientamento Sessuale</Label>
            <Select value={formData.sexual_orientation} onValueChange={(value) => setFormData({ ...formData, sexual_orientation: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona orientamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heterosexual">Eterosessuale</SelectItem>
                <SelectItem value="homosexual">Omosessuale</SelectItem>
                <SelectItem value="bisexual">Bisessuale</SelectItem>
                <SelectItem value="pansexual">Pansexuale</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="relationship_status">Stato Relazione</Label>
          <Select value={formData.relationship_status} onValueChange={(value) => setFormData({ ...formData, relationship_status: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona stato" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="in_relationship">In una relazione</SelectItem>
              <SelectItem value="married">Sposato/a</SelectItem>
              <SelectItem value="divorced">Divorziato/a</SelectItem>
              <SelectItem value="widowed">Vedovo/a</SelectItem>
              <SelectItem value="prefer_not_say">Preferisco non dirlo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="looking_for">Cosa cerchi (separato da virgole)</Label>
          <Input
            id="looking_for"
            placeholder="Es: Relazione seria, Amicizia, ..."
            value={formData.looking_for.join(", ")}
            onChange={(e) => setFormData({ 
              ...formData, 
              looking_for: e.target.value.split(",").map(s => s.trim()).filter(s => s) 
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={3}
          />
        </div>

        <Button onClick={handleCreateProfile} disabled={loading} className="w-full">
          {loading ? "Creando..." : "Crea Profilo"}
        </Button>
      </CardContent>
    </Card>
  );
};
