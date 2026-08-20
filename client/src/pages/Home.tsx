import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle2, FilePlus2, FileText, Target, Wallet } from "lucide-react";
import { useLocation } from "wouter";

function euro(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(cents / 100);
}

const stateLabel: Record<string, string> = {
  draft: "Rascunho", sent: "Enviada", accepted: "Aceite", rejected: "Recusada", expired: "Expirada",
};

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof FileText; label: string; value: string; detail: string }) {
  return <div className="deco-panel min-h-40 p-6">
    <div className="flex items-start justify-between gap-4"><p className="deco-eyebrow">{label}</p><Icon className="h-5 w-5 text-primary" /></div>
    <p className="deco-title mt-5 text-4xl leading-none text-foreground">{value}</p>
    <p className="mt-3 text-sm text-muted-foreground">{detail}</p>
  </div>;
}

export default function Home() {
  const [, navigate] = useLocation();
  const metrics = trpc.dashboard.metrics.useQuery();
  const data = metrics.data;

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-6 border-b border-primary/30 pb-7 sm:flex-row sm:items-end">
          <div><p className="deco-eyebrow">Gestão comercial</p><h1 className="deco-title mt-2 text-5xl text-foreground sm:text-6xl">O seu panorama</h1><p className="mt-3 max-w-xl text-muted-foreground">Acompanhe o valor em aberto, as decisões e a atividade comercial a partir de dados persistentes.</p></div>
          <Button onClick={() => navigate("/propostas/nova")} className="h-11 rounded-none bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/85"><FilePlus2 className="mr-2 h-4 w-4" />Nova proposta</Button>
        </header>

        {metrics.isLoading ? <div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map(item => <Skeleton key={item} className="h-40 rounded-none" />)}</div> : metrics.isError ? <div className="deco-panel p-8 text-muted-foreground">Não foi possível carregar os indicadores. Atualize a página ou tente novamente.</div> : <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard icon={FileText} label="Propostas" value={String(data?.totalProposals ?? 0)} detail="Registos visíveis para o seu perfil." />
            <MetricCard icon={Target} label="Conversão" value={`${data?.conversionRate ?? 0}%`} detail="Aceites entre propostas já decididas." />
            <MetricCard icon={Wallet} label="Em aberto" value={euro(data?.openValueCents ?? 0)} detail="Valor total das propostas enviadas." />
          </div>

          <div className="deco-panel overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-primary/25 px-6 py-5"><div><p className="deco-eyebrow">Atividade recente</p><h2 className="deco-title mt-1 text-3xl">Propostas em movimento</h2></div><Button variant="ghost" onClick={() => navigate("/propostas")} className="rounded-none text-primary hover:bg-primary/10 hover:text-primary">Ver todas <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
            {!data?.recent.length ? <div className="p-10 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-primary" /><h3 className="deco-title mt-4 text-2xl">Pronto para a primeira proposta</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Crie um cliente e uma proposta para começar a acompanhar a atividade comercial real.</p><Button onClick={() => navigate("/clientes")} variant="outline" className="mt-6 rounded-none border-primary/50 text-primary hover:bg-primary/10 hover:text-primary">Gerir clientes</Button></div> : <div className="divide-y divide-primary/15">{data.recent.map(({ proposal, client }) => <button key={proposal.id} onClick={() => navigate(`/propostas/${proposal.id}`)} className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-primary/5"><div className="min-w-0"><p className="font-medium text-foreground">{proposal.title}</p><p className="mt-1 text-sm text-muted-foreground">{proposal.proposalNumber} · {client.companyName || client.contactName}</p></div><div className="shrink-0 text-right"><p className="font-semibold text-primary">{euro(proposal.totalCents, proposal.currency)}</p><p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">{stateLabel[proposal.state]}</p></div></button>)}</div>}
          </div>
        </>}
      </section>
    </DashboardLayout>
  );
}
