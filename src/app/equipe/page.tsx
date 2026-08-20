import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can, getManagedUserIds, ROLE_LABELS } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const actor = await requireUser();
  if (!can(actor.role, "team:view")) redirect("/");
  const visibleIds = await getManagedUserIds(actor);
  const users = await prisma.user.findMany({
    where: { id: { in: visibleIds }, organizationId: actor.organizationId, isActive: true },
    include: { parent: { select: { name: true, role: true } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return <>
    <header className="pageHeader">
      <div><p className="eyebrow">ESTRUTURA COMERCIAL</p><h1>Minha equipe</h1><p className="subtitle">Seu cargo enxerga apenas a árvore que está abaixo de você. VP/Admin enxergam toda a organização.</p></div>
      <span className="scopePill">{ROLE_LABELS[actor.role]} · {users.length} pessoas</span>
    </header>
    <section className="panel">
      <div className="panelHead"><h2>Hierarquia visível</h2><span className="cellSub">Escopo aplicado no servidor</span></div>
      <div className="tableWrap"><table className="table"><thead><tr><th>Colaborador</th><th>Cargo</th><th>Superior</th><th>Diretoria</th><th>Equipe</th></tr></thead><tbody>
        {users.map((user) => <tr key={user.id}>
          <td><div className="cellTitle">{user.name}{user.id === actor.id ? " · você" : ""}</div><div className="cellSub">{user.email}</div></td>
          <td><span className={`roleBadge role-${user.role}`}>{ROLE_LABELS[user.role]}</span></td>
          <td>{user.parent ? <><div>{user.parent.name}</div><div className="cellSub">{ROLE_LABELS[user.parent.role]}</div></> : "—"}</td>
          <td>{user.directorate ?? "—"}</td><td>{user.team ?? "—"}</td>
        </tr>)}
      </tbody></table></div>
    </section>
  </>;
}
