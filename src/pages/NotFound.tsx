import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Heart, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="text-center max-w-md mx-auto">
        {/* Animated Hearts */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <Heart className="h-32 w-32 text-pink-200 dark:text-pink-900 opacity-20 animate-pulse" />
          </div>
          <div className="relative">
            <h1 className="text-9xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent mb-4">
              404
            </h1>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3 mb-8">
          <h2 className="text-3xl font-bold text-foreground">
            Oops! Amore non trovato
          </h2>
          <p className="text-lg text-muted-foreground">
            Sembra che questa pagina abbia trovato un altro match... 💔
          </p>
          <p className="text-sm text-muted-foreground">
            Ma non preoccuparti, ci sono tante altre connessioni da fare!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all"
          >
            <Link to="/">
              <Home className="h-5 w-5 mr-2" />
              Torna alla Home
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-2 border-primary hover:bg-primary/10"
          >
            <Link to="/explore">
              <Search className="h-5 w-5 mr-2" />
              Esplora Profili
            </Link>
          </Button>
        </div>

        {/* Fun fact */}
        <div className="mt-12 p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-border/50">
          <p className="text-xs text-muted-foreground italic">
            💡 Lo sapevi? Il 404 è diventato il numero più romantico per gli sviluppatori!
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
