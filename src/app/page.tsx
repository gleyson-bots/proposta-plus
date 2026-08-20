import Link from "next/link";
import prisma from "@/lib/prisma";
import { currency, shortDate, statusLabel } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getManagedUserIds, ROLE_LABELS } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const actor = await requireUser();
  const visibleIds = await getManagedUserIds(actor);
  const scope = { organizationId: actor.organizationId, OR: [{ ownerId: null }, { ownerId: { in: visibleIds } }] };

  const [proposals, clients] = await Promise.all([
    prisma.proposal.findMany({
      where: scope,
      include: { client: true, items: true, owner: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.client.count({ where: scope }),
  ]);

  const total = proposals.reduce((sum, proposal) => sum + proposal.items.reduce((itemSum, item) => itemSum + Number(item.quantity) * Number(item.unitPrice), 0) - Number(proposal.discount), 0);
  const accepted = proposals.filter((proposal) => proposal.status === "ACCEPTED");
  const acceptedValue = accepted.reduce((sum, proposal) => sum + proposal.items.reduce((itemSum, item) => itemSum + Number(item.quantity) * Number(item.unitPrice), 0) - Number(proposal.discount), 0);

  return <>
    <header className="pageHeader">
      <div><p className="eyebrow">PAINEL COMERCIAL · {ROLE_LABELS[actor.role].toUpperCase()}</p><h1>Suas propostas, sob controle.</h1><p className="subtitle">Os números abaixo respeitam automaticamente o seu escopo hierárquico.</p></div>
      <Link href="/propostas/nova" className="button">＋ Nova proposta</Link>
    </header>

    <section className="gridStats">
      <div className="statCard"><div className="statLabel">Propostas recentes</div><div className="statValue">{proposals.length}</div><div className="statHint">no seu escopo</div></div>
      <div className="statCard"><div className="statLabel">Clientes</div><div className="statValue">{clients}</div><div className="statHint">visíveis para você</div></div>
      <div className="statCard"><div className="statLabel">Valor em propostas</div><div className="statValue">{currency(total)}</div><div className="statHint">valor bruto recente</div></div>
      <div className="statCard"><div className="statLabel">Receita aceita</div><div className="statValue">{currency(acceptedValue)}</div><div className="statHint">{accepted.length} aceita(s)</div></div>
    </section>

    <section className="panel">
      <div className="panelHead"><h2>Atividade recente</h2><Link href="/propostas" className="button secondary">Ver todas</Link></div>
      {proposals.length === 0 ? <div className="empty">Nenhuma proposta dentro do seu escopo.</div> : <div className="tableWrap"><table className="table"><thead><tr><th>Proposta</th><th>Cliente</th><th>Responsável</th><th>Status</th><th>Valor</th></tr></thead><tbody>{proposals.map((proposal) => {
        const value = proposal.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0) - Number(proposal.discount);
        return <tr key={proposal.id}><td><Link href={`/propostas/${proposal.id}`} className="cellTitle">#{proposal.number} · {proposal.title}</Link><div className="cellSub">{shortDate(proposal.createdAt)}</div></td><td><div className="cellTitle">{proposal.client.name}</div><div className="cellSub">{proposal.client.company ?? "Cliente"}</div></td><td>{proposal.owner?.name ?? "Legado"}</td><td><span className={`badge ${proposal.status}`}>{statusLabel[proposal.status]}</span></td><td className="cellTitle">{currency(value)}</td></tr>;
      })}</tbody></table></div>}
    </section>
  </>;
}
