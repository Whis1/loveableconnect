import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";
import { PlacesAutocomplete } from "@/components/PlacesAutocomplete";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguageDetection } from "@/hooks/useLanguageDetection";
import { CookieBanner } from "@/components/CookieBanner";
import authHeartBg from "@/assets/auth-heart-background.png";

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
  const [gender, setGender] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  useEffect(() => {
    // Check cookie consent
    const cookieConsent = localStorage.getItem("cookieConsent");
    if (!cookieConsent) {
      setShowCookieBanner(true);
    }

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
    
    if (!email || !password || !nickname || !age || !city || !gender || !relationshipStatus) {
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
        redirectTo: `${window.location.origin}/reset-password`,
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
    <>
      {showCookieBanner && <CookieBanner onConsent={() => setShowCookieBanner(false)} />}
      <div className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-purple-950 dark:to-indigo-950">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-20 dark:opacity-30" 
        style={{
          backgroundImage: 'url(/images/love-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 shadow-2xl overflow-hidden">
        {/* Background decorative image - full coverage */}
        <div 
          className="absolute inset-0 opacity-10 dark:opacity-15 pointer-events-none"
          style={{
            backgroundImage: `url(${authHeartBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        
        <CardHeader className="text-center relative z-10">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full shadow-xl">
              <Heart className="h-8 w-8 text-white" fill="white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">{t('app.name')}</CardTitle>
          <CardDescription>{t('app.tagline')}</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
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
                  <Label htmlFor="signup-gender">{t('profile.gender')}</Label>
                  <Select value={gender} onValueChange={setGender} required>
                    <SelectTrigger id="signup-gender" className="w-full">
                      <SelectValue placeholder="Seleziona il tuo genere" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="male">Uomo</SelectItem>
                      <SelectItem value="female">Donna</SelectItem>
                      <SelectItem value="transgender">Transgender</SelectItem>
                      <SelectItem value="transessuale">Transessuale</SelectItem>
                      <SelectItem value="omosessuale">Omosessuale</SelectItem>
                      <SelectItem value="non-binary">Non Binario</SelectItem>
                    </SelectContent>
                  </Select>
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
    </>
  );
};

export default Auth;