import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Coins, Crown, Zap, Shield, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { CreditCountdown } from "@/components/CreditCountdown";

const PACKAGES = [
  {
    id: "credits_50",
    name: "50 Crediti",
    credits: 50,
    price: "€9,99",
    priceValue: 999,
    popular: false,
  },
  {
    id: "credits_75",
    name: "75 Crediti",
    credits: 75,
    price: "€19,99",
    priceValue: 1999,
    popular: true,
  },
  {
    id: "credits_100",
    name: "100 Crediti",
    credits: 100,
    price: "€29,99",
    priceValue: 2999,
    popular: false,
  },
];

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
      id: "credits_75",
      name: t("credits.credits75"),
      credits: 75,
      price: "€19,99",
      priceValue: 1999,
      popular: true,
    },
    {
      id: "credits_100",
      name: t("credits.credits100"),
      credits: 100,
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

  const handleSubscribePremium = async () => {
    try {
      setPurchasing(true);
      const { data, error } = await supabase.functions.invoke("subscribe-premium");

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
              {!loading && 
               !credits?.is_premium && 
               credits?.balance !== undefined &&
               credits.balance < 40 &&
               credits?.credits_depleted_at && (
                <CreditCountdown creditsDepletedAt={credits.credits_depleted_at} />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">{t("credits.loading")}</div>
            ) : (credits?.is_premium && (!credits.premium_expires_at || new Date(credits.premium_expires_at) > new Date())) ? (
              <div className="flex items-center gap-3">
                <Crown className="h-8 w-8 text-amber-500" />
                <div>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {t("credits.unlimitedCredits")}
                  </div>
                  <div className="text-sm text-muted-foreground">{t("credits.premiumSubscriptionActive")}</div>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-4xl font-bold text-primary mb-2">
                  {credits?.balance || 0} {t("credits.credits")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("credits.messagesCost")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Premium Subscription */}
        {!(credits?.is_premium && (!credits.premium_expires_at || new Date(credits.premium_expires_at) > new Date())) && (
          <Card className="mb-8 border-2 border-amber-500/50 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20">
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
              <div className="text-3xl font-bold">€99,99{t("credits.perMonth")}</div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <span>{t("credits.unlimitedMessaging")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-amber-500" />
                  <span>{t("credits.unlimitedLikes")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-500" />
                  <span>{t("credits.exclusiveBadge")}</span>
                </li>
              </ul>
              <Button
                onClick={handleSubscribePremium}
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
                  <CardDescription>{pkg.credits} {t("credits.creditsUnit")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">{pkg.price}</div>
                  <div className="text-sm text-muted-foreground">
                    {(pkg.priceValue / pkg.credits).toFixed(2)}€ {t("credits.perCredit")}
                  </div>
                  <Button
                    onClick={() => handlePurchaseCredits(pkg.id)}
                    disabled={purchasing || credits?.is_premium}
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