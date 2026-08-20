import Link from "next/link";

const links = [
  { href: "/", label: "Visão geral", icon: "⌂" },
  { href: "/propostas", label: "Propostas", icon: "◫" },
  { href: "/clientes", label: "Clientes", icon: "◎" },
];

export function Sidebar() {
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
            <span className="navIcon">{link.icon}</span>{link.label}
          </Link>
        ))}
      </nav>

      <div className="sidebarFooter">
        <div className="avatar">PP</div>
        <div><strong>Proposta Plus</strong><small>Workspace principal</small></div>
      </div>
    </aside>
  );
}
