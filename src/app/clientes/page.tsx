import Link from "next/link";
import prisma from "@/lib/prisma";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  let clients: Awaited<ReturnType<typeof prisma.client.findMany>> = [];
  try {
    clients = await prisma.client.findMany({ orderBy: { createdAt: "desc" } });
  } catch {}

  return <>
    <header className="pageHeader">
      <div><p className="eyebrow">RELACIONAMENTO</p><h1>Clientes</h1><p className="subtitle">Centralize os contatos que recebem suas propostas.</p></div>
      <Link className="button" href="/clientes/novo">＋ Novo cliente</Link>
    </header>
    <section className="panel">
      <div className="panelHead"><h2>Base de clientes</h2><span className="cellSub">{clients.length} registro(s)</span></div>
      {clients.length === 0 ? <div className="empty">Nenhum cliente cadastrado ainda.</div> : <div className="tableWrap"><table className="table"><thead><tr><th>Nome</th><th>Empresa</th><th>Contato</th><th>Cadastro</th></tr></thead><tbody>{clients.map((client) => <tr key={client.id}><td className="cellTitle">{client.name}</td><td>{client.company ?? "—"}</td><td><div>{client.email ?? client.phone ?? "—"}</div><div className="cellSub">{client.email && client.phone ? client.phone : ""}</div></td><td>{shortDate(client.createdAt)}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
