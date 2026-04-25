import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Sparkles, Plus, X, Camera } from "lucide-react";
import { toast } from "sonner";

const ALL_INTERESTS = [
  "arte", "musica", "viaggi", "cinema", "libri", "yoga", "cucina", "fotografia",
  "natura", "astrologia", "danza", "teatro", "trekking", "vino", "caffè", "scrittura"
];

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: "", bio: "", age: "", gender: "", city: "", interests: [], photos: [], picture: "",
  });
  const [newPhoto, setNewPhoto] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        bio: user.bio || "",
        age: user.age || "",
        gender: user.gender || "",
        city: user.city || "",
        interests: user.interests || [],
        photos: user.photos || [],
        picture: user.picture || "",
      });
    }
  }, [user]);

  const toggleInterest = (i) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(i) ? f.interests.filter(x => x !== i) : [...f.interests, i],
    }));
  };

  const addPhoto = () => {
    if (!newPhoto.trim()) return;
    setForm((f) => ({ ...f, photos: [...f.photos, newPhoto.trim()] }));
    setNewPhoto("");
  };

  const removePhoto = (idx) => {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/users/me", {
        name: form.name,
        bio: form.bio,
        age: form.age ? parseInt(form.age) : null,
        gender: form.gender || null,
        city: form.city,
        interests: form.interests,
        photos: form.photos,
        picture: form.picture || null,
      });
      await refreshUser();
      toast.success("Profilo aggiornato ✦");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Salvataggio fallito");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const mainPhoto = form.picture || form.photos[0];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 lg:py-14" data-testid="dashboard-page">
      <div className="mb-10">
        <span className="text-overline text-[#E6C998] flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" />Il mio profilo</span>
        <h1 className="font-[Cormorant_Garamond] text-4xl sm:text-5xl text-[#F0F3F5] mt-2">
          Disegna il tuo cosmo, <em className="text-[#E6C998] not-italic">{user.name}</em>
        </h1>
        <p className="text-sm text-[#8F9CAE] mt-2 max-w-xl">Più dettagli aggiungi, più ti riconosceranno tra le stelle.</p>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-8">
        {/* Profile preview */}
        <div className="glass rounded-2xl p-6 h-fit lg:sticky lg:top-24" data-testid="profile-preview">
          <div className="aspect-[4/5] rounded-xl overflow-hidden bg-[#162032] mb-4 relative">
            {mainPhoto ? (
              <img src={mainPhoto} alt="profilo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#475B7A]">
                <Camera className="h-10 w-10 mb-2" />
                <span className="text-xs">Aggiungi una foto</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#040710] via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <p className="font-[Cormorant_Garamond] text-2xl text-[#F0F3F5]">
                {form.name || "Tu"}{form.age ? `, ${form.age}` : ""}
              </p>
              {form.city && <p className="text-xs text-[#E6C998]">{form.city}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {form.interests.slice(0, 6).map((i) => (
              <Badge key={i} variant="outline" className="border-[#E6C998]/30 text-[#E6C998] bg-transparent text-[10px]">
                {i}
              </Badge>
            ))}
          </div>
        </div>

        {/* Edit form */}
        <div className="space-y-6">
          <section className="glass rounded-2xl p-6 sm:p-8 space-y-5">
            <h2 className="font-[Cormorant_Garamond] text-2xl text-[#F0F3F5]">Identità</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#8F9CAE] uppercase tracking-wider">Nome</Label>
                <Input data-testid="profile-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 bg-[#162032]/50 border-[#233045] rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#8F9CAE] uppercase tracking-wider">Età</Label>
                <Input type="number" min="18" max="99" data-testid="profile-age-input" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="h-11 bg-[#162032]/50 border-[#233045] rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#8F9CAE] uppercase tracking-wider">Genere</Label>
                <Select value={form.gender || undefined} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger data-testid="profile-gender-select" className="h-11 bg-[#162032]/50 border-[#233045] rounded-xl">
                    <SelectValue placeholder="Seleziona" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0D1526] border-[#233045] text-[#F0F3F5]">
                    <SelectItem value="donna">Donna</SelectItem>
                    <SelectItem value="uomo">Uomo</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#8F9CAE] uppercase tracking-wider">Città</Label>
                <Input data-testid="profile-city-input" placeholder="Roma, Milano…" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-11 bg-[#162032]/50 border-[#233045] rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#8F9CAE] uppercase tracking-wider">Bio</Label>
              <Textarea data-testid="profile-bio-input" rows={4} placeholder="Raccontati in qualche frase…" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="bg-[#162032]/50 border-[#233045] rounded-xl resize-none" />
            </div>
          </section>

          <section className="glass rounded-2xl p-6 sm:p-8 space-y-5">
            <h2 className="font-[Cormorant_Garamond] text-2xl text-[#F0F3F5]">Foto</h2>
            <p className="text-xs text-[#8F9CAE]">Incolla URL di immagini (Unsplash, Imgur, Cloudinary…). La prima sarà la copertina.</p>
            <div className="flex gap-2">
              <Input
                data-testid="profile-photo-url-input"
                placeholder="https://…"
                value={newPhoto}
                onChange={(e) => setNewPhoto(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPhoto())}
                className="h-11 bg-[#162032]/50 border-[#233045] rounded-xl"
              />
              <Button type="button" data-testid="profile-add-photo-btn" onClick={addPhoto} className="h-11 rounded-xl bg-[#E6C998] text-[#040710] hover:bg-[#E6C998]/90">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {form.photos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden group" data-testid={`profile-photo-${i}`}>
                  <img src={p} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    data-testid={`profile-remove-photo-${i}`}
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 grid place-items-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                  {i === 0 && (
                    <div className="absolute bottom-1 left-1 text-[9px] uppercase tracking-wider text-[#040710] bg-[#E6C998] px-1.5 rounded">Copertina</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="glass rounded-2xl p-6 sm:p-8 space-y-4">
            <h2 className="font-[Cormorant_Garamond] text-2xl text-[#F0F3F5]">Interessi</h2>
            <p className="text-xs text-[#8F9CAE]">Scegli ciò che illumina le tue serate</p>
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map((i) => {
                const active = form.interests.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    data-testid={`interest-toggle-${i}`}
                    onClick={() => toggleInterest(i)}
                    className={`px-4 py-2 rounded-full text-sm transition-all duration-300 ${
                      active
                        ? "bg-[#E6C998] text-[#040710] shadow-[0_0_15px_rgba(230,201,152,0.3)]"
                        : "bg-[#162032]/50 text-[#8F9CAE] hover:text-[#F0F3F5] border border-[#233045]"
                    }`}
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="flex justify-end pt-2">
            <Button
              data-testid="profile-save-btn"
              onClick={handleSave}
              disabled={saving}
              className="h-12 px-8 rounded-full bg-[#E6C998] text-[#040710] hover:bg-[#E6C998]/90 gold-glow font-medium transition-all duration-300 hover:-translate-y-0.5"
            >
              {saving ? "Salvataggio…" : "Salva il mio cosmo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
