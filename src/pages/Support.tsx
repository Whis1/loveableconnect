import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SupportChat } from "@/components/support/SupportChat";
import { supabase } from "@/integrations/supabase/client";

const Support = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [userEmail, setUserEmail] = useState("");
  const locationState = location.state as { 
    isLocationChangeRequest?: boolean; 
    newLocationData?: { city: string; latitude: number; longitude: number };
    isBirthdateChangeRequest?: boolean;
    newBirthdateData?: { birthdate: string };
  } | null;

  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    fetchUserEmail();
  }, []);

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-purple-950 dark:to-indigo-950">
      <div 
        className="fixed inset-0 z-0 opacity-20 dark:opacity-30" 
        style={{
          backgroundImage: 'url(/images/love-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="container mx-auto p-4 max-w-4xl relative z-10">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("support.back")}
          </Button>
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <SupportChat 
              userEmail={userEmail} 
              isLocationChangeRequest={locationState?.isLocationChangeRequest}
              newLocationData={locationState?.newLocationData}
              isBirthdateChangeRequest={locationState?.isBirthdateChangeRequest}
              newBirthdateData={locationState?.newBirthdateData}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
