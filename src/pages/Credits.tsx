import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Coins, Crown, Zap, Shield, Eye, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const Credits = () => {
  const navigate = useNavigate();
  const { credits, loading } = useCredits();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [purchasing, setPurchasing] = useState(false);

  const PACKAGES = [
    {
      id: "credits_50",
      name: t("credits.credits50"),
      credits: 50,
      price: "€9,99",
      priceValue: 999,
      popular: false,
    },
    {
      id: "credits_130",
      name: t("credits.credits130"),
      credits: 130,
      price: "€19,99",
      priceValue: 1999,
      popular: true,
    },
    {
      id: "credits_220",
      name: t("credits.credits220"),
      credits: 220,
      price: "€29,99",
      priceValue: 2999,
      popular: false,
    },
  ];

  const handlePurchaseCredits = async (packageType: string) => {
    try {
      setPurchasing(true);
      const { data, error } = await supabase.functions.invoke("purchase-credits", {
        body: { package_type: packageType },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error purchasing credits:", error);
      toast({
        title: t("credits.errorTitle"),
        description: t("credits.errorPurchasing"),
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleSubscribePremium = async (subscriptionType: "monthly" | "weekly" = "monthly") => {
    try {
      setPurchasing(true);
      const { data, error } = await supabase.functions.invoke("subscribe-premium", {
        body: { subscription_type: subscriptionType },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Error subscribing to premium:", error);
      toast({
        title: t("credits.errorTitle"),
        description: error.message || t("credits.errorSubscribing"),
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setPurchasing(true);
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        toast({
          title: "Gestione Abbonamento",
          description: "Stai per essere reindirizzato al portale di gestione",
        });
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      toast({
        title: t("credits.errorTitle"),
        description: "Impossibile aprire il portale di gestione",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("credits.back")}
        </Button>

        {/* Current Balance */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-6 w-6 text-primary" />
                {t("credits.yourBalance")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">{t("credits.loading")}</div>
            ) : (credits?.is_premium && (!credits.premium_expires_at || new Date(credits.premium_expires_at) > new Date())) ? (
              credits.subscription_type === 'monthly' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Crown className="h-8 w-8 text-amber-500" />
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {t("credits.unlimitedCredits")}
                      </div>
                      <div className="text-sm text-muted-foreground">{t("credits.premiumSubscriptionActive")}</div>
                      {credits.premium_expires_at && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Rinnovo: {new Date(credits.premium_expires_at).toLocaleDateString('it-IT')}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleManageSubscription}
                    disabled={purchasing}
                    variant="outline"
                    className="w-full"
                  >
                    {purchasing ? "Caricamento..." : "Gestisci Abbonamento"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Puoi disdire il rinnovo automatico in qualsiasi momento dal portale di gestione
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Crown className="h-8 w-8 text-purple-500" />
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        Premium Settimanale Attivo
                      </div>
                      <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                        <div>💰 40 crediti giornalieri (attuale: {credits.balance})</div>
                        <div>❤️ 30 like giornalieri</div>
                        <div>👁️ Visualizzazione illimitata dei like ricevuti</div>
                      </div>
                      {credits.premium_expires_at && (
                        <div className="text-xs text-muted-foreground mt-2">
                          Rinnovo: {new Date(credits.premium_expires_at).toLocaleDateString('it-IT')}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={handleManageSubscription}
                    disabled={purchasing}
                    variant="outline"
                    className="w-full"
                  >
                    {purchasing ? "Caricamento..." : "Gestisci Abbonamento"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Puoi disdire il rinnovo automatico in qualsiasi momento dal portale di gestione
                  </p>
                </div>
              )
            ) : (
              <div>
                <div className="text-4xl font-bold text-primary mb-2">
                  {credits?.balance || 0} {t("credits.credits")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Premium Subscriptions */}
        {/* Nascondi solo se hai Premium Mensile attivo */}
        {!(credits?.is_premium && credits.subscription_type === 'monthly' && (!credits.premium_expires_at || new Date(credits.premium_expires_at) > new Date())) && (
          <>
            {/* Monthly Premium */}
            <Card className="mb-6 border-2 border-amber-500/50 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown className="h-8 w-8 text-amber-500" />
                    <div>
                      <CardTitle className="text-2xl">{t("credits.premium")}</CardTitle>
                      <CardDescription>{t("credits.ultimateExperience")}</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-amber-500 text-white">{t("credits.mostPopular")}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">€299,99{t("credits.perMonth")}</div>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    <span>{t("credits.unlimitedCredits")}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-amber-500" />
                    <span>Like illimitati</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-amber-500" />
                    <span>{t("credits.unlimitedLikes")}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-500" />
                    <span>{t("credits.exclusiveBadge")}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-500">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" x2="12" y1="19" y2="22"/>
                    </svg>
                    <span>Accesso ai messaggi vocali nelle chat con gli utenti</span>
                  </li>
                </ul>
                <Button
                  onClick={() => handleSubscribePremium("monthly")}
                  disabled={purchasing}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
                  size="lg"
                >
                  {purchasing ? t("credits.processing") : t("credits.becomePremium")}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {t("credits.autoRenewal")}
                </p>
              </CardContent>
            </Card>

            {/* Weekly Premium - Nascondi solo se hai già Weekly attivo */}
            {!(credits?.is_premium && credits.subscription_type === 'weekly' && (!credits.premium_expires_at || new Date(credits.premium_expires_at) > new Date())) && (
              <Card className="mb-8 border-2 border-purple-500/50 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="h-8 w-8 text-purple-500" />
                      <div>
                        <CardTitle className="text-2xl">Premium Settimanale</CardTitle>
                        <CardDescription>Prova l'esperienza Premium per 7 giorni</CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-purple-500 text-white">Prova</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold text-purple-600">€6,99</div>
                    <div className="text-sm text-muted-foreground line-through">€13,99</div>
                    <div className="text-sm font-medium">/settimana</div>
                  </div>
                  <div className="text-sm text-purple-600 font-medium">
                    🎉 Offerta prima settimana! Poi €13,99/settimana
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-purple-500" />
                      <span><strong>40 crediti giornalieri</strong> - reset automatico</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-purple-500" />
                      <span><strong>30 like al giorno</strong> - più opportunità</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-purple-500" />
                      <span><strong>Visualizza like ricevuti</strong></span>
                    </li>
                  </ul>
                  <Button
                    onClick={() => handleSubscribePremium("weekly")}
                    disabled={purchasing}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    size="lg"
                  >
                    {purchasing ? t("credits.processing") : "Inizia Prova Settimanale"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Rinnovo automatico. Disdici quando vuoi.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Credit Packages */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">{t("credits.buyCredits")}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {PACKAGES.map((pkg) => (
              <Card key={pkg.id} className={pkg.popular ? "border-2 border-primary" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{pkg.name}</CardTitle>
                    {pkg.popular && (
                      <Badge variant="default">{t("credits.popular")}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">{pkg.price}</div>
                  <Button
                    onClick={() => handlePurchaseCredits(pkg.id)}
                    disabled={purchasing || (credits?.is_premium && credits.subscription_type === 'monthly')}
                    className="w-full"
                    variant={pkg.popular ? "default" : "outline"}
                  >
                    {purchasing ? t("credits.processing") : t("credits.buy")}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {t("credits.vatIncluded")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("credits.howCreditsWork")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("credits.freeCreditsDaily")}</p>
            <p>{t("credits.messageCost")}</p>
            <p>{t("credits.creditsNoExpire")}</p>
            <p>{t("credits.premiumUnlimited")}</p>
            <p>{t("credits.creditsAccumulate")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Credits;