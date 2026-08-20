import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasPersistentDatabase } from "@/lib/database-adapter";

export const SESSION_COOKIE = "pp_session";

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // Em produção na Vercel, não tente consultar um SQLite temporário. Isso
  // garante que /login e demais páginas públicas continuem renderizando mesmo
  // antes de TURSO_DATABASE_URL ser configurada.
  if (process.env.VERCEL && !hasPersistentDatabase()) return null;

  const { default: prisma } = await import("@/lib/prisma");
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt <= new Date() || !session.user.isActive) return null;
  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
