import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { currency, shortDate, statusLabel } from "@/lib/format";
import { updateProposalStatus } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getManagedUserIds } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const statuses = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"] as const;

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireUser();
  const visibleIds = await getManagedUserIds(actor);
  const { id } = await params;
  const proposal = await prisma.proposal.findFirst({
    where: { id, organizationId: actor.organizationId, OR: [{ ownerId: null }, { ownerId: { in: visibleIds } }] },
    include: { client: true, owner: { select: { name: true } }, items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!proposal) notFound();

  const subtotal = proposal.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
  const total = subtotal - Number(proposal.discount);

  return <>
    <header className="pageHeader"><div><p className="eyebrow">PROPOSTA #{proposal.number}</p><h1>{proposal.title}</h1><p className="subtitle">Criada em {shortDate(proposal.createdAt)} · {proposal.client.name} · Responsável: {proposal.owner?.name ?? "Legado"}</p></div><span className={`badge ${proposal.status}`}>{statusLabel[proposal.status]}</span></header>

    <section className="proposalHero">
      <div><div className="proposalNumber">CLIENTE</div><h2 style={{ margin: "6px 0 0" }}>{proposal.client.name}</h2><p className="subtitle">{proposal.client.company ?? proposal.client.email ?? proposal.client.phone ?? "Cliente cadastrado"}</p></div>
      <div><div className="proposalTotal">{currency(total)}</div><div className="proposalMeta">Validade: {shortDate(proposal.validUntil)}</div></div>
    </section>

    <div className="detailGrid">
      <section className="panel">
        <div className="panelHead"><h2>Itens da proposta</h2><span className="cellSub">{proposal.items.length} item(ns)</span></div>
        <div className="tableWrap"><table className="table"><thead><tr><th>Descrição</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>{proposal.items.map((item) => <tr key={item.id}><td className="cellTitle">{item.description}</td><td>{Number(item.quantity)}</td><td>{currency(Number(item.unitPrice))}</td><td className="cellTitle">{currency(Number(item.quantity) * Number(item.unitPrice))}</td></tr>)}</tbody></table></div>
      </section>

      <aside className="detailCard">
        <h2>Andamento</h2>
        <p className="subtitle">Atualize a etapa conforme a negociação evoluir.</p>
        <div className="statusActions">{statuses.map((status) => <form action={updateProposalStatus.bind(null, proposal.id, status)} key={status}><button className="statusButton" type="submit">{statusLabel[status]}</button></form>)}</div>
        {proposal.notes ? <><h2 style={{ marginTop: 26 }}>Observações</h2><p className="subtitle">{proposal.notes}</p></> : null}
      </aside>
    </div>
  </>;
}
