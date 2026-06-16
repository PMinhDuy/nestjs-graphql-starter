import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryParentId1779865624384 implements MigrationInterface {
  name = 'AddCategoryParentId1779865624384';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD COLUMN IF NOT EXISTS "parentId" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD CONSTRAINT "FK_categories_parentId"
      FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_categories_parentId"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "parentId"`);
  }
}
