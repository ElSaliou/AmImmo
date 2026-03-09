import { Outlet, Link, useLocation } from "react-router-dom";
import { publicNavItems } from "@/constants/navigation";
import { cn } from "@/lib/utils";
import { Building2, Menu, X, Phone } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

const PublicLayout = () => {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        isHome
          ? "bg-transparent absolute w-full"
          : "bg-card/95 backdrop-blur-xl border-b shadow-[var(--shadow-sm)]"
      )}>
        <div className="container flex h-18 items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className={cn(
              "font-display text-xl font-bold",
              isHome ? "text-primary-foreground" : "text-foreground"
            )}>
              ImmoPlate
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {publicNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  pathname === item.path
                    ? isHome
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary text-primary-foreground"
                    : isHome
                      ? "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link to="/admin">
              <Button variant={isHome ? "hero-outline" : "outline"} size="sm">
                Espace pro
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant={isHome ? "hero" : "default"} size="sm">
                <Phone className="h-3.5 w-3.5" />
                Nous contacter
              </Button>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className={cn("lg:hidden p-2 rounded-lg", isHome ? "text-primary-foreground" : "text-foreground")}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border-t overflow-hidden bg-card/95 backdrop-blur-xl"
            >
              <div className="container py-4 flex flex-col gap-1">
                {publicNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "px-4 py-2.5 text-sm font-medium rounded-lg transition-colors",
                      pathname === item.path
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="pt-3 flex flex-col gap-2">
                  <Link to="/admin" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full">Espace pro</Button>
                  </Link>
                  <Link to="/contact" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full">Nous contacter</Button>
                  </Link>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Main */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-display text-lg font-bold">ImmoPlate</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Votre plateforme immobilière de confiance. Location, vente et gestion de biens d'exception.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Offres</h4>
              <div className="flex flex-col gap-2">
                <Link to="/short-rental" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Location courte durée</Link>
                <Link to="/long-rental" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Location longue durée</Link>
                <Link to="/sale" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Vente</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Explorer</h4>
              <div className="flex flex-col gap-2">
                <Link to="/map" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Carte immobilière</Link>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Contact</h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <span>contact@immoplate.com</span>
                <span>+212 600 000 000</span>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} ImmoPlate — Plateforme immobilière premium
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;