import type { Metadata } from "next";
import "./globals.css";
import "./rbac-chat.css";
import { Sidebar } from "@/components/sidebar";
import { ShellBoundary } from "@/components/shell-boundary";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Proposta Plus",
  description: "Gestão inteligente de propostas comerciais",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="pt-BR">
      <body>
        <ShellBoundary
          authenticated={Boolean(user)}
          sidebar={user ? <Sidebar user={user} /> : null}
        >
          {children}
        </ShellBoundary>
      </body>
    </html>
  );
}
