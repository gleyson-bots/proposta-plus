import Link from "next/link";
import prisma from "@/lib/prisma";
import { currency, shortDate, statusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

async function getDashboard() {
  try {
    const [proposals, clients] = await Promise.all([
      prisma.proposal.findMany({
        include: { client: true, items: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.client.count(),
    ]);

    const total = proposals.reduce((sum, proposal) => sum + proposal.items.reduce((itemSum, item) => itemSum + Number(item.quantity) * Number(item.unitPrice), 0) - Number(proposal.discount), 0);
    const accepted = proposals.filter((proposal) => proposal.status === "ACCEPTED");
    const acceptedValue = accepted.reduce((sum, proposal) => sum + proposal.items.reduce((itemSum, item) => itemSum + Number(item.quantity) * Number(item.unitPrice), 0) - Number(proposal.discount), 0);

    return { proposals, clients, total, acceptedValue, accepted: accepted.length };
  } catch {
    return { proposals: [], clients: 0, total: 0, acceptedValue: 0, accepted: 0 };
  }
}

export default async function DashboardPage() {
  const data = await getDashboard();

  return <>
    <header className="pageHeader">
      <div><p className="eyebrow">PAINEL COMERCIAL</p><h1>Suas propostas, sob controle.</h1><p className="subtitle">Acompanhe negociações e transforme oportunidades em receita.</p></div>
      <Link href="/propostas/nova" className="button">＋ Nova proposta</Link>
    </header>

    <section className="gridStats">
      <div className="statCard"><div className="statLabel">Propostas recentes</div><div className="statValue">{data.proposals.length}</div><div className="statHint">pipeline atual</div></div>
      <div className="statCard"><div className="statLabel">Clientes</div><div className="statValue">{data.clients}</div><div className="statHint">na sua base</div></div>
      <div className="statCard"><div className="statLabel">Valor em propostas</div><div className="statValue">{currency(data.total)}</div><div className="statHint">valor bruto recente</div></div>
      <div className="statCard"><div className="statLabel">Receita aceita</div><div className="statValue">{currency(data.acceptedValue)}</div><div className="statHint">{data.accepted} aceita(s)</div></div>
    </section>

    <section className="panel">
      <div className="panelHead"><h2>Atividade recente</h2><Link href="/propostas" className="button secondary">Ver todas</Link></div>
      {data.proposals.length === 0 ? <div className="empty">Conecte o PostgreSQL e crie sua primeira proposta.</div> : <div className="tableWrap"><table className="table"><thead><tr><th>Proposta</th><th>Cliente</th><th>Data</th><th>Status</th><th>Valor</th></tr></thead><tbody>{data.proposals.map((proposal) => {
        const value = proposal.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0) - Number(proposal.discount);
        return <tr key={proposal.id}><td><Link href={`/propostas/${proposal.id}`} className="cellTitle">#{proposal.number} · {proposal.title}</Link></td><td><div className="cellTitle">{proposal.client.name}</div><div className="cellSub">{proposal.client.company ?? "Cliente"}</div></td><td>{shortDate(proposal.createdAt)}</td><td><span className={`badge ${proposal.status}`}>{statusLabel[proposal.status]}</span></td><td className="cellTitle">{currency(value)}</td></tr>;
      })}</tbody></table></div>}
    </section>
  </>;
}
