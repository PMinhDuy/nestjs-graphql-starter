import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingColumns1779865624381 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "lowStockThreshold" integer NOT NULL DEFAULT 10`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "lowStockThreshold"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "isActive"`);
  }
}
