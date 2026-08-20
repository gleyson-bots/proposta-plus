import { createHash } from "node:crypto";
import PDFDocument from "pdfkit";
import * as db from "./db";
import { storageGetSignedUrl, storagePut } from "./storage";

type ProposalDetail = NonNullable<Awaited<ReturnType<typeof db.getProposalDetail>>>;

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(cents / 100);
}

function addDivider(doc: any, y: number) {
  doc.strokeColor("#B99446").lineWidth(0.7).moveTo(50, y).lineTo(545, y).stroke();
}

async function tryAddLogo(doc: any, storageKey?: string | null) {
  if (!storageKey) return;
  try {
    const signedUrl = await storageGetSignedUrl(storageKey);
    const response = await fetch(signedUrl);
    if (!response.ok) return;
    const buffer = Buffer.from(await response.arrayBuffer());
    doc.image(buffer, 445, 46, { fit: [95, 56], align: "right" });
  } catch {
    // A ausência de um logótipo não impede a geração do documento fiscal.
  }
}

export async function renderProposalPdf(detail: ProposalDetail) {
  const company = await db.getCompanySettings();
  const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: detail.proposal.title, Author: company?.legalName ?? "Proposta+" } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const completed = new Promise<Buffer>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });

  doc.rect(0, 0, 595, 118).fill("#16130F");
  doc.fillColor("#D1AE61").font("Times-Bold").fontSize(11).text("PROPOSTA COMERCIAL", 50, 40, { characterSpacing: 2 });
  doc.fillColor("#F3E9D6").font("Times-Roman").fontSize(26).text(company?.tradingName || company?.legalName || "A sua empresa", 50, 60);
  await tryAddLogo(doc, company?.logoStorageKey);
  doc.fillColor("#2A241B").font("Helvetica-Bold").fontSize(10).text(detail.proposal.proposalNumber, 50, 145);
  doc.font("Times-Bold").fontSize(24).text(detail.proposal.title, 50, 165, { width: 400 });
  doc.font("Helvetica").fontSize(9).fillColor("#665B4B").text(`Emitida em ${new Date(detail.proposal.createdAt).toLocaleDateString("pt-PT")}`, 50, 201);
  addDivider(doc, 222);

  doc.fillColor("#B99446").font("Helvetica-Bold").fontSize(8).text("DESTINATÁRIO", 50, 240, { characterSpacing: 1.6 });
  doc.fillColor("#2A241B").font("Helvetica-Bold").fontSize(12).text(detail.client.companyName || detail.client.contactName, 50, 257);
  doc.font("Helvetica").fontSize(9).fillColor("#665B4B").text([detail.client.contactName, detail.client.email, detail.client.taxId].filter(Boolean).join(" · "), 50, 274);
  doc.fillColor("#B99446").font("Helvetica-Bold").fontSize(8).text("EMITENTE", 334, 240, { characterSpacing: 1.6 });
  doc.fillColor("#2A241B").font("Helvetica-Bold").fontSize(10).text(company?.legalName || "Configuração da empresa pendente", 334, 257, { width: 210 });
  doc.font("Helvetica").fontSize(8).fillColor("#665B4B").text([company?.taxId && `NIF ${company.taxId}`, company?.email, company?.phone].filter(Boolean).join(" · "), 334, 274, { width: 210 });

  let y = 320;
  doc.rect(50, y, 495, 24).fill("#2A241B");
  doc.fillColor("#D1AE61").font("Helvetica-Bold").fontSize(8).text("DESCRIÇÃO", 61, y + 8).text("QTD.", 346, y + 8).text("VALOR", 472, y + 8, { width: 62, align: "right" });
  y += 35;
  for (const item of detail.items) {
    if (y > 690) { doc.addPage(); y = 65; }
    doc.fillColor("#2A241B").font("Helvetica-Bold").fontSize(10).text(item.title, 61, y, { width: 260 });
    if (item.description) doc.fillColor("#665B4B").font("Helvetica").fontSize(8).text(item.description, 61, y + 14, { width: 260 });
    doc.fillColor("#2A241B").font("Helvetica").fontSize(9).text(String(Number(item.quantity)), 346, y + 3);
    doc.font("Helvetica-Bold").text(money(item.lineTotalCents, detail.proposal.currency), 450, y + 3, { width: 84, align: "right" });
    y += item.description ? 42 : 29;
    doc.strokeColor("#E2D4BC").lineWidth(0.5).moveTo(61, y - 7).lineTo(534, y - 7).stroke();
  }
  y += 12;
  const totalsX = 370;
  const totalRow = (label: string, value: string, strong = false) => { doc.fillColor(strong ? "#2A241B" : "#665B4B").font(strong ? "Times-Bold" : "Helvetica").fontSize(strong ? 15 : 9).text(label, totalsX, y).text(value, 448, y, { width: 86, align: "right" }); y += strong ? 27 : 17; };
  totalRow("Subtotal", money(detail.proposal.subtotalCents, detail.proposal.currency));
  totalRow("Descontos", `− ${money(detail.proposal.discountCents, detail.proposal.currency)}`);
  totalRow("Impostos", money(detail.proposal.taxCents, detail.proposal.currency));
  doc.strokeColor("#B99446").lineWidth(1).moveTo(totalsX, y - 5).lineTo(534, y - 5).stroke(); y += 6;
  totalRow("TOTAL", money(detail.proposal.totalCents, detail.proposal.currency), true);
  if (detail.proposal.clientMessage) { y += 24; doc.fillColor("#B99446").font("Helvetica-Bold").fontSize(8).text("MENSAGEM", 50, y, { characterSpacing: 1.6 }); y += 16; doc.fillColor("#403729").font("Helvetica").fontSize(9).text(detail.proposal.clientMessage, 50, y, { width: 495, lineGap: 3 }); }
  const terms = (detail.metadata?.commercialTerms as Record<string, unknown> | undefined) ?? {};
  const renderedTerms = [
    ["CONDIÇÕES DE PAGAMENTO", terms.paymentTerms], ["ENTRADA / SINAL", terms.downPayment], ["FINANCIAMENTO", terms.financingTerms],
    ["COMISSÕES", terms.commissionTerms], ["ELEGIBILIDADE", terms.eligibilityCriteria], ["ATRIBUTOS DO CATÁLOGO", terms.catalogAttributes],
  ].filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0);
  if (renderedTerms.length) {
    if (y > 610) { doc.addPage(); y = 65; }
    y += 24;
    doc.fillColor("#B99446").font("Helvetica-Bold").fontSize(8).text("TERMOS COMERCIAIS", 50, y, { characterSpacing: 1.6 });
    y += 16;
    for (const [label, value] of renderedTerms) {
      doc.fillColor("#2A241B").font("Helvetica-Bold").fontSize(8).text(label, 50, y);
      y += 11;
      doc.fillColor("#403729").font("Helvetica").fontSize(8).text(value, 50, y, { width: 495, lineGap: 2 });
      y += Math.max(18, doc.heightOfString(value, { width: 495, lineGap: 2 }) + 10);
    }
  }
  const sharedAttachments = detail.attachments.filter(attachment => attachment.includeInDocument && attachment.shareWithClient);
  if (sharedAttachments.length) { y += 42; doc.fillColor("#B99446").font("Helvetica-Bold").fontSize(8).text("ANEXOS INCLUÍDOS", 50, y, { characterSpacing: 1.6 }); y += 16; doc.fillColor("#403729").font("Helvetica").fontSize(8).text(sharedAttachments.map(attachment => `• ${attachment.originalName}`).join("\n"), 50, y, { width: 495, lineGap: 3 }); }
  if (detail.proposal.validUntil) { doc.fillColor("#665B4B").font("Helvetica").fontSize(8).text(`Proposta válida até ${new Date(detail.proposal.validUntil).toLocaleDateString("pt-PT")}.`, 50, 750); }
  doc.end();
  return completed;
}

export async function generateAndStoreProposalPdf(proposalId: number, generatedByUserId?: number | null) {
  const detail = await db.getProposalDetail(proposalId);
  if (!detail) throw new Error("Proposta não encontrada para geração do documento.");
  const buffer = await renderProposalPdf(detail);
  const filename = `${detail.proposal.proposalNumber}.pdf`;
  const file = await storagePut(`proposals/${proposalId}/documents/${filename}`, buffer, "application/pdf");
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const documentId = await db.recordGeneratedDocument({ proposalId, generatedByUserId: generatedByUserId ?? null, type: "proposal_pdf", storageKey: file.key, storageUrl: file.url, checksum, proposalVersion: detail.proposal.version });
  return { id: documentId, filename, buffer, url: file.url, storageKey: file.key, proposalVersion: detail.proposal.version };
}
