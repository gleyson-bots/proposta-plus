import { readFile } from "node:fs/promises";
import process from "node:process";

const source = await readFile(new URL("../index.html", import.meta.url), "utf8");

const required = [
  ["login e entrada no app", "function enterApp"],
  ["papéis/permissões", "function updateRoleUI"],
  ["navegação responsiva", "function applyView"],
  ["assistente guiado", "function openQuiz"],
  ["recomendação de unidades", "function renderReco"],
  ["tipo de venda automático", "function derivedTvenda"],
  ["alteração do tipo de venda", "function onTvenda"],
  ["limpeza do fluxo", "function limparFlux"],
  ["regime CEF", "function toggleRegime"],
  ["cálculo financeiro", "function calc("],
  ["cálculo de comissão", "function calcCom"],
  ["salvar rascunho", "function guardarProposta"],
  ["captura do estado da proposta", "function captureState"],
  ["restauração do estado da proposta", "function restoreState"],
  ["carregar rascunhos", "function loadSaved"],
  ["carregar propostas enviadas", "function loadSent"],
  ["lista de propostas", "function renderPropostas"],
  ["fila de aprovação", "function renderFila"],
  ["aprovação por alçada", "function doApprove"],
  ["proteção do PDF", "function pdfSafe"],
  ["geração de PDF", "function exportPDF"],
  ["regras administrativas", "function renderAdmin"],
  ["persistência de rascunhos", "pp_salvas"],
  ["persistência de enviados", "pp_enviadas"],
  ["tela de regras de cálculo", "Regras de cálculo"],
  ["assistente de proposta", "Assistente de proposta"],
  ["biblioteca de unidades", "var UNITS"],
];

const missing = required.filter(([, marker]) => !source.includes(marker));

if (missing.length) {
  console.error("\n❌ O index.html perdeu funções obrigatórias do Proposta+.\n");
  for (const [name, marker] of missing) {
    console.error(`- ${name}: marcador ausente ${JSON.stringify(marker)}`);
  }
  console.error("\nA migração modular só pode substituir uma função depois de comprovar paridade.\n");
  process.exit(1);
}

console.log(`✅ Paridade-base do index preservada: ${required.length} capacidades verificadas.`);
