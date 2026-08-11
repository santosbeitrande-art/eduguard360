import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBuilding360OpsTables1723330500000 implements MigrationInterface {
  name = 'CreateBuilding360OpsTables1723330500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_assets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "siteId" uuid,
        "buildingId" uuid,
        "unitId" uuid,
        "code" varchar(80),
        "name" varchar(180) NOT NULL,
        "category" varchar(64) NOT NULL DEFAULT 'general',
        "status" varchar(32) NOT NULL DEFAULT 'active',
        "criticality" varchar(24) NOT NULL DEFAULT 'medium',
        "nextMaintenanceAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b360_asset_tenant_building_active" ON "building360_assets" ("tenantId", "buildingId", "isActive")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_asset_site'
        ) THEN
          ALTER TABLE "building360_assets"
          ADD CONSTRAINT "FK_b360_asset_site"
          FOREIGN KEY ("siteId") REFERENCES "building360_sites"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_asset_building'
        ) THEN
          ALTER TABLE "building360_assets"
          ADD CONSTRAINT "FK_b360_asset_building"
          FOREIGN KEY ("buildingId") REFERENCES "building360_buildings"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_asset_unit'
        ) THEN
          ALTER TABLE "building360_assets"
          ADD CONSTRAINT "FK_b360_asset_unit"
          FOREIGN KEY ("unitId") REFERENCES "building360_units"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_work_orders" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "assetId" uuid,
        "title" varchar(120) NOT NULL,
        "requestedBy" varchar(120),
        "priority" varchar(16) NOT NULL DEFAULT 'medium',
        "status" varchar(16) NOT NULL DEFAULT 'open',
        "note" varchar(600),
        "assignedTo" varchar(120),
        "closedAt" TIMESTAMP,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_b360_work_order_tenant_status_active" ON "building360_work_orders" ("tenantId", "status", "isActive")`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_work_order_asset'
        ) THEN
          ALTER TABLE "building360_work_orders"
          ADD CONSTRAINT "FK_b360_work_order_asset"
          FOREIGN KEY ("assetId") REFERENCES "building360_assets"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_work_orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_assets"`);
  }
}
