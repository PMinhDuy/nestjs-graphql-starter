import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1779865624386 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index for user orders queries (GetMyOrdersHandler, GetOrderQuery filtering)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_orders_userId ON orders("userId")`,
    );

    // Composite index for admin order filtering (status + userId)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_orders_userId_status ON orders("userId", "status")`,
    );

    // Index for order export/date filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_orders_createdAt ON orders("createdAt" DESC)`,
    );

    // Index for address validation (every order placement checks this)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_addresses_userId ON addresses("userId")`,
    );

    // Index for product lookups (cart checkout, stock checks)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_products_categoryId ON products("categoryId")`,
    );

    // Composite index for product stock + category (common filter)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_products_categoryId_stock ON products("categoryId", "stock")`,
    );

    // Index for user email (auth lookups)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users("email")`,
    );

    // Index for order items (loading order with items)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_order_items_orderId ON order_items("orderId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS idx_order_items_orderId`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_email`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_categoryId_stock`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_categoryId`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_addresses_userId`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_createdAt`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_userId_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_orders_userId`);
  }
}
