import Link from "next/link";
import prisma from "@/lib/prisma";
import { createProposal } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getDataScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function NewProposalPage() {
  const actor = await requireUser();
  const clients = await prisma.client.findMany({
    where: await getDataScope(actor),
    select: { id: true, name: true, company: true },
    orderBy: { name: "asc" },
  });

  return <>
    <header className="pageHeader">
      <div><p className="eyebrow">NOVA NEGOCIAÇÃO</p><h1>Criar proposta</h1><p className="subtitle">A nova proposta ficará vinculada a você e será visível apenas dentro da sua cadeia hierárquica.</p></div>
    </header>
    {clients.length === 0 ? <div className="formCard"><h2>Cadastre um cliente primeiro</h2><p className="subtitle">Toda proposta precisa estar vinculada a um cliente do seu escopo.</p><div className="formActions"><Link href="/clientes/novo" className="button">Cadastrar cliente</Link></div></div> :
    <form action={createProposal} className="formCard">
      <div className="formGrid">
        <div className="field full"><label htmlFor="clientId">Cliente *</label><select id="clientId" name="clientId" required defaultValue=""><option value="" disabled>Selecione um cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.company ? ` · ${client.company}` : ""}</option>)}</select></div>
        <div className="field full"><label htmlFor="title">Título da proposta *</label><input id="title" name="title" required minLength={3} placeholder="Ex.: Implantação comercial 2026" /></div>
        <div className="field full"><label htmlFor="description">Primeiro item *</label><input id="description" name="description" required placeholder="Serviço, produto ou pacote" /></div>
        <div className="field"><label htmlFor="quantity">Quantidade *</label><input id="quantity" name="quantity" type="number" min="0.01" step="0.01" defaultValue="1" required /></div>
        <div className="field"><label htmlFor="unitPrice">Valor unitário *</label><input id="unitPrice" name="unitPrice" type="number" min="0" step="0.01" placeholder="0,00" required /></div>
        <div className="field"><label htmlFor="validUntil">Validade</label><input id="validUntil" name="validUntil" type="date" /></div>
        <div className="field full"><label htmlFor="notes">Observações</label><textarea id="notes" name="notes" placeholder="Condições comerciais, escopo ou observações importantes." /></div>
      </div>
      <div className="formActions"><Link href="/propostas" className="button secondary">Cancelar</Link><button className="button" type="submit">Criar proposta</button></div>
    </form>}
  </>;
}
