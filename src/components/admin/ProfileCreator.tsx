import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Users, Camera, Upload, X, Music, Link2 } from "lucide-react";
import { InterestsAutocomplete } from "@/components/InterestsAutocomplete";
import { SpotifySongSelector } from "@/components/SpotifySongSelector";

interface SpotifySong {
  id: string;
  name: string;
  artist: string;
  album: string;
  image_url: string | null;
  preview_url: string | null;
}

// 📋 Opzioni VALIDE per ogni campo: ALLINEATE 1:1 con quelle che vede
// l'utente normale in ProfileEdit.tsx (così i profili admin sono indistinguibili
// dai profili utente per UI e filtraggi).
//
// ⚠️ relationship_status usa valori ITALIANI in ProfileEdit (sposato/divorziato/...),
// non inglesi. Mantieni questi esatti, NON cambiarli.
const VALID_GENDERS = ["male", "female", "transgender", "genderfluid", "non-binary"];
const VALID_ORIENTATIONS = ["heterosexual", "homosexual", "bisexual", "pansexual"];
const VALID_REL_STATUS = ["single", "in_relationship", "sposato", "divorziato", "vedovo", "preferisco_non_dirlo"];
const VALID_REL_TYPES = ["serious", "casual", "friendship", "not-sure", "prefer-not-say"];

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// 🔧 Mappa varianti "dirty" (es. "in una relazione", "fidanzato/a") ai valori
// canonici accettati. Prima di randomizzare un campo, proviamo a recuperare
// il significato originale invece di buttarlo via.
const REL_STATUS_ALIASES: Record<string, string> = {
  "in una relazione": "in_relationship",
  "in_una_relazione": "in_relationship",
  "fidanzato": "in_relationship",
  "fidanzata": "in_relationship",
  "fidanzato/a": "in_relationship",
  "relationship": "in_relationship",
  "married": "sposato",
  "sposata": "sposato",
  "sposato/a": "sposato",
  "divorced": "divorziato",
  "divorziata": "divorziato",
  "divorziato/a": "divorziato",
  "widowed": "vedovo",
  "vedova": "vedovo",
  "vedovo/a": "vedovo",
  "prefer_not_say": "preferisco_non_dirlo",
  "preferisco non dirlo": "preferisco_non_dirlo",
};

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
    relationship_type: "",
    interests: [] as string[],
    // 🔗 Link immagini utente: usato dai chattors su /chattors per scegliere
    // le immagini da incollare nei messaggi (stesso campo di Gestione Profili).
    user_images_link: "",
  });

  // 📸 Avatar (foto profilo) + 6 foto galleria + max 4 canzoni Spotify
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [favoriteSongs, setFavoriteSongs] = useState<SpotifySong[]>([]);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const totalPhotos = photoFiles.length + files.length;
    if (totalPhotos > 6) {
      toast({
        title: "Limite raggiunto",
        description: "Massimo 6 foto galleria",
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    setPhotoFiles([...photoFiles, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setPhotoPreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    const newFiles = [...photoFiles];
    const newPreviews = [...photoPreviews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setPhotoFiles(newFiles);
    setPhotoPreviews(newPreviews);
  };

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

  // Post-processing dei profili admin appena creati:
  // 1. Forza interessi a count random 1-4 (anche se ne ha 0, pesca da pool)
  // 2. Normalizza gender/orientation/relationship_status/relationship_type ai
  //    valori VALIDI delle select del form (se l'edge function ne genera di
  //    "creativi", li sostituisce con uno random valido)
  // 3. Aggiunge 1-3 canzoni preferite random a ~50% dei profili che non ne
  //    hanno, dal pool di canzoni già usate
  const postProcessAdminProfiles = async () => {
    try {
      // Fetch di TUTTI i campi che vogliamo normalizzare
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, interests, favorite_songs, gender, sexual_orientation, relationship_status, relationship_type')
        .eq('is_admin_profile', true);

      if (!adminProfiles || adminProfiles.length === 0) return;

      // 📚 Pool di canzoni (deduplicato per id) dai profili che ne hanno
      const { data: songSources } = await supabase
        .from('profiles')
        .select('favorite_songs')
        .not('favorite_songs', 'is', null);

      const songPool: any[] = [];
      const seenIds = new Set<string>();
      for (const p of songSources || []) {
        const songs = Array.isArray(p.favorite_songs) ? (p.favorite_songs as any[]) : [];
        for (const s of songs) {
          if (s && s.id && !seenIds.has(s.id)) {
            seenIds.add(s.id);
            songPool.push(s);
          }
        }
      }

      // 🎯 Pool di interessi (dedup) dai profili che ne hanno: serve se un
      // profilo admin nuovo ha 0 interessi (gli assegnamo 1-4 random dal pool)
      const { data: interestSources } = await supabase
        .from('profiles')
        .select('interests')
        .not('interests', 'is', null);

      const interestPool = Array.from(
        new Set(
          (interestSources || []).flatMap((p) =>
            Array.isArray(p.interests) ? (p.interests as string[]) : []
          )
        )
      );

      // Per ogni profilo admin, costruisce l'update se serve
      const updates: Promise<any>[] = [];
      for (const p of adminProfiles as any[]) {
        const updateData: Record<string, unknown> = {};
        let needsUpdate = false;

        // 1) 🎯 INTERESSI: forza count random 1-4 SEMPRE
        const currentInterests = Array.isArray(p.interests)
          ? (p.interests as string[]).filter((i) => typeof i === "string" && i.trim())
          : [];
        const targetCount = 1 + Math.floor(Math.random() * 4); // 1..4

        if (currentInterests.length === 0 && interestPool.length > 0) {
          // Profilo SENZA interessi: pesca dal pool
          const shuffled = [...interestPool].sort(() => Math.random() - 0.5);
          updateData.interests = shuffled.slice(0, Math.min(targetCount, interestPool.length));
          needsUpdate = true;
        } else if (currentInterests.length > 4) {
          // Profilo con troppi interessi: tronca a 1-4 random
          const shuffled = [...currentInterests].sort(() => Math.random() - 0.5);
          updateData.interests = shuffled.slice(0, targetCount);
          needsUpdate = true;
        }
        // Se ha già 1-4 interessi, li lascia così

        // 2) 👤 GENDER: se valore non valido → random valido
        if (!p.gender || !VALID_GENDERS.includes(p.gender)) {
          updateData.gender = pickRandom(VALID_GENDERS);
          needsUpdate = true;
        }

        // 3) 🌈 ORIENTATION: se valore non valido → random valido
        if (!p.sexual_orientation || !VALID_ORIENTATIONS.includes(p.sexual_orientation)) {
          updateData.sexual_orientation = pickRandom(VALID_ORIENTATIONS);
          needsUpdate = true;
        }

        // 4) 💍 RELATIONSHIP STATUS: prima prova a mappare un valore "dirty"
        //    (es. "in una relazione" → "in_relationship"), altrimenti random.
        if (!p.relationship_status || !VALID_REL_STATUS.includes(p.relationship_status)) {
          const dirty = (p.relationship_status || "").toString().toLowerCase().trim();
          const aliased = REL_STATUS_ALIASES[dirty];
          updateData.relationship_status = aliased && VALID_REL_STATUS.includes(aliased)
            ? aliased
            : pickRandom(VALID_REL_STATUS);
          needsUpdate = true;
        }

        // 5) 💕 COSA CERCA (relationship_type): se valore non valido → random
        if (!p.relationship_type || !VALID_REL_TYPES.includes(p.relationship_type)) {
          updateData.relationship_type = pickRandom(VALID_REL_TYPES);
          needsUpdate = true;
        }

        // 6) 🎵 CANZONI: ~50% dei profili senza canzoni → 1-3 brani dal pool
        const currentSongs = Array.isArray(p.favorite_songs) ? (p.favorite_songs as any[]) : [];
        if (currentSongs.length === 0 && songPool.length > 0 && Math.random() < 0.5) {
          const shuffled = [...songPool].sort(() => Math.random() - 0.5);
          const count = 1 + Math.floor(Math.random() * 3); // 1..3
          updateData.favorite_songs = shuffled.slice(0, Math.min(count, songPool.length));
          needsUpdate = true;
        }

        if (needsUpdate) {
          updates.push(
            supabase.from('profiles').update(updateData).eq('id', p.id) as unknown as Promise<any>
          );
        }
      }

      await Promise.all(updates);
    } catch (e) {
      // Non bloccare il flusso: se il post-processing fallisce, i profili
      // sono comunque stati creati. L'utente può rieseguire.
      console.warn('Post-processing profili admin fallito:', e);
    }
  };

  const handleSeedProfiles = async () => {
    setSeedLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-profiles');

      if (error) throw error;

      // Sistemiamo i profili appena creati: max 4 interessi e qualche
      // canzone preferita random (la edge function ne crea con criteri
      // diversi, qui uniformiamo).
      await postProcessAdminProfiles();

      toast({
        title: "Profili caricati",
        description: `${data.count} profili creati (con interessi limitati a 4 e canzoni random aggiunte)`,
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

      // 📤 Upload avatar (se presente) → bucket profile-images
      let avatarPath: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const fileName = `${profileId}/avatar-${Date.now()}.${ext}`;
        const { error: avatarErr } = await supabase.storage
          .from("profile-images")
          .upload(fileName, avatarFile, { upsert: true });
        if (avatarErr) throw avatarErr;
        avatarPath = fileName;
      }

      // 📤 Upload foto galleria (se presenti) → bucket profile-images
      const photosPaths: string[] = [];
      for (const file of photoFiles) {
        const ext = file.name.split(".").pop();
        const fileName = `${profileId}/photo-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.${ext}`;
        const { error: photoErr } = await supabase.storage
          .from("profile-images")
          .upload(fileName, file);
        if (photoErr) throw photoErr;
        photosPaths.push(fileName);
      }

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
        relationship_type: formData.relationship_type || null,
        interests: formData.interests.length > 0 ? formData.interests : null,
        avatar_url: avatarPath,
        photos: photosPaths.length > 0 ? photosPaths : null,
        favorite_songs:
          favoriteSongs.length > 0
            ? JSON.parse(JSON.stringify(favoriteSongs))
            : null,
        user_images_link: formData.user_images_link.trim() || null,
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
        relationship_type: "",
        interests: [],
        user_images_link: "",
      });
      removeAvatar();
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setFavoriteSongs([]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Crea Nuovo Profilo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleSeedProfiles}
          disabled={seedLoading || loading}
          variant="secondary"
          className="w-full"
        >
          <Users className="h-4 w-4 mr-2" />
          {seedLoading ? "Caricamento..." : "Carica 50 Casuali"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">oppure crea manualmente</span>
          </div>
        </div>
        {/* 📸 Avatar (foto profilo) */}
        <div className="space-y-2">
          <Label>Foto profilo</Label>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          {avatarPreview ? (
            <div className="relative inline-block">
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-28 h-28 object-cover rounded-full border-4 border-primary/30 shadow-lg"
              />
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute -top-1 -right-1 h-7 w-7 rounded-full"
                onClick={removeAvatar}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="w-28 h-28 rounded-full border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <Camera className="h-6 w-6 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Carica</span>
            </button>
          )}
        </div>

        {/* 📷 Foto galleria (max 6) */}
        <div className="space-y-2">
          <Label>Foto galleria (max 6)</Label>
          <input
            ref={photosInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotosChange}
            className="hidden"
          />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {photoPreviews.map((preview, idx) => (
              <div key={idx} className="relative aspect-square">
                <img
                  src={preview}
                  alt={`Foto ${idx + 1}`}
                  className="w-full h-full object-cover rounded-lg border-2 border-primary/20"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
                  onClick={() => removePhoto(idx)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {photoFiles.length < 6 && (
              <button
                type="button"
                onClick={() => photosInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {photoFiles.length}/6
                </span>
              </button>
            )}
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
              <SelectItem value="in_relationship">Fidanzato/a</SelectItem>
              <SelectItem value="sposato">Sposato/a</SelectItem>
              <SelectItem value="divorziato">Divorziato/a</SelectItem>
              <SelectItem value="vedovo">Vedovo/a</SelectItem>
              <SelectItem value="preferisco_non_dirlo">Preferisco non dirlo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="relationship-type">Cosa cerchi</Label>
          <Select
            value={formData.relationship_type}
            onValueChange={(value) => setFormData({ ...formData, relationship_type: value })}
          >
            <SelectTrigger id="relationship-type">
              <SelectValue placeholder="Seleziona cosa cerchi" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="serious">Relazione seria</SelectItem>
              <SelectItem value="casual">Incontri casuali</SelectItem>
              <SelectItem value="friendship">Amicizia</SelectItem>
              <SelectItem value="not-sure">Non specificato</SelectItem>
              <SelectItem value="prefer-not-say">Preferisco non dirlo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Interessi (max 4)</Label>
          <InterestsAutocomplete
            selectedInterests={formData.interests}
            onInterestsChange={(interests) => setFormData({ ...formData, interests })}
            maxInterests={4}
          />
        </div>

        {/* 🎵 Canzoni preferite Spotify (max 4) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Music className="h-4 w-4 text-primary" />
            Canzoni preferite (max 4)
          </Label>
          <SpotifySongSelector
            selectedSongs={favoriteSongs}
            onSongsChange={setFavoriteSongs}
            maxSongs={4}
          />
        </div>

        {/* 🔗 Link immagini utente: usato dai chattors su /chattors per
            inserire link immagini nei messaggi. Stesso campo di Gestione
            Profili (user_images_link). */}
        <div className="space-y-2">
          <Label htmlFor="user-images-link" className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Aggiungi link immagini utente
          </Label>
          <Input
            id="user-images-link"
            type="url"
            placeholder="Incolla qui il link..."
            value={formData.user_images_link}
            onChange={(e) => setFormData({ ...formData, user_images_link: e.target.value })}
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
