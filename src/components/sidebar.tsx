import Link from "next/link";
import type { User } from "@/generated/prisma/client";
import { logout } from "@/app/actions";
import { can, ROLE_LABELS } from "@/lib/rbac";

export function Sidebar({ user }: { user: User }) {
  const links = [
    { href: "/", label: "Visão geral", icon: "⌂", show: can(user.role, "dashboard:view") },
    { href: "/propostas", label: "Propostas", icon: "◫", show: can(user.role, "proposals:view") },
    { href: "/clientes", label: "Clientes", icon: "◎", show: can(user.role, "clients:view") },
    { href: "/chat", label: "Chat interno", icon: "◌", show: can(user.role, "chat:view") },
    { href: "/designacoes", label: "Designações", icon: "✓", show: can(user.role, "assignments:update") },
    { href: "/equipe", label: "Minha equipe", icon: "♙", show: can(user.role, "team:view") },
    { href: "/admin", label: "Administração", icon: "⚙", show: can(user.role, "admin:view") },
  ].filter((link) => link.show);

  const initials = user.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="Proposta Plus">
        <span className="brandMark">P+</span>
        <span><strong>Proposta</strong><small>PLUS</small></span>
      </Link>

      <nav className="nav">
        <p className="navLabel">ESCRITÓRIO</p>
        {links.map((link) => (
          <Link href={link.href} className="navItem" key={link.href}>
            <span className="navIcon">{link.icon}</span><span>{link.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebarFooter">
        <div className="avatar">{initials}</div>
        <div className="userSummary"><strong>{user.name}</strong><small>{ROLE_LABELS[user.role]}</small></div>
        <form action={logout}><button className="logoutButton" title="Sair" type="submit">↗</button></form>
      </div>
    </aside>
  );
}
