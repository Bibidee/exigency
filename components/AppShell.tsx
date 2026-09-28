"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpenText, LockKeyhole, RadioTower, ShieldAlert, Vault } from "lucide-react";
import WalletButton from "@/components/WalletButton";

const nav = [
  { href: "/command", label: "Command", icon: Activity },
  { href: "/charter/new", label: "Charter", icon: BookOpenText },
  { href: "/incident/new", label: "Incident", icon: ShieldAlert },
  { href: "/vault", label: "Vault", icon: Vault },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <aside className="rail">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark"><LockKeyhole size={17} /></span>
          <span><b>EXIGENT</b><small>Emergency authority</small></span>
        </Link>
        <div className="rail-rule" />
        <nav className="rail-nav" aria-label="Application navigation">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href.split("/new")[0] + "/");
            return (
              <Link key={href} href={href} className={active ? "rail-link active" : "rail-link"}>
                <Icon size={17} /> <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="rail-footer">
          <div className="network-chip"><RadioTower size={14} /> Studionet 61999</div>
          <WalletButton compact />
        </div>
      </aside>
      <main className="workspace">{children}</main>
    </div>
  );
}
