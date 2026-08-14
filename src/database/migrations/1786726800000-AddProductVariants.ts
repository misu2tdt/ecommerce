import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductVariants1786726800000 implements MigrationInterface {
  name = 'AddProductVariants1786726800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "product_variants" ("id" SERIAL NOT NULL, "productId" integer NOT NULL, "sku" character varying(64) NOT NULL, "name" character varying(255) NOT NULL, "price" numeric(10,2) NOT NULL, "stock" integer NOT NULL DEFAULT '0', "attributes" jsonb NOT NULL DEFAULT '{}'::jsonb, "isActive" boolean NOT NULL DEFAULT true, "position" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_product_variants_price" CHECK ("price" >= 0), CONSTRAINT "CHK_product_variants_stock" CHECK ("stock" >= 0), CONSTRAINT "CHK_product_variants_position" CHECK ("position" >= 0), CONSTRAINT "PK_product_variants_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_product_variants_sku" ON "product_variants" ("sku")`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "FK_product_variants_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "product_variants" ("productId", "sku", "name", "price", "stock", "attributes", "isActive", "position") SELECT "id", 'PRODUCT-' || "id" || '-DEFAULT', 'Default', "price", "stock", '{}'::jsonb, true, 0 FROM "products"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "variantId" integer`,
    );
    await queryRunner.query(
      `UPDATE "order_items" oi SET "variantId" = pv."id" FROM "product_variants" pv WHERE pv."productId" = oi."productId" AND pv."sku" = 'PRODUCT-' || oi."productId" || '-DEFAULT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ALTER COLUMN "variantId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_cdb99c05982d5191ac8465ac010"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "productId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_variant" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "price"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "stock"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" ADD "price" numeric(10,2)`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD "stock" integer DEFAULT '0'`,
    );
    await queryRunner.query(
      `UPDATE "products" p SET "price" = pv."price", "stock" = pv."stock" FROM "product_variants" pv WHERE pv."id" = (SELECT chosen."id" FROM "product_variants" chosen WHERE chosen."productId" = p."id" ORDER BY (chosen."sku" = 'PRODUCT-' || p."id" || '-DEFAULT') DESC, chosen."position", chosen."id" LIMIT 1)`,
    );
    await queryRunner.query(
      `UPDATE "products" SET "price" = 0, "stock" = 0 WHERE "price" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "price" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ALTER COLUMN "stock" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "productId" integer`,
    );
    await queryRunner.query(
      `UPDATE "order_items" oi SET "productId" = pv."productId" FROM "product_variants" pv WHERE pv."id" = oi."variantId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_cdb99c05982d5191ac8465ac010" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_variant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "variantId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT "FK_product_variants_product"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_product_variants_sku"`);
    await queryRunner.query(`DROP TABLE "product_variants"`);
  }
}
