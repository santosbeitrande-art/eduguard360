import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBuilding360BankReconciliationIndex1723333000000 implements MigrationInterface {
  name = 'AddBuilding360BankReconciliationIndex1723333000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_b360_bank_reconciliation_payment"
      ON "building360_ledger_entries" ("tenantId", "referenceId")
      WHERE "entryType" = 'bank_reconciled' AND "referenceType" = 'payment'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_b360_bank_reconciliation_payment"`);
  }
}
