import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWishlistAndFinanceTables1779865624385 implements MigrationInterface {
  name = 'AddWishlistAndFinanceTables1779865624385';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "wishlist_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "productId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_wishlist_items_userId_productId" UNIQUE ("userId", "productId"),
        CONSTRAINT "PK_wishlist_items" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_wishlist_items_userId" ON "wishlist_items" ("userId")`);
    await queryRunner.query(`
      ALTER TABLE "wishlist_items"
      ADD CONSTRAINT "FK_wishlist_items_productId"
      FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "wishlist_items"
      ADD CONSTRAINT "FK_wishlist_items_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wishlist_items" DROP CONSTRAINT "FK_wishlist_items_userId"`);
    await queryRunner.query(`ALTER TABLE "wishlist_items" DROP CONSTRAINT "FK_wishlist_items_productId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_wishlist_items_userId"`);
    await queryRunner.query(`DROP TABLE "wishlist_items"`);
  }
}
