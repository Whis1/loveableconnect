import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Explore from "./pages/Explore";
import ProfileEdit from "./pages/ProfileEdit";
import Matches from "./pages/Matches";
import Likes from "./pages/Likes";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import TermsAndConditions from "./pages/TermsAndConditions";
import CookieBanner from "./components/CookieBanner";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  
  return (
    <>
      <Toaster />
      <Sonner />
      {location.pathname === "/auth" && <CookieBanner />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/likes" element={<Likes />} />
        <Route path="/chat/:matchId" element={<Chat />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
