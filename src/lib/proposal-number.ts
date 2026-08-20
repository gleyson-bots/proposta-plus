import prisma from "@/lib/prisma";

/**
 * O SQLite/Prisma só permite autoincrement() no campo @id.
 * Como Proposal.id permanece um cuid(), a numeração comercial é calculada
 * separadamente. A constraint @unique em Proposal.number evita duplicações.
 */
export async function getNextProposalNumber() {
  const result = await prisma.proposal.aggregate({
    _max: { number: true },
  });

  return (result._max.number ?? 0) + 1;
}
