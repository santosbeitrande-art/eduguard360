import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnterpriseAuditLogs1723335000000 implements MigrationInterface {
  name = 'CreateEnterpriseAuditLogs1723335000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "enterprise_audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "actorId" varchar(64),
        "actorName" varchar(255),
        "actorRole" varchar(64),
        "action" varchar(80) NOT NULL,
        "resourceType" varchar(80) NOT NULL,
        "resourceId" varchar(80),
        "schoolId" varchar(64),
        "tenantId" varchar(64),
        "severity" varchar(24) NOT NULL DEFAULT 'info',
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "ipAddress" varchar(80),
        "userAgent" varchar(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_enterprise_audit_logs_actor_created"
      ON "enterprise_audit_logs" ("actorId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_enterprise_audit_logs_resource"
      ON "enterprise_audit_logs" ("resourceType", "resourceId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_enterprise_audit_logs_school"
      ON "enterprise_audit_logs" ("schoolId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_enterprise_audit_logs_tenant"
      ON "enterprise_audit_logs" ("tenantId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "enterprise_audit_logs"');
  }
}
