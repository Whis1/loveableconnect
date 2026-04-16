import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./PageTransition";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Explore from "@/pages/Explore";
import Search from "@/pages/Search";
import ProfileEdit from "@/pages/ProfileEdit";
import Matches from "@/pages/Matches";
import Likes from "@/pages/Likes";
import Chat from "@/pages/Chat";
import Messages from "@/pages/Messages";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import TermsAndConditions from "@/pages/TermsAndConditions";
import Credits from "@/pages/Credits";
import PurchaseSuccess from "@/pages/PurchaseSuccess";
import PremiumSuccess from "@/pages/PremiumSuccess";
import Support from "@/pages/Support";
import AdminArrettu from "@/pages/AdminArrettu";
import AdminProfiles from "@/pages/AdminProfiles";
import AdminSupport from "@/pages/AdminSupport";
import AdminCreateProfile from "@/pages/AdminCreateProfile";
import Chats from "@/pages/Chats";
import ChattorsLogin from "@/pages/ChattorsLogin";
import AuthCallback from "@/pages/AuthCallback";

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Index /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/explore" element={<PageTransition><Explore /></PageTransition>} />
        <Route path="/search" element={<PageTransition><Search /></PageTransition>} />
        <Route path="/profile/edit" element={<PageTransition><ProfileEdit /></PageTransition>} />
        <Route path="/matches" element={<PageTransition><Matches /></PageTransition>} />
        <Route path="/likes" element={<PageTransition><Likes /></PageTransition>} />
        <Route path="/messages" element={<PageTransition><Messages /></PageTransition>} />
        <Route path="/chat/new/:otherUserId" element={<PageTransition><Chat /></PageTransition>} />
        <Route path="/chat/:matchId" element={<PageTransition><Chat /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><TermsAndConditions /></PageTransition>} />
        <Route path="/credits" element={<PageTransition><Credits /></PageTransition>} />
        <Route path="/purchase-success" element={<PageTransition><PurchaseSuccess /></PageTransition>} />
        <Route path="/premium-success" element={<PageTransition><PremiumSuccess /></PageTransition>} />
        <Route path="/support" element={<PageTransition><Support /></PageTransition>} />
        <Route path="/adminarrettu" element={<PageTransition><AdminArrettu /></PageTransition>} />
        <Route path="/admin/profiles" element={<PageTransition><AdminProfiles /></PageTransition>} />
        <Route path="/admin/support" element={<PageTransition><AdminSupport /></PageTransition>} />
        <Route path="/admin/create-profile" element={<PageTransition><AdminCreateProfile /></PageTransition>} />
        <Route path="/chattors-login" element={<PageTransition><ChattorsLogin /></PageTransition>} />
        <Route path="/chattors" element={<PageTransition><Chats /></PageTransition>} />
        <Route path="/auth/callback" element={<PageTransition><AuthCallback /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};
