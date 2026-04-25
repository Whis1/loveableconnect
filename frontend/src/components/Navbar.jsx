import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, LogOut, Heart, Users, User as UserIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";

const navItems = [
  { to: "/bacheca", label: "Bacheca", icon: Users, testid: "nav-bacheca" },
  { to: "/matches", label: "Connessioni", icon: Heart, testid: "nav-matches" },
  { to: "/dashboard", label: "Il mio profilo", icon: UserIcon, testid: "nav-dashboard" },
];

export const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 backdrop-blur-xl bg-[#040710]/70" data-testid="main-navbar">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to={user ? "/bacheca" : "/"} className="flex items-center gap-2 group" data-testid="nav-logo">
          <Sparkles className="h-5 w-5 text-[#E6C998] transition-transform group-hover:rotate-12" />
          <span className="font-[Cormorant_Garamond] text-2xl tracking-tight text-[#F0F3F5]">Stelle</span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-testid={item.testid}
                  className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-all duration-300 ${
                    active
                      ? "bg-[#E6C998] text-[#040710] shadow-[0_0_20px_rgba(230,201,152,0.3)]"
                      : "text-[#8F9CAE] hover:text-[#F0F3F5] hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-[#8F9CAE]" data-testid="nav-username">
              {user.name}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              data-testid="nav-logout-btn"
              className="rounded-full text-[#8F9CAE] hover:text-[#E6C998] hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Link to="/" className="text-sm text-[#E6C998] hover:opacity-80 transition" data-testid="nav-login">
            Accedi
          </Link>
        )}
      </div>

      {user && (
        <nav className="md:hidden border-t border-white/5 flex justify-around py-2" data-testid="mobile-nav">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                data-testid={`${item.testid}-mobile`}
                className={`flex flex-col items-center text-[10px] gap-1 px-3 py-1 rounded-lg ${
                  active ? "text-[#E6C998]" : "text-[#8F9CAE]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
};

export default Navbar;
