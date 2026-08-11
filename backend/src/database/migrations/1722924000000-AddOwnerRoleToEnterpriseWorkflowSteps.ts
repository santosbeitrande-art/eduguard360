import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOwnerRoleToEnterpriseWorkflowSteps1722924000000 implements MigrationInterface {
  name = 'AddOwnerRoleToEnterpriseWorkflowSteps1722924000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('enterprise_workflow_steps');
    if (!table) return;

    const hasOwnerRole = table.findColumnByName('ownerRole');
    if (!hasOwnerRole) {
      await queryRunner.addColumn(
        'enterprise_workflow_steps',
        new TableColumn({
          name: 'ownerRole',
          type: 'varchar',
          length: '32',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('enterprise_workflow_steps');
    if (!table) return;

    const hasOwnerRole = table.findColumnByName('ownerRole');
    if (hasOwnerRole) {
      await queryRunner.dropColumn('enterprise_workflow_steps', 'ownerRole');
    }
  }
}
