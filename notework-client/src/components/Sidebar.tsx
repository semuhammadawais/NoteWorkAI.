import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import { isAdmin } from "../utils/auth";
import { api } from "../services/api";
import { mainNavItems, adminNavItems } from "../constants/navigation";
import { BrainCircuit, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar } from "./Avatar";

interface NavLinkItemProps {
  item: (typeof mainNavItems)[0];
  isSidebarOpen: boolean;
  onNavigate: () => void;
  variant?: "main" | "admin";
}

const NavLinkItem: React.FC<NavLinkItemProps> = ({
  item,
  isSidebarOpen,
  onNavigate,
  variant = "main",
}) => {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onNavigate}
      title={!isSidebarOpen ? item.name : undefined}
      aria-label={item.name}
      className={({ isActive }) => `
        relative flex items-center gap-3 rounded-xl transition-all duration-200 group
        ${isSidebarOpen ? "px-3 py-2.5" : "px-0 py-2.5 justify-center w-full"}
        ${
          isActive
            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-sm"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        }
      `}
    >
      {({ isActive }) => (
        <>
          <span
            className={`
              flex items-center justify-center rounded-lg shrink-0 transition-colors duration-200
              ${isSidebarOpen ? "w-7 h-7" : "w-8 h-8"}
              ${
                isActive ? "bg-white/15 dark:bg-slate-900/10" : "bg-transparent"
              }
            `}
          >
            <item.icon
              size={17}
              className="shrink-0 transition-transform duration-200 group-hover:scale-105"
              aria-hidden
            />
          </span>
          <AnimatePresence mode="wait" initial={false}>
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-center justify-between flex-1 min-w-0 overflow-hidden"
              >
                <span className="text-sm font-medium tracking-wide truncate">
                  {item.name}
                </span>
                {item.badge && (
                  <span
                    className={`ml-2 shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border ${
                      isActive
                        ? "bg-white/15 dark:bg-slate-900/10 border-white/20 dark:border-slate-900/20 text-white dark:text-slate-900"
                        : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-500 dark:border-white/5"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {variant === "admin" && isActive && !isSidebarOpen && (
            <span
              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-900"
              aria-hidden
            />
          )}
        </>
      )}
    </NavLink>
  );
};

export const Sidebar: React.FC = () => {
  const { user, setUser, isSidebarOpen, toggleSidebar, setSidebarOpen } =
    useStore();
  const navigate = useNavigate();
  const userIsAdmin = isAdmin(user);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const closeMobile = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <aside
      className={`
        fixed md:relative top-0 left-0 z-40
        glass-panel h-screen border-r border-black/[0.06] dark:border-white/[0.06]
        flex flex-col
        transition-[width,transform] duration-300 ease-out
        ${
          isSidebarOpen
            ? "translate-x-0 w-[268px]"
            : "-translate-x-full md:translate-x-0 md:w-[76px]"
        }
      `}
      aria-label="Main navigation"
    >
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand */}
        <div
          className={`
            relative flex items-center border-b border-black/[0.06] dark:border-white/[0.06]
            ${isSidebarOpen ? "px-5 py-4 gap-3" : "px-3 py-4 justify-center"}
          `}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shrink-0">
            <BrainCircuit size={19} aria-hidden />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="font-bold text-slate-900 dark:text-white text-lg tracking-wide font-display whitespace-nowrap"
              >
                NoteWork{" "}
                <span className="text-slate-400 dark:text-slate-500 font-medium">
                  AI
                </span>
              </motion.span>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden md:flex w-7 h-7 items-center justify-center rounded-full bg-white dark:bg-[#0f162a] border border-black/10 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-md absolute -right-3.5 top-7"
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? (
              <ChevronLeft size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav
          className={`flex-1 overflow-y-auto overflow-x-hidden ${isSidebarOpen ? "px-3 py-4" : "px-2 py-3"}`}
        >
          <p
            className={`text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ${
              isSidebarOpen ? "px-2" : "sr-only"
            }`}
          >
            Workspace
          </p>
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <NavLinkItem
                key={item.path}
                item={item}
                isSidebarOpen={isSidebarOpen}
                onNavigate={closeMobile}
                variant="main"
              />
            ))}
          </div>

          {userIsAdmin && (
            <div className={isSidebarOpen ? "mt-6" : "mt-5"}>
              <div
                className={`
                  mb-3
                  ${isSidebarOpen ? "px-2 pt-4 border-t border-black/[0.06] dark:border-white/[0.06]" : "flex justify-center pt-3"}
                `}
              >
                {isSidebarOpen ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      Admin Tools
                    </span>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900">
                      Staff
                    </span>
                  </div>
                ) : (
                  <div
                    className="w-8 h-px bg-slate-200 dark:bg-white/10"
                    aria-hidden
                  />
                )}
              </div>
              <div
                className={`space-y-1 ${!isSidebarOpen ? "rounded-xl bg-black/[0.02] dark:bg-white/[0.03] p-1" : ""}`}
              >
                {adminNavItems.map((item) => (
                  <NavLinkItem
                    key={item.path}
                    item={item}
                    isSidebarOpen={isSidebarOpen}
                    onNavigate={closeMobile}
                    variant="admin"
                  />
                ))}
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* Footer: user + logout */}
      <div
        className={`
          border-t border-black/[0.06] dark:border-white/[0.06] mt-auto
          ${isSidebarOpen ? "p-3 space-y-2.5" : "p-2 space-y-2"}
        `}
      >
        {user && isSidebarOpen && (
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06]">
            <Avatar user={user} size="sm" className="rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                {user.name}
                {userIsAdmin && (
                  <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 shrink-0">
                    Admin
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {user.email}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          title={!isSidebarOpen ? "Logout" : undefined}
          className={`
            w-full flex items-center rounded-xl text-slate-500 dark:text-slate-400
            hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/[0.06] border border-transparent
            transition-all duration-200 group
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30
            ${isSidebarOpen ? "gap-3 px-3 py-2.5" : "justify-center p-2.5"}
          `}
        >
          <LogOut
            size={18}
            className="shrink-0 group-hover:-translate-x-0.5 transition-transform"
            aria-hidden
          />
          {isSidebarOpen && (
            <span className="text-sm font-semibold">Logout</span>
          )}
        </button>
      </div>
    </aside>
  );
};
