import { Outlet, Link, useLocation } from "react-router-dom";
import { adminNavItems } from "@/constants/navigation";
import { cn } from "@/lib/utils";
import { Building2, PanelLeftClose, PanelLeft } from "lucide-react";
import { useState } from "react";

const AdminLayout = () => {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-4 border-b border-sidebar-border">
          <Building2 className="h-6 w-6 shrink-0 text-sidebar-primary" />
          {!collapsed && (
            <span className="font-display text-lg font-bold text-sidebar-foreground">
              ImmoPlate
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b bg-card flex items-center px-6">
          <h2 className="text-lg font-semibold text-foreground">
            {adminNavItems.find(
              (n) => pathname === n.path || (n.path !== "/admin" && pathname.startsWith(n.path))
            )?.label ?? "Back-office"}
          </h2>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
