import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1779865624380 implements MigrationInterface {
    name = 'InitSchema1779865624380'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // users
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user')`);
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "password" character varying NOT NULL,
                "name" character varying NOT NULL,
                "role" "public"."users_role_enum" NOT NULL DEFAULT 'user',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "PK_users" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);

        // addresses
        await queryRunner.query(`
            CREATE TABLE "addresses" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "street" character varying NOT NULL,
                "city" character varying NOT NULL,
                "country" character varying NOT NULL,
                "postalCode" character varying,
                "isDefault" boolean NOT NULL DEFAULT false,
                "userId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_addresses" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "addresses"
            ADD CONSTRAINT "FK_addresses_userId"
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        `);

        // categories (closure-table — categories_closure managed by TypeORM internally)
        await queryRunner.query(`
            CREATE TABLE "categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" character varying,
                "isActive" boolean NOT NULL DEFAULT true,
                CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
                CONSTRAINT "PK_categories" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "categories_closure" (
                "id_ancestor" uuid NOT NULL,
                "id_descendant" uuid NOT NULL,
                CONSTRAINT "PK_categories_closure" PRIMARY KEY ("id_ancestor", "id_descendant")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "categories_closure"
            ADD CONSTRAINT "FK_categories_closure_ancestor"
            FOREIGN KEY ("id_ancestor") REFERENCES "categories"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "categories_closure"
            ADD CONSTRAINT "FK_categories_closure_descendant"
            FOREIGN KEY ("id_descendant") REFERENCES "categories"("id") ON DELETE CASCADE
        `);

        // products
        await queryRunner.query(`
            CREATE TABLE "products" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" text,
                "price" numeric(10,2) NOT NULL,
                "stock" integer NOT NULL DEFAULT 0,
                "imageKeys" text[] NOT NULL DEFAULT '{}',
                "isActive" boolean NOT NULL DEFAULT true,
                "categoryId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_products" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_products_categoryId" ON "products" ("categoryId")`);
        await queryRunner.query(`
            ALTER TABLE "products"
            ADD CONSTRAINT "FK_products_categoryId"
            FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT
        `);

        // orders
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')`);
        await queryRunner.query(`
            CREATE TABLE "orders" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending',
                "totalAmount" numeric(10,2) NOT NULL,
                "shippingAddressId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_orders" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_orders_userId" ON "orders" ("userId")`);

        // order_items
        await queryRunner.query(`
            CREATE TABLE "order_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "orderId" uuid NOT NULL,
                "productId" uuid NOT NULL,
                "quantity" integer NOT NULL,
                "unitPrice" numeric(10,2) NOT NULL,
                CONSTRAINT "PK_order_items" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_order_items_orderId" ON "order_items" ("orderId")`);
        await queryRunner.query(`
            ALTER TABLE "order_items"
            ADD CONSTRAINT "FK_order_items_orderId"
            FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_orderId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_order_items_orderId"`);
        await queryRunner.query(`DROP TABLE "order_items"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_orders_userId"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);

        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_products_categoryId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_products_categoryId"`);
        await queryRunner.query(`DROP TABLE "products"`);

        await queryRunner.query(`ALTER TABLE "categories_closure" DROP CONSTRAINT "FK_categories_closure_descendant"`);
        await queryRunner.query(`ALTER TABLE "categories_closure" DROP CONSTRAINT "FK_categories_closure_ancestor"`);
        await queryRunner.query(`DROP TABLE "categories_closure"`);
        await queryRunner.query(`DROP TABLE "categories"`);

        await queryRunner.query(`ALTER TABLE "addresses" DROP CONSTRAINT "FK_addresses_userId"`);
        await queryRunner.query(`DROP TABLE "addresses"`);

        await queryRunner.query(`DROP INDEX "public"."IDX_users_email"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }
}
