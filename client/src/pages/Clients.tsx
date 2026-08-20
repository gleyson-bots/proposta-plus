import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Archive, Pencil, Plus, Search, Users, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

type ClientRecord = {
  id: number; contactName: string; companyName: string | null; email: string | null; phone: string | null;
  taxId: string | null; jobTitle: string | null; city: string | null; country: string | null;
  notes: string | null; archivedAt: Date | null;
};

const emptyForm = { contactName: "", companyName: "", email: "", phone: "", taxId: "", jobTitle: "", city: "", country: "", notes: "" };

export default function Clients() {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const clients = trpc.clients.list.useQuery({ includeArchived: true, query });
  const create = trpc.clients.create.useMutation({ onSuccess: () => { utils.clients.list.invalidate(); toast.success("Cliente criado."); } });
  const update = trpc.clients.update.useMutation({ onSuccess: () => { utils.clients.list.invalidate(); toast.success("Cliente atualizado."); } });
  const archive = trpc.clients.archive.useMutation({ onSuccess: () => utils.clients.list.invalidate() });
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const [showForm, setShowForm] = useState(false);

  const rows = clients.data ?? [];

  function beginEdit(client: ClientRecord) { setEditing(client); setShowForm(true); }
  function closeForm() { setEditing(null); setShowForm(false); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => (String(form.get(name) ?? "").trim() || null);
    const data = { contactName: String(form.get("contactName") ?? "").trim(), companyName: value("companyName"), email: value("email"), phone: value("phone"), taxId: value("taxId"), jobTitle: value("jobTitle"), city: value("city"), country: value("country"), notes: value("notes") };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, data }); else await create.mutateAsync(data);
      closeForm();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível guardar o cliente."); }
  }

  return <DashboardLayout><section className="mx-auto max-w-7xl space-y-7">
    <header className="flex flex-col justify-between gap-5 border-b border-primary/30 pb-7 sm:flex-row sm:items-end"><div><p className="deco-eyebrow">Base relacional</p><h1 className="deco-title mt-2 text-5xl sm:text-6xl">Clientes</h1><p className="mt-3 text-muted-foreground">Contactos e organizações utilizados pelas suas propostas comerciais.</p></div><Button onClick={() => { setEditing(null); setShowForm(true); }} className="h-11 rounded-none bg-primary text-primary-foreground hover:bg-primary/85"><Plus className="mr-2 h-4 w-4" />Novo cliente</Button></header>

    {showForm && <form onSubmit={submit} className="deco-panel grid gap-4 p-6 md:grid-cols-2"><div className="md:col-span-2 flex items-center justify-between"><div><p className="deco-eyebrow">{editing ? "Editar registo" : "Novo registo"}</p><h2 className="deco-title text-3xl">{editing ? editing.contactName : "Identificação do cliente"}</h2></div><Button type="button" onClick={closeForm} variant="ghost" className="rounded-none text-primary hover:bg-primary/10 hover:text-primary"><X className="h-4 w-4" /></Button></div>
      <label className="space-y-2 text-sm">Nome de contacto<Input required name="contactName" defaultValue={editing?.contactName ?? emptyForm.contactName} className="rounded-none" /></label>
      <label className="space-y-2 text-sm">Empresa<Input name="companyName" defaultValue={editing?.companyName ?? emptyForm.companyName} className="rounded-none" /></label>
      <label className="space-y-2 text-sm">Email<Input type="email" name="email" defaultValue={editing?.email ?? emptyForm.email} className="rounded-none" /></label>
      <label className="space-y-2 text-sm">Telefone<Input name="phone" defaultValue={editing?.phone ?? emptyForm.phone} className="rounded-none" /></label>
      <label className="space-y-2 text-sm">NIF<Input name="taxId" defaultValue={editing?.taxId ?? emptyForm.taxId} className="rounded-none" /></label>
      <label className="space-y-2 text-sm">Cargo<Input name="jobTitle" defaultValue={editing?.jobTitle ?? emptyForm.jobTitle} className="rounded-none" /></label>
      <label className="space-y-2 text-sm">Cidade<Input name="city" defaultValue={editing?.city ?? emptyForm.city} className="rounded-none" /></label>
      <label className="space-y-2 text-sm">País<Input name="country" defaultValue={editing?.country ?? emptyForm.country} className="rounded-none" /></label>
      <label className="space-y-2 text-sm md:col-span-2">Notas<Textarea name="notes" defaultValue={editing?.notes ?? emptyForm.notes} className="min-h-24 rounded-none" /></label>
      <div className="md:col-span-2 flex justify-end gap-3"><Button type="button" variant="outline" onClick={closeForm} className="rounded-none border-primary/50 text-primary hover:bg-primary/10 hover:text-primary">Cancelar</Button><Button type="submit" disabled={create.isPending || update.isPending} className="rounded-none bg-primary text-primary-foreground hover:bg-primary/85">Guardar cliente</Button></div>
    </form>}

    <div className="deco-panel overflow-hidden"><div className="flex flex-col gap-4 border-b border-primary/25 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="deco-eyebrow">Diretório comercial</p><h2 className="deco-title mt-1 text-3xl">Todos os clientes</h2></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-3 h-4 w-4 text-primary" /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Pesquisar" className="rounded-none pl-9" /></div></div>
      {clients.isLoading ? <div className="p-10 text-center text-muted-foreground">A carregar clientes…</div> : !rows.length ? <div className="p-12 text-center"><Users className="mx-auto h-8 w-8 text-primary" /><h3 className="deco-title mt-4 text-2xl">Sem clientes encontrados</h3><p className="mt-2 text-sm text-muted-foreground">Crie o primeiro contacto comercial para o utilizar numa proposta.</p></div> : <div className="divide-y divide-primary/15">{rows.map(client => <div key={client.id} className="flex items-center justify-between gap-4 px-6 py-4"><div className="min-w-0"><p className="font-semibold text-foreground">{client.contactName}{client.archivedAt ? <span className="ml-2 text-xs font-normal uppercase tracking-wider text-muted-foreground">Arquivado</span> : null}</p><p className="mt-1 truncate text-sm text-muted-foreground">{client.companyName || "Particular"} · {client.email || "sem email"}</p></div><div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" onClick={() => beginEdit(client)} className="rounded-none text-primary hover:bg-primary/10 hover:text-primary"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => archive.mutate({ id: client.id, archived: !client.archivedAt }, { onSuccess: () => toast.success(client.archivedAt ? "Cliente reativado." : "Cliente arquivado.") })} className="rounded-none text-primary hover:bg-primary/10 hover:text-primary"><Archive className="h-4 w-4" /></Button></div></div>)}</div>}
    </div>
  </section></DashboardLayout>;
}
