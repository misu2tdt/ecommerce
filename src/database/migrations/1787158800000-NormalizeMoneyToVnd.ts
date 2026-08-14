import { MigrationInterface, QueryRunner } from 'typeorm';

const MAX_SAFE_VND = '9007199254740991';

export class NormalizeMoneyToVnd1787158800000 implements MigrationInterface {
  name = 'NormalizeMoneyToVnd1787158800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM "product_variants"
          WHERE "price" <> trunc("price") OR "price" < 0 OR "price" > ${MAX_SAFE_VND}
        ) OR EXISTS (
          SELECT 1 FROM "order_items"
          WHERE "price" <> trunc("price") OR "price" < 0 OR "price" > ${MAX_SAFE_VND}
        ) OR EXISTS (
          SELECT 1 FROM "orders"
          WHERE "totalPrice" <> trunc("totalPrice") OR "totalPrice" < 0 OR "totalPrice" > ${MAX_SAFE_VND}
        ) OR EXISTS (
          SELECT 1 FROM "payments"
          WHERE "amount" <> trunc("amount") OR "amount" < 0 OR "amount" > ${MAX_SAFE_VND}
        ) THEN
          RAISE EXCEPTION 'Money normalization requires non-negative whole VND amounts within the JavaScript safe integer range';
        END IF;
      END $$
    `);
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT "CHK_product_variants_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "CHK_payments_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ALTER COLUMN "price" TYPE bigint USING "price"::bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ALTER COLUMN "price" TYPE bigint USING "price"::bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "totalPrice" TYPE bigint USING "totalPrice"::bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "amount" TYPE bigint USING "amount"::bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "CHK_product_variants_price" CHECK ("price" >= 0 AND "price" <= ${MAX_SAFE_VND})`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "CHK_order_items_price" CHECK ("price" >= 0 AND "price" <= ${MAX_SAFE_VND})`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "CHK_orders_total_price" CHECK ("totalPrice" >= 0 AND "totalPrice" <= ${MAX_SAFE_VND})`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "CHK_payments_amount" CHECK ("amount" >= 0 AND "amount" <= ${MAX_SAFE_VND})`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "CHK_payments_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "CHK_orders_total_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "CHK_order_items_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT "CHK_product_variants_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "amount" TYPE numeric(10,2) USING "amount"::numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "totalPrice" TYPE numeric(10,2) USING "totalPrice"::numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ALTER COLUMN "price" TYPE numeric(10,2) USING "price"::numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ALTER COLUMN "price" TYPE numeric(10,2) USING "price"::numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "CHK_payments_amount" CHECK ("amount" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "CHK_product_variants_price" CHECK ("price" >= 0)`,
    );
  }
}
