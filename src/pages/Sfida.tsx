import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrisGameBanner } from "@/components/tris/TrisGameBanner";

const Sfida = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-purple-950 dark:to-indigo-950">
      <div
        className="fixed inset-0 z-0 opacity-20 dark:opacity-30"
        style={{
          backgroundImage: "url(/images/love-background.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="container mx-auto p-3 md:p-4 max-w-4xl relative z-10 pt-6">
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            aria-label="Torna alla home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl shadow-lg">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Sfida
              </h1>
            </div>
          </div>
        </div>

        <TrisGameBanner variant="page" />
      </div>
    </div>
  );
};

export default Sfida;
