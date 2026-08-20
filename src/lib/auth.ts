import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureDatabaseReady } from "@/lib/ensure-db";

export const SESSION_COOKIE = "pp_session";

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  await ensureDatabaseReady();
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
