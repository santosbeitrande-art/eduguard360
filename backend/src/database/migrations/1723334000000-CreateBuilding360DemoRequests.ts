import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBuilding360DemoRequests1723334000000 implements MigrationInterface {
  name = 'CreateBuilding360DemoRequests1723334000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "building360_demo_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(160) NOT NULL,
        "organizationName" varchar(160) NOT NULL,
        "email" varchar(180) NOT NULL,
        "phone" varchar(40),
        "city" varchar(120) NOT NULL,
        "buildingName" varchar(160) NOT NULL,
        "plan" varchar(24) NOT NULL,
        "message" text,
        "status" varchar(32) NOT NULL DEFAULT 'pending',
        "tenantId" varchar(64),
        "organizationId" uuid,
        "siteId" uuid,
        "buildingId" uuid,
        "invitedUserId" varchar(64),
        "reviewedBy" varchar(64),
        "reviewedAt" TIMESTAMP,
        "privacyConsentAt" TIMESTAMP,
        "provisioningError" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_b360_demo_requests_status_created"
      ON "building360_demo_requests" ("status", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_b360_demo_requests_email_status"
      ON "building360_demo_requests" ("email", "status")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_b360_demo_requests_pending_email"
      ON "building360_demo_requests" ("email")
      WHERE "status" = 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "building360_demo_requests"');
  }
}
