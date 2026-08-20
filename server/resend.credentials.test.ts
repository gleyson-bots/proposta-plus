import { describe, expect, it } from "vitest";

type ResendDomain = {
  name?: string;
  status?: string;
};

function senderDomain(from: string): string {
  const address = from.match(/<([^>]+)>/)?.[1] ?? from;
  const domain = address.trim().split("@").at(-1)?.toLowerCase();

  if (!domain) {
    throw new Error("RESEND_FROM_EMAIL deve conter um endereço de email válido.");
  }

  return domain;
}

describe("configuração Resend", () => {
  it("autentica uma chave de envio e valida o formato do remetente", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    expect(apiKey, "RESEND_API_KEY deve estar configurada").toBeTruthy();
    expect(from, "RESEND_FROM_EMAIL deve estar configurado").toBeTruthy();

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // Um corpo vazio é intencional: a API deve chegar à validação de
      // campos sem criar ou enviar qualquer email.
      body: JSON.stringify({}),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };

    expect(
      response.status,
      payload.message ?? "A chave da Resend não foi aceite",
    ).not.toBe(401);
    expect(
      response.status,
      payload.message ?? "A chave da Resend não tem permissão para enviar",
    ).not.toBe(403);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);

    const expectedDomain = senderDomain(from!);
    expect(expectedDomain).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);
  }, 15_000);
});
