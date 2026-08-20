import path from "node:path";
import * as db from "./db";
import { storagePut } from "./storage";

function decodeDataUrl(dataUrl: string, maxBytes: number) {
  const match = /^data:([a-zA-Z0-9/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("O ficheiro enviado não tem um formato válido.");
  const data = Buffer.from(match[2], "base64");
  if (!data.length || data.length > maxBytes) throw new Error(`O ficheiro deve ter no máximo ${Math.floor(maxBytes / 1_000_000)} MB.`);
  return { contentType: match[1], data };
}

function cleanFilename(filename: string) {
  const safe = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe || "ficheiro";
}

export async function storeCompanyLogo(dataUrl: string, filename: string) {
  const { data, contentType } = decodeDataUrl(dataUrl, 5_000_000);
  if (!contentType.startsWith("image/")) throw new Error("O logótipo tem de ser uma imagem.");
  return storagePut(`company/logo/${cleanFilename(filename)}`, data, contentType);
}

export async function storeProposalAttachment(input: { proposalId: number; uploadedByUserId: number; filename: string; dataUrl: string; shareWithClient: boolean }) {
  const { data, contentType } = decodeDataUrl(input.dataUrl, 10_000_000);
  const filename = cleanFilename(input.filename);
  const file = await storagePut(`proposals/${input.proposalId}/attachments/${filename}`, data, contentType);
  const id = await db.createProposalAttachment({ proposalId: input.proposalId, uploadedByUserId: input.uploadedByUserId, storageKey: file.key, storageUrl: file.url, originalName: filename, mimeType: contentType, sizeBytes: data.length, includeInDocument: true, shareWithClient: input.shareWithClient });
  return { id, ...file, filename, mimeType: contentType, sizeBytes: data.length };
}
