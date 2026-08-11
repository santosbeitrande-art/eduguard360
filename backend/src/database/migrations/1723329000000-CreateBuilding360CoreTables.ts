import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBuilding360CoreTables1723329000000 implements MigrationInterface {
  name = 'CreateBuilding360CoreTables1723329000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_organizations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "name" varchar(160) NOT NULL,
        "code" varchar(80),
        "status" varchar(24) NOT NULL DEFAULT 'active',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b360_org_tenant_active" ON "building360_organizations" ("tenantId", "isActive")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_portfolios" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "organizationId" uuid NOT NULL,
        "name" varchar(160) NOT NULL,
        "code" varchar(80),
        "status" varchar(24) NOT NULL DEFAULT 'active',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b360_portfolio_tenant_org_active" ON "building360_portfolios" ("tenantId", "organizationId", "isActive")`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_portfolio_org'
        ) THEN
          ALTER TABLE "building360_portfolios"
          ADD CONSTRAINT "FK_b360_portfolio_org"
          FOREIGN KEY ("organizationId") REFERENCES "building360_organizations"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_sites" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "organizationId" uuid NOT NULL,
        "portfolioId" uuid,
        "name" varchar(160) NOT NULL,
        "city" varchar(120) NOT NULL,
        "type" varchar(40) NOT NULL DEFAULT 'commercial',
        "code" varchar(80),
        "status" varchar(24) NOT NULL DEFAULT 'active',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b360_site_tenant_org_portfolio_active" ON "building360_sites" ("tenantId", "organizationId", "portfolioId", "isActive")`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_site_org'
        ) THEN
          ALTER TABLE "building360_sites"
          ADD CONSTRAINT "FK_b360_site_org"
          FOREIGN KEY ("organizationId") REFERENCES "building360_organizations"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_site_portfolio'
        ) THEN
          ALTER TABLE "building360_sites"
          ADD CONSTRAINT "FK_b360_site_portfolio"
          FOREIGN KEY ("portfolioId") REFERENCES "building360_portfolios"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_buildings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "organizationId" uuid NOT NULL,
        "portfolioId" uuid,
        "siteId" uuid NOT NULL,
        "name" varchar(160) NOT NULL,
        "code" varchar(80),
        "floors" integer NOT NULL DEFAULT 1,
        "status" varchar(24) NOT NULL DEFAULT 'active',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b360_building_tenant_site_active" ON "building360_buildings" ("tenantId", "siteId", "isActive")`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_building_site'
        ) THEN
          ALTER TABLE "building360_buildings"
          ADD CONSTRAINT "FK_b360_building_site"
          FOREIGN KEY ("siteId") REFERENCES "building360_sites"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_floors" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "buildingId" uuid NOT NULL,
        "label" varchar(80) NOT NULL,
        "level" integer NOT NULL DEFAULT 0,
        "status" varchar(24) NOT NULL DEFAULT 'active',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b360_floor_tenant_building_active" ON "building360_floors" ("tenantId", "buildingId", "isActive")`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_floor_building'
        ) THEN
          ALTER TABLE "building360_floors"
          ADD CONSTRAINT "FK_b360_floor_building"
          FOREIGN KEY ("buildingId") REFERENCES "building360_buildings"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_units" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "buildingId" uuid NOT NULL,
        "floorId" uuid,
        "siteId" uuid,
        "number" varchar(40) NOT NULL,
        "code" varchar(80),
        "type" varchar(32) NOT NULL DEFAULT 'office',
        "status" varchar(32) NOT NULL DEFAULT 'vacant',
        "areaM2" numeric(12,2) NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b360_unit_tenant_building_active" ON "building360_units" ("tenantId", "buildingId", "isActive")`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_unit_building'
        ) THEN
          ALTER TABLE "building360_units"
          ADD CONSTRAINT "FK_b360_unit_building"
          FOREIGN KEY ("buildingId") REFERENCES "building360_buildings"("id") ON DELETE RESTRICT;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_unit_floor'
        ) THEN
          ALTER TABLE "building360_units"
          ADD CONSTRAINT "FK_b360_unit_floor"
          FOREIGN KEY ("floorId") REFERENCES "building360_floors"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_unit_site'
        ) THEN
          ALTER TABLE "building360_units"
          ADD CONSTRAINT "FK_b360_unit_site"
          FOREIGN KEY ("siteId") REFERENCES "building360_sites"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_people" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "organizationId" uuid,
        "unitId" uuid,
        "fullName" varchar(180) NOT NULL,
        "code" varchar(80),
        "email" varchar(160),
        "phone" varchar(40),
        "status" varchar(24) NOT NULL DEFAULT 'active',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b360_people_tenant_unit_active" ON "building360_people" ("tenantId", "unitId", "isActive")`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_people_org'
        ) THEN
          ALTER TABLE "building360_people"
          ADD CONSTRAINT "FK_b360_people_org"
          FOREIGN KEY ("organizationId") REFERENCES "building360_organizations"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_people_unit'
        ) THEN
          ALTER TABLE "building360_people"
          ADD CONSTRAINT "FK_b360_people_unit"
          FOREIGN KEY ("unitId") REFERENCES "building360_units"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_role_assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" varchar(64) NOT NULL,
        "schoolId" varchar(64),
        "personId" uuid NOT NULL,
        "organizationId" uuid,
        "siteId" uuid,
        "buildingId" uuid,
        "unitId" uuid,
        "role" varchar(48) NOT NULL,
        "status" varchar(24) NOT NULL DEFAULT 'active',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_b360_role_tenant_person_role_active" ON "building360_role_assignments" ("tenantId", "personId", "role", "isActive")`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_role_person'
        ) THEN
          ALTER TABLE "building360_role_assignments"
          ADD CONSTRAINT "FK_b360_role_person"
          FOREIGN KEY ("personId") REFERENCES "building360_people"("id") ON DELETE CASCADE;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_role_org'
        ) THEN
          ALTER TABLE "building360_role_assignments"
          ADD CONSTRAINT "FK_b360_role_org"
          FOREIGN KEY ("organizationId") REFERENCES "building360_organizations"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_role_site'
        ) THEN
          ALTER TABLE "building360_role_assignments"
          ADD CONSTRAINT "FK_b360_role_site"
          FOREIGN KEY ("siteId") REFERENCES "building360_sites"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_role_building'
        ) THEN
          ALTER TABLE "building360_role_assignments"
          ADD CONSTRAINT "FK_b360_role_building"
          FOREIGN KEY ("buildingId") REFERENCES "building360_buildings"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_b360_role_unit'
        ) THEN
          ALTER TABLE "building360_role_assignments"
          ADD CONSTRAINT "FK_b360_role_unit"
          FOREIGN KEY ("unitId") REFERENCES "building360_units"("id") ON DELETE SET NULL;
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_role_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_people"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_units"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_floors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_buildings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_sites"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_portfolios"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "building360_organizations"`);
  }
}
