"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ensureDatabaseReady } from "@/lib/ensure-db";
import { SESSION_COOKIE } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function login(formData: FormData) {
  await ensureDatabaseReady();

  const parsed = loginSchema.parse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const user = await prisma.user.findFirst({
    where: { email: parsed.email, isActive: true },
  });

  if (!user) redirect("/login?error=profile");

  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  // Enquanto a migração modular acontece, o index.html original é o motor
  // funcional canônico. Isso evita perder qualquer regra ou fluxo do protótipo.
  redirect("/proposta");
}
