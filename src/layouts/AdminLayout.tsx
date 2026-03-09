import { Outlet, Link, useLocation } from "react-router-dom";
import { adminNavItems } from "@/constants/navigation";
import { cn } from "@/lib/utils";
import { Building2, PanelLeftClose, PanelLeft, Bell, LogOut, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const AdminLayout = () => {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r transition-all duration-300 shrink-0",
          collapsed ? "w-[68px]" : "w-[250px]"
        )}
        style={{ backgroundColor: "hsl(var(--sidebar-background))", color: "hsl(var(--sidebar-foreground))" }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 px-4 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--sidebar-primary))" }}>
            <Building2 className="h-4 w-4" style={{ color: "hsl(var(--sidebar-primary-foreground))" }} />
          </div>
          {!collapsed && (
            <span className="font-display text-lg font-bold truncate">
              ImmoPlate
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-0.5">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "text-[hsl(var(--sidebar-primary))]"
                    : "opacity-60 hover:opacity-100"
                )}
                style={active ? { backgroundColor: "hsl(var(--sidebar-accent))" } : undefined}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-2.5 pb-3 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>Site public</span>}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm w-full opacity-50 hover:opacity-80 transition-opacity"
          >
            {collapsed ? <PanelLeft className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            {!collapsed && <span>Réduire</span>}
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {adminNavItems.find(
                (n) => pathname === n.path || (n.path !== "/admin" && pathname.startsWith(n.path))
              )?.label ?? "Back-office"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-secondary" />
            </Button>
            <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;