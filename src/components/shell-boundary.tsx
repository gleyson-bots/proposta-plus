"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function ShellBoundary({
  authenticated,
  sidebar,
  children,
}: {
  authenticated: boolean;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const standalone = pathname === "/login" || pathname.startsWith("/proposta");

  if (!authenticated || standalone) return <>{children}</>;

  return (
    <div className="appShell">
      {sidebar}
      <main className="mainContent">{children}</main>
    </div>
  );
}
