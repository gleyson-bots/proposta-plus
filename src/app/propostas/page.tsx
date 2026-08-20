import Link from "next/link";
import prisma from "@/lib/prisma";
import { currency, shortDate, statusLabel } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getDataScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const actor = await requireUser();
  const proposals = await prisma.proposal.findMany({
    where: await getDataScope(actor),
    include: { client: true, items: true, owner: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return <>
    <header className="pageHeader">
      <div><p className="eyebrow">PIPELINE</p><h1>Propostas</h1><p className="subtitle">Seu pipeline é filtrado pela equipe que está abaixo do seu cargo.</p></div>
      <Link href="/propostas/nova" className="button">＋ Nova proposta</Link>
    </header>
    <section className="panel">
      <div className="panelHead"><h2>Todas as propostas</h2><span className="cellSub">{proposals.length} registro(s) visíveis</span></div>
      {proposals.length === 0 ? <div className="empty">Nenhuma proposta dentro do seu escopo.</div> : <div className="tableWrap"><table className="table"><thead><tr><th>Proposta</th><th>Cliente</th><th>Responsável</th><th>Status</th><th>Valor</th></tr></thead><tbody>{proposals.map((proposal) => {
        const value = proposal.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0) - Number(proposal.discount);
        return <tr key={proposal.id}><td><Link href={`/propostas/${proposal.id}`} className="cellTitle">#{proposal.number} · {proposal.title}</Link><div className="cellSub">Atualizada em {shortDate(proposal.updatedAt)}</div></td><td>{proposal.client.name}<div className="cellSub">{proposal.client.company ?? "Cliente"}</div></td><td>{proposal.owner?.name ?? "Legado"}</td><td><span className={`badge ${proposal.status}`}>{statusLabel[proposal.status]}</span></td><td className="cellTitle">{currency(value)}</td></tr>;
      })}</tbody></table></div>}
    </section>
  </>;
}
