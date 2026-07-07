import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, CalendarCog, Flame, LogOut, Power, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import api from "../lib/api";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/leads", label: "Leads", icon: Flame },
  { to: "/agents", label: "Agents", icon: Users, admin: true },
  { to: "/config", label: "Day Plan", icon: CalendarCog, admin: true },
];

export default function Layout() {
  const { user, setUser, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const toggleSelf = async () => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/agents/${user.id}/active`, { active: !user.active });
      setUser({ ...user, active: data.active });
    } finally {
      setBusy(false);
    }
  };

  const SidebarBody = (
    <>
      <div className="flex items-center gap-2 px-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#c2f54b] font-black text-[#0a0a0b]">F</span>
        <div>
          <div className="text-sm font-bold leading-tight">Forwardly</div>
          <div className="text-[11px] text-white/50">Leads CRM</div>
        </div>
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {nav
          .filter((n) => !n.admin || user.role === "admin")
          .map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-[#c2f54b] text-[#0a0a0b]" : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <n.icon size={18} /> {n.label}
            </NavLink>
          ))}
      </nav>

      <div className="mt-auto space-y-3">
        {user.role === "agent" && (
          <button
            onClick={toggleSelf}
            disabled={busy}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold ${
              user.active ? "bg-[#c2f54b]/15 text-[#c2f54b]" : "bg-white/5 text-white/50"
            }`}
          >
            <span className="flex items-center gap-2"><Power size={16} /> {user.active ? "On duty" : "Off duty"}</span>
            <span className={`h-2.5 w-2.5 rounded-full ${user.active ? "bg-[#c2f54b]" : "bg-white/30"}`} />
          </button>
        )}
        <div className="rounded-lg bg-white/5 px-3 py-2.5">
          <div className="text-sm font-semibold">{user.name}</div>
          <div className="text-[11px] text-white/50">{user.role === "admin" ? "Super Admin" : "Agent"}</div>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 hover:text-white">
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-[#0a0a0b] px-4 py-6 text-white lg:flex">
        {SidebarBody}
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[#c2f54b] font-black text-[#0a0a0b]">F</span>
          <span className="font-bold">Forwardly Leads</span>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-gray-700"><Menu size={22} /></button>
      </header>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col bg-[#0a0a0b] px-4 py-6 text-white">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 text-white/60"><X size={20} /></button>
            {SidebarBody}
          </aside>
        </div>
      )}

      {/* content */}
      <main className="px-4 py-6 sm:px-6 lg:ml-60 lg:px-8 lg:py-7">
        <Outlet />
      </main>
    </div>
  );
}
