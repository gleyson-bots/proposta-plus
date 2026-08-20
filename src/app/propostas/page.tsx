import Link from "next/link";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { currency, shortDate, statusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

type ProposalRow = Prisma.ProposalGetPayload<{ include: { client: true; items: true } }>;

export default async function ProposalsPage() {
  let proposals: ProposalRow[] = [];
  try {
    proposals = await prisma.proposal.findMany({
      include: { client: true, items: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch {}

  return <>
    <header className="pageHeader">
      <div><p className="eyebrow">PIPELINE</p><h1>Propostas</h1><p className="subtitle">Visualize cada negociação, valor e etapa comercial.</p></div>
      <Link href="/propostas/nova" className="button">＋ Nova proposta</Link>
    </header>
    <section className="panel">
      <div className="panelHead"><h2>Todas as propostas</h2><span className="cellSub">{proposals.length} registro(s)</span></div>
      {proposals.length === 0 ? <div className="empty">Nenhuma proposta criada ainda.</div> : <div className="tableWrap"><table className="table"><thead><tr><th>Proposta</th><th>Cliente</th><th>Atualização</th><th>Status</th><th>Valor</th></tr></thead><tbody>{proposals.map((proposal) => {
        const value = proposal.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0) - Number(proposal.discount);
        return <tr key={proposal.id}><td><Link href={`/propostas/${proposal.id}`} className="cellTitle">#{proposal.number} · {proposal.title}</Link></td><td>{proposal.client.name}<div className="cellSub">{proposal.client.company ?? "Cliente"}</div></td><td>{shortDate(proposal.updatedAt)}</td><td><span className={`badge ${proposal.status}`}>{statusLabel[proposal.status]}</span></td><td className="cellTitle">{currency(value)}</td></tr>;
      })}</tbody></table></div>}
    </section>
  </>;
}
