import Link from "next/link";
import prisma from "@/lib/prisma";
import { shortDate } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { getDataScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const actor = await requireUser();
  const clients = await prisma.client.findMany({
    where: await getDataScope(actor),
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return <>
    <header className="pageHeader">
      <div><p className="eyebrow">RELACIONAMENTO</p><h1>Clientes</h1><p className="subtitle">Você vê seus clientes e os clientes da estrutura subordinada ao seu cargo.</p></div>
      <Link className="button" href="/clientes/novo">＋ Novo cliente</Link>
    </header>
    <section className="panel">
      <div className="panelHead"><h2>Base de clientes</h2><span className="cellSub">{clients.length} registro(s) no seu escopo</span></div>
      {clients.length === 0 ? <div className="empty">Nenhum cliente cadastrado ainda.</div> : <div className="tableWrap"><table className="table"><thead><tr><th>Nome</th><th>Empresa</th><th>Contato</th><th>Responsável</th><th>Cadastro</th></tr></thead><tbody>{clients.map((client) => <tr key={client.id}><td className="cellTitle">{client.name}</td><td>{client.company ?? "—"}</td><td><div>{client.email ?? client.phone ?? "—"}</div><div className="cellSub">{client.email && client.phone ? client.phone : ""}</div></td><td>{client.owner?.name ?? "Legado"}</td><td>{shortDate(client.createdAt)}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
