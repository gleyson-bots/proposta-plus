import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function legacyRole(role: string) {
  switch (role) {
    case "MANAGER":
      return { role: "gerente", label: "gerente" };
    case "SUPERVISOR":
      return { role: "sup", label: "superintendente" };
    case "DIRECTOR":
      return { role: "diretor", label: "diretor" };
    case "VP":
      return { role: "vp", label: "VP" };
    case "ADMIN":
      // O protótipo original termina a cadeia de aprovação no VP.
      // Para manter todas as funções administrativas no modo compatível,
      // o ADMIN recebe a autoridade funcional do topo da cadeia.
      return { role: "vp", label: "administrador" };
    case "BROKER":
    default:
      return { role: "corretor", label: "corretor" };
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.redirect(new URL("/login", request.url), 307);

  const originalPath = path.join(process.cwd(), "index.html");
  let html = await readFile(originalPath, "utf8");
  const mapped = legacyRole(user.role);
  const sessionUser = JSON.stringify({
    name: user.name,
    email: user.email,
    role: mapped.role,
    label: mapped.label,
  }).replace(/</g, "\\u003c");

  const sessionBridge = `
<script id="pp-next-session-bridge">
(function () {
  function bootAuthenticatedPrototype() {
    try {
      CURRENT_USER = ${sessionUser};
      if (typeof updateRoleUI === 'function') updateRoleUI();
      var dl = document.getElementById('dlogin');
      if (dl) dl.style.display = 'none';
      var da = document.getElementById('dapp');
      if (da) da.classList.add('on');
      if (typeof loadSent === 'function') loadSent();
      if (typeof loadSaved === 'function') loadSaved();
      if (typeof renderFila === 'function') renderFila();
      if (typeof renderPropostas === 'function') renderPropostas();
      var land = CURRENT_USER.role === 'corretor' ? 'propostas' : 'fila';
      if (typeof dgo === 'function') dgo(land);
      if (typeof mgo === 'function') mgo(land);
      if (typeof applyView === 'function') applyView();

      // O botão "Sair" do index antigo limpava apenas a UI local.
      // No ambiente Next ele também precisa encerrar a sessão HTTP-only.
      window.logout = function () {
        window.location.assign('/logout');
      };
    } catch (error) {
      console.error('[Proposta+ bridge] Falha ao iniciar protótipo autenticado', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAuthenticatedPrototype, { once: true });
  } else {
    bootAuthenticatedPrototype();
  }
})();
</script>`;

  html = html.includes("</body>")
    ? html.replace("</body>", `${sessionBridge}</body>`)
    : `${html}${sessionBridge}`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
