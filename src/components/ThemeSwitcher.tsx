import { Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
      <LanguageSwitcher />
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        title={theme === "dark" ? "Modalità Sole" : "Modalità Dark"}
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={handleSignOut}
        title={t("dashboard.signOut")}
        className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-all duration-300"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
};
