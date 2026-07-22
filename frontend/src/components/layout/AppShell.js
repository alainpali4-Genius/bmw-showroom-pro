import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Car, Map, PackageCheck, Armchair, BarChart3,
  Settings, Menu, LogOut, X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { NAV_MAIN, NAV_SECONDARY } from "@/lib/constants";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const ICONS = { LayoutDashboard, Car, Map, PackageCheck, Armchair, BarChart3, Settings };

function Logo({ compact }) {
  return (
    <div className="flex items-center gap-3" data-testid="app-logo">
      <div className="flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-full bg-bmw-light" />
        <span className="h-2.5 w-2.5 rounded-full bg-bmw-blue" />
        <span className="h-2.5 w-2.5 rounded-full bg-bmw-red" />
      </div>
      {!compact && (
        <div className="leading-none">
          <p className="font-display font-semibold text-[15px] tracking-tight">Momentum</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-bmw-soft/60">Showroom</p>
        </div>
      )}
    </div>
  );
}

function NavItems({ items, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.path === "/"}
            onClick={onNavigate}
            data-testid={`nav-${item.key}`}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
                isActive
                  ? "bg-bmw-blue text-white shadow-soft"
                  : "text-bmw-soft hover:bg-bmw-surface"
              }`
            }
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-bmw-surface">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-border p-6 fixed inset-y-0">
        <div className="px-2 mb-8"><Logo /></div>
        <NavItems items={NAV_MAIN} />
        <div className="my-4 h-px bg-border" />
        <NavItems items={NAV_SECONDARY} />
        <div className="mt-auto pt-6">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="h-9 w-9 rounded-full bg-bmw-blue text-white grid place-items-center font-display text-sm">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-bmw-soft/60 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            data-testid="logout-button"
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm text-bmw-soft hover:bg-bmw-surface transition-colors duration-200"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-8 bg-white/80 backdrop-blur-xl backdrop-saturate-150 border-b border-border">
          <div className="lg:hidden"><Logo /></div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className="lg:hidden h-10 w-10 grid place-items-center rounded-xl hover:bg-bmw-surface transition-colors"
                  data-testid="mobile-menu-button"
                >
                  <Menu className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-6">
                <div className="flex items-center justify-between mb-8">
                  <Logo />
                  <button onClick={() => setMenuOpen(false)}><X className="h-5 w-5" /></button>
                </div>
                <NavItems items={[...NAV_MAIN, ...NAV_SECONDARY]} onNavigate={() => setMenuOpen(false)} />
                <button
                  onClick={logout}
                  data-testid="logout-button-mobile"
                  className="mt-6 flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm text-bmw-red hover:bg-bmw-surface"
                >
                  <LogOut className="h-4 w-4" /> Cerrar sesión
                </button>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 pb-28 lg:pb-8 bmw-scroll" key={location.pathname}>
          <div className="animate-fade-up"><Outlet /></div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-border pb-safe" data-testid="mobile-bottom-nav">
        <div className="grid grid-cols-4">
          {NAV_MAIN.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <NavLink
                key={item.key}
                to={item.path}
                end={item.path === "/"}
                data-testid={`bottomnav-${item.key}`}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 transition-colors duration-200 ${
                    isActive ? "text-bmw-blue" : "text-bmw-soft/60"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
