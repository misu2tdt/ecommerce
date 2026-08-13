import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductImages1786640400000 implements MigrationInterface {
  name = 'AddProductImages1786640400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "product_images" ("id" SERIAL NOT NULL, "url" character varying(2048) NOT NULL, "storageKey" character varying(512), "altText" character varying(255), "position" integer NOT NULL DEFAULT '0', "isPrimary" boolean NOT NULL DEFAULT false, "productId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_product_images_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_product_images_primary_per_product" ON "product_images" ("productId") WHERE "isPrimary" = true`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_b367708bf720c8dd62fc6833161" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_images" DROP CONSTRAINT "FK_b367708bf720c8dd62fc6833161"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_product_images_primary_per_product"`,
    );
    await queryRunner.query(`DROP TABLE "product_images"`);
  }
}
