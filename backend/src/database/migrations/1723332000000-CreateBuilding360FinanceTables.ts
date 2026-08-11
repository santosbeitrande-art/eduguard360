import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBuilding360FinanceTables1723332000000 implements MigrationInterface {
  name = 'CreateBuilding360FinanceTables1723332000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_contracts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "organizationId" uuid,
        "siteId" uuid,
        "buildingId" uuid,
        "unitId" uuid,
        "code" varchar(80),
        "title" varchar(160) NOT NULL,
        "status" varchar(24) NOT NULL DEFAULT 'active',
        "billingCycle" varchar(24) NOT NULL DEFAULT 'monthly',
        "currency" varchar(8) NOT NULL DEFAULT 'MZN',
        "amount" numeric(14,2) NOT NULL,
        "startsAt" date NOT NULL,
        "endsAt" date,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b360_contract_tenant_status_active" ON "building360_contracts" ("tenantId", "status", "isActive")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_contract_unit'
        ) THEN
          ALTER TABLE "building360_contracts"
          ADD CONSTRAINT "FK_b360_contract_unit"
          FOREIGN KEY ("unitId") REFERENCES "building360_units"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_charges" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "contractId" uuid NOT NULL,
        "unitId" uuid,
        "period" varchar(7) NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "dueDate" date,
        "status" varchar(24) NOT NULL DEFAULT 'pending',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b360_charge_tenant_status_active" ON "building360_charges" ("tenantId", "status", "isActive")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_charge_contract'
        ) THEN
          ALTER TABLE "building360_charges"
          ADD CONSTRAINT "FK_b360_charge_contract"
          FOREIGN KEY ("contractId") REFERENCES "building360_contracts"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_invoices" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "contractId" uuid NOT NULL,
        "chargeId" uuid NOT NULL,
        "invoiceNumber" varchar(60) NOT NULL UNIQUE,
        "amount" numeric(14,2) NOT NULL,
        "currency" varchar(8) NOT NULL DEFAULT 'MZN',
        "issuedAt" date NOT NULL,
        "dueDate" date,
        "status" varchar(24) NOT NULL DEFAULT 'issued',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b360_invoice_tenant_status_active" ON "building360_invoices" ("tenantId", "status", "isActive")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_invoice_contract'
        ) THEN
          ALTER TABLE "building360_invoices"
          ADD CONSTRAINT "FK_b360_invoice_contract"
          FOREIGN KEY ("contractId") REFERENCES "building360_contracts"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_invoice_charge'
        ) THEN
          ALTER TABLE "building360_invoices"
          ADD CONSTRAINT "FK_b360_invoice_charge"
          FOREIGN KEY ("chargeId") REFERENCES "building360_charges"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_payments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "invoiceId" uuid NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "currency" varchar(8) NOT NULL DEFAULT 'MZN',
        "method" varchar(24) NOT NULL DEFAULT 'bank_transfer',
        "reference" varchar(80),
        "paidAt" date NOT NULL,
        "status" varchar(24) NOT NULL DEFAULT 'confirmed',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b360_payment_tenant_status_active" ON "building360_payments" ("tenantId", "status", "isActive")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_payment_invoice'
        ) THEN
          ALTER TABLE "building360_payments"
          ADD CONSTRAINT "FK_b360_payment_invoice"
          FOREIGN KEY ("invoiceId") REFERENCES "building360_invoices"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_receipts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "invoiceId" uuid NOT NULL,
        "paymentId" uuid NOT NULL,
        "receiptNumber" varchar(60) NOT NULL UNIQUE,
        "amount" numeric(14,2) NOT NULL,
        "currency" varchar(8) NOT NULL DEFAULT 'MZN',
        "issuedAt" date NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b360_receipt_tenant_active" ON "building360_receipts" ("tenantId", "isActive")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_receipt_invoice'
        ) THEN
          ALTER TABLE "building360_receipts"
          ADD CONSTRAINT "FK_b360_receipt_invoice"
          FOREIGN KEY ("invoiceId") REFERENCES "building360_invoices"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_receipt_payment'
        ) THEN
          ALTER TABLE "building360_receipts"
          ADD CONSTRAINT "FK_b360_receipt_payment"
          FOREIGN KEY ("paymentId") REFERENCES "building360_payments"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_ledger_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "direction" varchar(16) NOT NULL,
        "entryType" varchar(32) NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "currency" varchar(8) NOT NULL DEFAULT 'MZN',
        "referenceType" varchar(40),
        "referenceId" varchar(64),
        "note" varchar(600),
        "occurredAt" date NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b360_ledger_tenant_occurred_at" ON "building360_ledger_entries" ("tenantId", "occurredAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_ledger_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_receipts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_invoices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_charges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_contracts"`);
  }
}
