import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddressesAndOrderLifecycle1786899600000 implements MigrationInterface {
  name = 'AddAddressesAndOrderLifecycle1786899600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "addresses" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "label" character varying(100), "recipientName" character varying(150) NOT NULL, "phone" character varying(32) NOT NULL, "addressLine1" character varying(255) NOT NULL, "addressLine2" character varying(255), "ward" character varying(150), "district" character varying(150), "city" character varying(150) NOT NULL, "stateProvince" character varying(150), "postalCode" character varying(32), "countryCode" character(2) NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_addresses_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_addresses_user_default" ON "addresses" ("userId") WHERE "isDefault" = true`,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" ADD CONSTRAINT "FK_addresses_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "shippingAddress" jsonb NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ALTER COLUMN "orderId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "CHK_orders_status" CHECK ("status" IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "CHK_orders_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ALTER COLUMN "orderId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "updatedAt"`);
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "shippingAddress"`,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" DROP CONSTRAINT "FK_addresses_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_addresses_user_default"`);
    await queryRunner.query(`DROP TABLE "addresses"`);
  }
}
