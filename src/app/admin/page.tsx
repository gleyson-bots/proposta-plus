import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/lib/rbac";
import { updateUserHierarchy } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const roles = ["ADMIN", "VP", "DIRECTOR", "SUPERVISOR", "MANAGER", "BROKER"] as const;

export default async function AdminPage() {
  const actor = await requireUser();
  if (!can(actor.role, "admin:view")) redirect("/");

  const users = await prisma.user.findMany({
    where: { organizationId: actor.organizationId },
    include: { parent: { select: { name: true } }, children: { select: { id: true } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return <>
    <header className="pageHeader">
      <div><p className="eyebrow">VP / ADMIN</p><h1>Estrutura e permissões</h1><p className="subtitle">Defina cargo, superior direto, diretoria e equipe. As alterações mudam imediatamente o escopo de dados e gestão.</p></div>
      <span className="scopePill">Acesso total</span>
    </header>

    <section className="adminGrid">
      {users.map((user) => (
        <form action={updateUserHierarchy.bind(null, user.id)} className="adminUserCard" key={user.id}>
          <div className="adminUserHead"><div className="avatar">{user.name.split(" ").slice(0,2).map((part) => part[0]).join("")}</div><div><strong>{user.name}</strong><small>{user.email}</small></div></div>
          <div className="formGrid compact">
            <div className="field"><label>Cargo</label><select name="role" defaultValue={user.role}>{roles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></div>
            <div className="field"><label>Superior direto</label><select name="parentId" defaultValue={user.parentId ?? ""}><option value="">Sem superior</option>{users.filter((candidate) => candidate.id !== user.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} · {ROLE_LABELS[candidate.role]}</option>)}</select></div>
            <div className="field"><label>Diretoria</label><input name="directorate" defaultValue={user.directorate ?? ""} placeholder="Ex.: Diretoria Comercial" /></div>
            <div className="field"><label>Equipe</label><input name="team" defaultValue={user.team ?? ""} placeholder="Ex.: Equipe Norte" /></div>
          </div>
          <div className="adminMeta"><span>{user.children.length} subordinado(s) direto(s)</span><button className="button" type="submit">Salvar estrutura</button></div>
        </form>
      ))}
    </section>
  </>;
}
