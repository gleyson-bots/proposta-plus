import Link from "next/link";
import { createClient } from "@/app/actions";
import { requireUser } from "@/lib/auth";

export default async function NewClientPage() {
  await requireUser();
  return <>
    <header className="pageHeader">
      <div><p className="eyebrow">NOVO REGISTRO</p><h1>Cadastrar cliente</h1><p className="subtitle">O cliente será vinculado a você e herdará o escopo da sua hierarquia.</p></div>
    </header>
    <form action={createClient} className="formCard">
      <div className="formGrid">
        <div className="field"><label htmlFor="name">Nome *</label><input id="name" name="name" required minLength={2} placeholder="Nome do cliente" /></div>
        <div className="field"><label htmlFor="company">Empresa</label><input id="company" name="company" placeholder="Empresa ou negócio" /></div>
        <div className="field"><label htmlFor="email">E-mail</label><input id="email" type="email" name="email" placeholder="cliente@empresa.com" /></div>
        <div className="field"><label htmlFor="phone">WhatsApp / telefone</label><input id="phone" name="phone" placeholder="(11) 99999-9999" /></div>
      </div>
      <div className="formActions"><Link href="/clientes" className="button secondary">Cancelar</Link><button className="button" type="submit">Salvar cliente</button></div>
    </form>
  </>;
}
