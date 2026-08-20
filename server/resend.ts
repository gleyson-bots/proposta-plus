import * as db from "./db";
import { generateAndStoreProposalPdf } from "./documents";

function html(value: string) { return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!); }

export async function sendProposalEmail(input: { proposalId: number; actorUserId: number; origin: string }) {
  const detail = await db.getProposalDetail(input.proposalId);
  if (!detail) throw new Error("Proposta não encontrada.");
  if (!detail.client.email) throw new Error("O cliente não tem email definido.");
  const key = `proposal-${input.proposalId}-v${detail.proposal.version}-sent`;
  const existing = await db.getEmailDeliveryByKey(key);
  if (existing?.status === "sent") return { status: "already_sent" as const, deliveryId: existing.id };
  await db.registerEmailPending({ proposalId: input.proposalId, proposalVersion: detail.proposal.version, recipient: detail.client.email, provider: "resend", providerMessageId: null, idempotencyKey: key });
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) { const message = "Integração Resend não configurada."; await db.markEmailFailed(key, message); return { status: "failed" as const, error: message }; }
  try {
    const pdf = await generateAndStoreProposalPdf(input.proposalId, input.actorUserId);
    const link = `${input.origin.replace(/\/$/, "")}/p/${detail.proposal.publicToken}`;
    const subject = `${detail.proposal.proposalNumber} — ${detail.proposal.title}`;
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify({ from, to: [detail.client.email], subject, html: `<main style="font-family:Arial,sans-serif;color:#221d16"><p>Olá ${html(detail.client.contactName)},</p><p>Tem disponível a proposta <strong>${html(detail.proposal.title)}</strong>.</p><p><a href="${html(link)}" style="background:#b99446;color:#17130f;padding:12px 18px;text-decoration:none">Ver proposta</a></p><p>O PDF segue em anexo.</p></main>`, attachments: [{ filename: pdf.filename, content: pdf.buffer.toString("base64") }] }) });
    const payload = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
    if (!response.ok) throw new Error(payload.message || payload.name || `A Resend respondeu com ${response.status}.`);
    await db.markEmailDelivered(key, payload.id ?? null);
    return { status: "sent" as const, deliveryId: (await db.getEmailDeliveryByKey(key))?.id, documentUrl: pdf.url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida no envio de email.";
    await db.markEmailFailed(key, message);
    return { status: "failed" as const, error: message };
  }
}
