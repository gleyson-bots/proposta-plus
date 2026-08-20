import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { describe, expect, it } from "vitest";
import { clients, proposalMetadata, proposals, proposalStatusHistory, users } from "../drizzle/schema";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationTest = testDatabaseUrl ? it : it.skip;

describe("persistência e auditoria", () => {
  integrationTest("grava relações de proposta e revoga a transação de validação sem deixar registos", async () => {
    const connection = await mysql.createConnection({ uri: testDatabaseUrl!, ssl: { rejectUnauthorized: true } });
    const db = drizzle(connection);

    const runId = `vitest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const proposalNumber = `TEST-${runId}`.slice(0, 64);
    try {
      await db.transaction(async tx => {
        const userResult = await tx.insert(users).values({ openId: `${runId}-user`, name: "Teste transacional", email: `${runId}@example.invalid`, loginMethod: "test", role: "admin", lastSignedIn: new Date() }).$returningId();
        const userId = userResult[0]?.id;
        expect(userId).toBeTypeOf("number");

        const clientResult = await tx.insert(clients).values({ ownerUserId: userId!, contactName: "Contacto de validação", companyName: "Empresa de validação", email: "cliente@example.invalid" }).$returningId();
        const clientId = clientResult[0]?.id;
        const proposalResult = await tx.insert(proposals).values({ proposalNumber, title: "Proposta de validação", clientId: clientId!, createdByUserId: userId!, state: "draft", publicToken: `${runId}-token`, subtotalCents: 10000, taxCents: 2300, totalCents: 12300 }).$returningId();
        const proposalId = proposalResult[0]?.id;

        await tx.insert(proposalMetadata).values({ proposalId: proposalId!, commercialTerms: { paymentTerms: "30 dias", downPayment: "20%" } });
        await tx.insert(proposalStatusHistory).values({ proposalId: proposalId!, changedByUserId: userId!, fromState: null, toState: "draft", comment: "Criação transacional" });

        const metadata = await tx.select().from(proposalMetadata).where(eq(proposalMetadata.proposalId, proposalId!));
        const audit = await tx.select().from(proposalStatusHistory).where(eq(proposalStatusHistory.proposalId, proposalId!));
        expect(metadata[0]?.commercialTerms).toMatchObject({ paymentTerms: "30 dias", downPayment: "20%" });
        expect(audit[0]).toMatchObject({ fromState: null, toState: "draft", changedByUserId: userId });
        throw new Error("ROLLBACK_VALIDATION_TRANSACTION");
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("ROLLBACK_VALIDATION_TRANSACTION");
    }

    try {
      const leftovers = await db.select().from(proposals).where(eq(proposals.proposalNumber, proposalNumber));
      expect(leftovers).toHaveLength(0);
    } finally {
      await connection.end();
    }
  });
});
