import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { login } from "@/app/actions";

const testProfiles = [
  { email: "corretor@metrocasas.com.br", label: "Corretor" },
  { email: "gerente@metrocasas.com.br", label: "Gerente" },
  { email: "sup@metrocasas.com.br", label: "Supervisor" },
  { email: "diretor@metrocasas.com.br", label: "Diretor" },
  { email: "vp@metrocasas.com.br", label: "VP" },
  { email: "admin@metrocasas.com.br", label: "Admin" },
];

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="loginPage">
      <section className="loginCard">
        <div className="loginBrand"><span className="brandMark">P+</span><div><strong>Proposta Plus</strong><small>ACESSO DE TESTE</small></div></div>
        <h1>Entrar no workspace</h1>
        <p className="subtitle">Use um perfil abaixo. Durante esta fase de homologação, qualquer senha é aceita.</p>

        <form action={login} className="loginForm">
          <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required placeholder="voce@metrocasas.com.br" /></div>
          <div className="field"><label htmlFor="password">Senha</label><input id="password" name="password" type="password" required defaultValue="teste" /></div>
          <button className="button" type="submit">Entrar</button>
        </form>

        <div className="testProfiles">
          <strong>Perfis de teste <span>(senha: qualquer)</span></strong>
          {testProfiles.map((profile) => (
            <form action={login} key={profile.email}>
              <input type="hidden" name="email" value={profile.email} />
              <input type="hidden" name="password" value="teste" />
              <button type="submit" className="profileLogin"><span>{profile.email}</span><small>{profile.label}</small></button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
