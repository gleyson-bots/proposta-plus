import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowRight, FilePlus2, FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

const stateLabels: Record<string, string> = { draft: "Rascunho", sent: "Enviada", accepted: "Aceite", rejected: "Recusada", expired: "Expirada" };
const stateClass: Record<string, string> = { draft: "border-muted-foreground/40 text-muted-foreground", sent: "border-primary/60 text-primary", accepted: "border-emerald-400/60 text-emerald-300", rejected: "border-red-400/60 text-red-300", expired: "border-orange-400/60 text-orange-300" };
const money = (cents: number, currency: string) => new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(cents / 100);

export default function Proposals() {
  const [, navigate] = useLocation();
  const proposals = trpc.proposals.list.useQuery();
  const [query, setQuery] = useState("");
  const rows = useMemo(() => (proposals.data ?? []).filter(({ proposal, client }) => `${proposal.title} ${proposal.proposalNumber} ${client.contactName} ${client.companyName ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [proposals.data, query]);
  return <DashboardLayout><section className="mx-auto max-w-7xl space-y-7"><header className="flex flex-col justify-between gap-5 border-b border-primary/30 pb-7 sm:flex-row sm:items-end"><div><p className="deco-eyebrow">Ciclo de venda</p><h1 className="deco-title mt-2 text-5xl sm:text-6xl">Propostas</h1><p className="mt-3 text-muted-foreground">Prepare, acompanhe e formalize cada proposta com um histórico verificável.</p></div><Button onClick={() => navigate("/propostas/nova")} className="h-11 rounded-none bg-primary text-primary-foreground hover:bg-primary/85"><FilePlus2 className="mr-2 h-4 w-4" />Nova proposta</Button></header>
    <div className="deco-panel overflow-hidden"><div className="flex flex-col gap-4 border-b border-primary/25 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="deco-eyebrow">Registo comercial</p><h2 className="deco-title mt-1 text-3xl">Todas as propostas</h2></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-3 h-4 w-4 text-primary" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Pesquisar proposta" className="rounded-none pl-9" /></div></div>
      {proposals.isLoading ? <div className="p-10 text-center text-muted-foreground">A carregar propostas…</div> : !rows.length ? <div className="p-12 text-center"><FileText className="mx-auto h-8 w-8 text-primary" /><h3 className="deco-title mt-4 text-2xl">Ainda não existem propostas</h3><p className="mt-2 text-sm text-muted-foreground">Crie uma proposta e associe-lhe cliente, itens e condições comerciais.</p><Button onClick={() => navigate("/propostas/nova")} variant="outline" className="mt-6 rounded-none border-primary/50 text-primary hover:bg-primary/10 hover:text-primary">Criar proposta</Button></div> : <div className="divide-y divide-primary/15">{rows.map(({ proposal, client }) => <button key={proposal.id} onClick={() => navigate(`/propostas/${proposal.id}`)} className="grid w-full gap-3 px-6 py-5 text-left transition-colors hover:bg-primary/5 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"><div className="min-w-0"><p className="font-semibold text-foreground">{proposal.title}</p><p className="mt-1 truncate text-sm text-muted-foreground">{proposal.proposalNumber} · {client.companyName || client.contactName}</p></div><Badge variant="outline" className={`w-fit rounded-none px-2 py-1 text-[0.65rem] uppercase tracking-[0.14em] ${stateClass[proposal.state]}`}>{stateLabels[proposal.state]}</Badge><div className="flex items-center justify-between gap-4 md:justify-end"><span className="font-semibold text-primary">{money(proposal.totalCents, proposal.currency)}</span><ArrowRight className="h-4 w-4 text-primary" /></div></button>)}</div>}
    </div>
  </section></DashboardLayout>;
}
