import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
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
        {user ? (
          <div className="appShell">
            <Sidebar user={user} />
            <main className="mainContent">{children}</main>
          </div>
        ) : children}
      </body>
    </html>
  );
}
