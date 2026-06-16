import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentsTable1779865624383 implements MigrationInterface {
  name = 'AddPaymentsTable1779865624383';

  // ALTER TYPE ... ADD VALUE cannot run inside a transaction in Postgres
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'awaiting_payment'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'payment_failed'`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."payments_status_enum" AS ENUM ('pending', 'succeeded', 'failed')`,
    );

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "stripeSessionId" character varying NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'usd',
        "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_payments_stripeSessionId" UNIQUE ("stripeSessionId"),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_payments_orderId" ON "payments" ("orderId")`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_userId" ON "payments" ("userId")`);

    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD CONSTRAINT "FK_payments_orderId"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_orderId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_orderId"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    // Postgres does not support removing enum values without recreating the type.
    // awaiting_payment and payment_failed remain in orders_status_enum after rollback.
  }
}
