import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { login } from "@/app/login/actions";
import styles from "./login.module.css";

const testProfiles = [
  "corretor@metrocasas.com.br",
  "gerente@metrocasas.com.br",
  "sup@metrocasas.com.br",
  "diretor@metrocasas.com.br",
  "vp@metrocasas.com.br",
  "admin@metrocasas.com.br",
];

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className={styles.login}>
      <section className={styles.left} aria-label="Proposta Plus">
        <div className={styles.desktopHero}>
          <div className={styles.wordmark}>Proposta<span>+</span></div>
          <p className={styles.heroCopy}>
            Monte, valide e aprove propostas — de qualquer lugar, com ou sem internet.
          </p>
          <div className={styles.tag}>você + perto</div>
        </div>

        <div className={styles.mobileHero}>
          <div className={styles.mobileMetro}>
            <span className={styles.mobileMetroMark} aria-hidden="true" />
            <span>METROCASA</span>
          </div>
          <div className={styles.mobileWordmark}>Proposta<span>+</span></div>
          <p>Bem-vindo de volta</p>
        </div>
      </section>

      <section className={styles.right}>
        <div className={styles.box}>
          <div className={styles.metroBrand} aria-label="Metrocasa">
            <span className={styles.metroMark} aria-hidden="true" />
            <span>METROCASA</span>
          </div>

          <h1>Entrar</h1>

          <form action={login} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">E-mail corporativo</label>
              <input
                className={styles.input}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="corretor@metrocasas.com.br"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Senha</label>
              <input
                className={styles.input}
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
            </div>

            <button className={styles.submit} type="submit">Entrar</button>
          </form>

          <div className={styles.loginHelp}>
            <strong className={styles.helpTitle}>
              Perfis de teste <span>(senha: qualquer)</span>
            </strong>

            {testProfiles.map((email) => (
              <form action={login} className={styles.profileForm} key={email}>
                <input type="hidden" name="email" value={email} />
                <input type="hidden" name="password" value="teste" />
                <button type="submit" className={styles.profileButton}>{email}</button>
              </form>
            ))}
          </div>

          <p className={styles.policy}>
            <span className={styles.version}>v1.0</span> · política CEF
          </p>
        </div>
      </section>
    </main>
  );
}
