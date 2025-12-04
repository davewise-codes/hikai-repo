import { HomeIcon, Folder, Clock, Building } from "@hikai/ui";
import { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { UserMenu } from "./user-menu";
import { OrgSwitcher } from "@/domains/organizations/components";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-16 bg-muted/30 border-r border-border flex flex-col">
        {/* Top section - Organization selector */}
        <div className="h-16 flex items-center justify-center border-b border-border">
          <OrgSwitcher />
        </div>
        
        {/* Middle section - Navigation */}
        <nav className="flex-1 py-4 flex flex-col gap-2">
          <SidebarItem icon={<HomeIcon className="w-5 h-5" />} label="Home" to="/" />
          <SidebarItem icon={<Building className="w-5 h-5" />} label="Organizations" to="/organizations" />
          <SidebarItem icon={<Folder className="w-5 h-5" />} label="Sources" to="#" disabled />
          <SidebarItem icon={<Clock className="w-5 h-5" />} label="Timeline" to="#" disabled />
        </nav>
        
        {/* Bottom section - User Menu */}
        <div className="p-2 border-t border-border">
          <UserMenu />
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  to: string;
  disabled?: boolean;
}

function SidebarItem({ icon, label, to, disabled = false }: SidebarItemProps) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  if (disabled || to === "#") {
    return (
      <button
        className="w-12 h-12 mx-auto flex items-center justify-center rounded-lg opacity-50 cursor-not-allowed transition-colors group relative"
        title={`${label} (Coming soon)`}
        disabled
      >
        {icon}
        {/* Tooltip */}
        <span className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          {label} (Coming soon)
        </span>
      </button>
    );
  }
  
  return (
    <Link
      to={to}
      className={`w-12 h-12 mx-auto flex items-center justify-center rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors group relative ${
        isActive ? 'bg-accent text-accent-foreground' : ''
      }`}
      title={label}
    >
      {icon}
      {/* Tooltip */}
      <span className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        {label}
      </span>
    </Link>
  );
}