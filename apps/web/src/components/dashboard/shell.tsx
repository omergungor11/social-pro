"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Share2,
  BarChart3,
  Sparkles,
  UserPlus,
  CreditCard,
  Settings,
  Bell,
  ChevronLeft,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/stores/notification-store";
import { NotificationDropdown } from "@/components/dashboard/notification-dropdown";
import { useRealtime } from "@/hooks/use-realtime";

// ---------------------------------------------------------------------------
// Nav items definition
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Posts", href: "/dashboard/posts", icon: FileText },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Social Accounts", href: "/dashboard/social-accounts", icon: Share2 },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "AI Content", href: "/dashboard/ai-content", icon: Sparkles, badge: "New" },
  { label: "Team", href: "/dashboard/team", icon: UserPlus },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

// ---------------------------------------------------------------------------
// Sidebar nav item
// ---------------------------------------------------------------------------

interface SidebarNavItemProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
}

function SidebarNavItem({
  item,
  isActive,
  isCollapsed,
}: SidebarNavItemProps): React.JSX.Element {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={isCollapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
          : "text-slate-400 hover:bg-white/8 hover:text-slate-100",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Icon
        className={cn(
          "shrink-0 transition-transform duration-150",
          isCollapsed ? "h-5 w-5" : "h-4 w-4",
          isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
        )}
        aria-hidden="true"
      />

      {!isCollapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge !== undefined && (
            <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300 leading-none">
              {item.badge}
            </span>
          )}
        </>
      )}

      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div
          className={cn(
            "pointer-events-none absolute left-full ml-2 z-50",
            "rounded-md bg-slate-800 border border-white/10 px-2.5 py-1.5",
            "text-xs font-medium text-slate-100 whitespace-nowrap shadow-xl",
            "opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0",
            "transition-all duration-150"
          )}
          role="tooltip"
        >
          {item.label}
          {item.badge !== undefined && (
            <span className="ml-1.5 rounded-full bg-blue-500/30 px-1 py-0.5 text-[10px] text-blue-300">
              {item.badge}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

function Sidebar({
  isCollapsed,
  onToggleCollapse,
  onClose,
  isMobileDrawer = false,
}: SidebarProps): React.JSX.Element {
  const pathname = usePathname();

  function isActive(item: NavItem): boolean {
    if (item.href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(item.href);
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-slate-900 border-r border-white/[0.06] transition-all duration-300 ease-in-out",
        isMobileDrawer
          ? "w-72 h-full"
          : isCollapsed
          ? "w-16"
          : "w-64"
      )}
    >
      {/* Logo / brand */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-white/[0.06] shrink-0",
          isCollapsed && !isMobileDrawer ? "justify-center px-2" : "px-4 gap-3"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/30">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
              fill="white"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {(!isCollapsed || isMobileDrawer) && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">Social Pro</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider truncate">
              Agency Platform
            </p>
          </div>
        )}

        {/* Mobile close / Desktop collapse */}
        {isMobileDrawer ? (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/8 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "rounded-lg p-1.5 text-slate-400 hover:bg-white/8 hover:text-white transition-colors",
              isCollapsed ? "mx-auto" : "ml-auto"
            )}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                isCollapsed && "rotate-180"
              )}
            />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-0.5"
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            isActive={isActive(item)}
            isCollapsed={isCollapsed && !isMobileDrawer}
          />
        ))}
      </nav>

      {/* User section */}
      <div className="shrink-0 border-t border-white/[0.06] p-2">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg p-2 cursor-pointer",
            "hover:bg-white/8 transition-colors duration-150",
            isCollapsed && !isMobileDrawer && "justify-center"
          )}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white text-xs font-semibold shadow-md">
              JD
            </div>
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
          </div>

          {(!isCollapsed || isMobileDrawer) && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  Jane Doe
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  Agency Owner
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-md p-1 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

interface HeaderProps {
  onMenuOpen: () => void;
}

function Header({ onMenuOpen }: HeaderProps): React.JSX.Element {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isOpen = useNotificationStore((s) => s.isOpen);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const toggleOpen = useNotificationStore((s) => s.toggleOpen);
  const setOpen = useNotificationStore((s) => s.setOpen);

  // Build breadcrumb from pathname
  function getBreadcrumb(): { label: string; href?: string }[] {
    const segments = pathname
      .split("/")
      .filter(Boolean)
      .map((seg) =>
        seg
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      );

    if (segments.length === 1 && segments[0] === "Dashboard") {
      return [{ label: "Dashboard" }];
    }

    const crumbs: { label: string; href?: string }[] = [
      { label: "Dashboard", href: "/dashboard" },
    ];

    segments.slice(1).forEach((seg, i) => {
      const href =
        "/" +
        pathname
          .split("/")
          .filter(Boolean)
          .slice(0, i + 2)
          .join("/");
      crumbs.push({ label: seg, href });
    });

    return crumbs;
  }

  const breadcrumbs = getBreadcrumb();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-4 md:px-6">
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onMenuOpen}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors md:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex-1 min-w-0">
        <ol className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.label} className="flex items-center gap-1.5 min-w-0">
              {index > 0 && (
                <span className="text-slate-300 shrink-0" aria-hidden="true">
                  /
                </span>
              )}
              {crumb.href !== undefined && index < breadcrumbs.length - 1 ? (
                <Link
                  href={crumb.href}
                  className="text-slate-500 hover:text-slate-700 transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-slate-800 truncate">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              toggleOpen();
              // Close user menu if open
              setUserMenuOpen(false);
            }}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="View notifications"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {isOpen && (
            <NotificationDropdown />
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen((o) => !o);
              // Close notification dropdown if open
              setOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 hover:bg-slate-100 transition-colors"
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
            aria-label="User menu"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-white text-xs font-semibold shadow-sm">
              JD
            </div>
            <span className="hidden sm:block text-sm font-medium text-slate-700">
              Jane Doe
            </span>
            <ChevronDown
              className={cn(
                "hidden sm:block h-3.5 w-3.5 text-slate-400 transition-transform duration-150",
                userMenuOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-800">
                    Jane Doe
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    jane@acmemedia.com
                  </p>
                </div>
                <div className="py-1">
                  {[
                    { label: "Profile", href: "/dashboard/settings/profile" },
                    { label: "Agency Settings", href: "/dashboard/settings" },
                    { label: "Billing", href: "/dashboard/billing" },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div className="border-t border-slate-100 py-1">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Mobile Drawer
// ---------------------------------------------------------------------------

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function MobileDrawer({
  isOpen,
  onClose,
}: MobileDrawerProps): React.JSX.Element {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <Sidebar
          isCollapsed={false}
          onToggleCollapse={() => {}}
          onClose={onClose}
          isMobileDrawer
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// DashboardShell (root export)
// ---------------------------------------------------------------------------

function RealtimeProvider(): null {
  useRealtime();
  return null;
}

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);

  useEffect(() => {
    void fetchUnreadCount();
  }, [fetchUnreadCount]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Real-time WebSocket provider — renders nothing, just hooks */}
      <RealtimeProvider />

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col md:shrink-0">
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header onMenuOpen={() => setMobileDrawerOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
