import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguageDetection } from "@/hooks/useLanguageDetection";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  useLanguageDetection();
  
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState<"uomo" | "donna">("uomo");
  const [sexualOrientation, setSexualOrientation] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !nickname || !age || !city || !sexualOrientation || !relationshipStatus) {
      toast({
        title: t('auth.errorSignUp'),
        description: t('auth.errorAllFields'),
        variant: "destructive",
      });
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
      toast({
        title: t('auth.errorSignUp'),
        description: t('auth.errorAge'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            nickname,
          }
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([{
            id: data.user.id,
            full_name: nickname,
            nickname,
            age: ageNum,
            city,
            gender,
            sexual_orientation: sexualOrientation,
            relationship_status: relationshipStatus,
          }] as any);

        if (profileError) throw profileError;

        toast({
          title: t('auth.registrationComplete'),
          description: t('auth.welcome'),
        });
      }
    } catch (error: any) {
      toast({
        title: t('auth.errorSignUp'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: t('auth.errorSignUp'),
        description: t('auth.errorEmail'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) throw error;

      toast({
        title: t('auth.emailSent'),
        description: t('auth.checkEmail'),
      });
      setShowForgotPassword(false);
    } catch (error: any) {
      toast({
        title: t('auth.errorSignUp'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: t('auth.errorSignIn'),
        description: t('auth.errorCredentials'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: t('auth.signedIn'),
        description: t('auth.welcome'),
      });
    } catch (error: any) {
      toast({
        title: t('auth.errorSignIn'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Heart className="h-12 w-12 text-pink-500" />
          </div>
          <CardTitle className="text-3xl font-bold">{t('app.name')}</CardTitle>
          <CardDescription>{t('app.tagline')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t('auth.signin')}</TabsTrigger>
              <TabsTrigger value="signup">{t('auth.signup')}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              {showForgotPassword ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">{t('auth.email')}</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder={t('auth.email').toLowerCase()}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('auth.sendingEmail') : t('auth.resetPassword')}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    {t('auth.backToLogin')}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('auth.email')}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder={t('auth.email').toLowerCase()}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t('auth.password')}</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('auth.signingIn') : t('auth.signin')}
                  </Button>
                  <Button 
                    type="button" 
                    variant="link" 
                    className="w-full"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    {t('auth.forgotPassword')}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-nickname">{t('profile.nickname')}</Label>
                  <Input
                    id="signup-nickname"
                    type="text"
                    placeholder={t('profile.nickname')}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-age">{t('profile.age')}</Label>
                  <Input
                    id="signup-age"
                    type="number"
                    min="18"
                    max="120"
                    placeholder="18"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-city">{t('profile.location')}</Label>
                  <PlacesAutocomplete
                    id="signup-city"
                    value={city}
                    onChange={setCity}
                    placeholder={t('profile.locationPlaceholder')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('profile.gender')}</Label>
                  <RadioGroup value={gender} onValueChange={(value: any) => setGender(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="uomo" id="uomo" />
                      <Label htmlFor="uomo" className="cursor-pointer">{t('profile.male')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="donna" id="donna" />
                      <Label htmlFor="donna" className="cursor-pointer">{t('profile.female')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="non-binario" id="non-binario" />
                      <Label htmlFor="non-binario" className="cursor-pointer">{t('profile.nonBinary')}</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-orientation">{t('profile.orientation')}</Label>
                  <Input
                    id="signup-orientation"
                    type="text"
                    placeholder={t('profile.orientationPlaceholder')}
                    value={sexualOrientation}
                    onChange={(e) => setSexualOrientation(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-relationship">{t('profile.relationshipStatus')}</Label>
                  <Select value={relationshipStatus} onValueChange={setRelationshipStatus} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('profile.selectStatus')} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="single">{t('profile.single')}</SelectItem>
                      <SelectItem value="sposato">{t('profile.married')}</SelectItem>
                      <SelectItem value="divorziato">{t('profile.divorced')}</SelectItem>
                      <SelectItem value="vedovo">{t('profile.widowed')}</SelectItem>
                      <SelectItem value="preferisco_non_dirlo">{t('profile.preferNotToSay')}</SelectItem>
                      <SelectItem value="scoprilo">{t('profile.findOut')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('auth.email')}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder={t('auth.email').toLowerCase()}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('auth.password')}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('auth.signingUp') : t('auth.signup')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="text-center text-sm text-muted-foreground mt-4">
            <button
              onClick={() => navigate("/terms")}
              className="hover:underline"
            >
              {t('terms.link')}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;