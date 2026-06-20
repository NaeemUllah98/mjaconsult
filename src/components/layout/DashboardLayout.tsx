import { useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, LogOut, Bell, CheckCheck, BellRing } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useNotificationPopups } from "@/hooks/useNotificationPopups";
import {
  notifySupported,
  notificationPermission,
  requestNotificationPermission,
} from "@/lib/push";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/Misc";
import { relativeTime } from "@/utils/format";
import { cn } from "@/utils/cn";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

export function DashboardLayout({
  nav,
  roleLabel,
  children,
}: {
  nav: NavItem[];
  roleLabel: string;
  children: ReactNode;
}) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Desktop/background popup notifications for this user (all panels).
  useNotificationPopups(user);

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <Link to="/">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-brand-gradient text-white shadow-glow"
                  : "text-ink-soft hover:bg-brand-50 hover:text-brand-700",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-brand-400",
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-surface-muted p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <Avatar name={user?.name} src={user?.photoURL} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {user?.name}
            </p>
            <p className="truncate text-xs text-ink-muted">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-subtle">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-surface-muted bg-surface lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              className="absolute inset-y-0 left-0 w-72 bg-surface shadow-card"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-5 grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted"
              >
                <X className="h-5 w-5" />
              </button>
              {SidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="lg:pl-64">
        <Topbar onMenu={() => setMobileOpen(true)} roleLabel={roleLabel} />
        <main className="section-pad mx-auto max-w-7xl py-6 sm:py-8">
          <EnableNotificationsBanner />
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function EnableNotificationsBanner() {
  const [perm, setPerm] = useState<NotificationPermission>(
    notificationPermission(),
  );
  const [dismissed, setDismissed] = useState(false);

  if (!notifySupported() || perm !== "default" || dismissed) return null;

  return (
    <div className="mb-6 flex items-center gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white">
        <BellRing className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="font-semibold text-brand-900">
          Turn on desktop notifications
        </p>
        <p className="text-sm text-ink-muted">
          Get a popup for new appointments, payments and messages — even when
          this tab is in the background.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="hidden text-sm font-medium text-ink-muted hover:text-ink sm:block"
      >
        Not now
      </button>
      <button
        onClick={async () => setPerm(await requestNotificationPermission())}
        className="rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-glow transition active:scale-95"
      >
        Enable
      </button>
    </div>
  );
}

function Topbar({
  onMenu,
  roleLabel,
}: {
  onMenu: () => void;
  roleLabel: string;
}) {
  const { user } = useAuth();
  const { items, unread, markAllRead, markRead } = useNotifications(user?.uid);
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-surface-muted bg-surface/80 backdrop-blur-xl">
      <div className="section-pad mx-auto flex h-16 max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenu}
            className="grid h-10 w-10 place-items-center rounded-xl text-ink-soft hover:bg-surface-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {roleLabel}
            </p>
            <h1 className="font-display text-lg font-bold text-ink">
              Hi, {user?.name?.split(" ")[0]} 👋
            </h1>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative grid h-10 w-10 place-items-center rounded-xl text-ink-soft transition hover:bg-surface-muted"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {open && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl border border-surface-muted bg-surface shadow-card"
                >
                  <div className="flex items-center justify-between border-b border-surface-muted px-4 py-3">
                    <span className="font-display font-bold text-ink">
                      Notifications
                    </span>
                    {unread > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {items.length === 0 ? (
                      <div className="p-4">
                        <EmptyState
                          icon={<Bell className="h-5 w-5" />}
                          title="No notifications yet"
                          className="border-0 bg-transparent py-6"
                        />
                      </div>
                    ) : (
                      items.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => markRead(n.id)}
                          className={cn(
                            "flex w-full gap-3 border-b border-surface-muted px-4 py-3 text-left transition hover:bg-surface-subtle",
                            !n.read && "bg-brand-50/40",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                              n.read ? "bg-transparent" : "bg-brand-500",
                            )}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink">
                              {n.title}
                            </p>
                            <p className="text-xs text-ink-muted">{n.body}</p>
                            <p className="mt-0.5 text-[11px] text-ink-muted">
                              {relativeTime(n.createdAt ?? null)}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
