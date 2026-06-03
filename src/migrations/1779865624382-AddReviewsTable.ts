import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewsTable1779865624382 implements MigrationInterface {
  name = 'AddReviewsTable1779865624382';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "orderId" uuid NOT NULL,
        "rating" integer NOT NULL,
        "comment" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_reviews_userId_productId" UNIQUE ("userId", "productId"),
        CONSTRAINT "PK_reviews" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_reviews_userId" ON "reviews" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_reviews_productId" ON "reviews" ("productId")`);
    await queryRunner.query(`
      ALTER TABLE "reviews"
      ADD CONSTRAINT "FK_reviews_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "reviews"
      ADD CONSTRAINT "FK_reviews_productId"
      FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "reviews"
      ADD CONSTRAINT "FK_reviews_orderId"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_orderId"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_productId"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_reviews_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_productId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_reviews_userId"`);
    await queryRunner.query(`DROP TABLE "reviews"`);
  }
}
