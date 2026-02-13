"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  Kanban,
  Upload,
  UserPlus,
  History,
  LogOut,
  PhoneCall,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

interface SidebarProps {
  role: "admin" | "broker" | "team_member";
  accountName?: string | null;
}

const brokerLinks = [
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/speed-dialer", label: "Speed Dialer", icon: PhoneCall },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminLinks = [
  { href: "/brokers", label: "Sub Accounts", icon: Users },
];

export function Sidebar({ role, accountName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Team members see broker links but without Settings
  const links = role === "admin"
    ? adminLinks
    : role === "team_member"
      ? brokerLinks.filter(link => link.href !== "/settings")
      : brokerLinks;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-white/10 bg-black">
      <div className="border-b border-white/10 px-4 py-4">
        <Image
          src="/logo.webp"
          alt="BIK Media"
          width={150}
          height={40}
          className="h-8 w-auto"
          priority
        />
        {accountName && role !== "admin" && (
          <p className="mt-2 text-sm font-medium text-white/70 truncate" title={accountName}>
            {accountName}
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-white text-black"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
