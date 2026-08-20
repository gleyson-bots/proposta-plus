import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  store.delete(SESSION_COOKIE);
  return Response.redirect(new URL("/login", request.url), 307);
}
