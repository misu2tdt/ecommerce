import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWishlistAndReviews1786986000000 implements MigrationInterface {
  name = 'AddWishlistAndReviews1786986000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "wishlist_items" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "productId" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_wishlist_items_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_wishlist_items_user_product" ON "wishlist_items" ("userId", "productId")`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_reviews" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "productId" integer NOT NULL, "rating" integer NOT NULL, "title" character varying(150), "body" text, "isVisible" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_product_reviews_rating" CHECK ("rating" BETWEEN 1 AND 5), CONSTRAINT "PK_product_reviews_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_product_reviews_user_product" ON "product_reviews" ("userId", "productId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" ADD CONSTRAINT "FK_wishlist_items_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" ADD CONSTRAINT "FK_wishlist_items_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_reviews" ADD CONSTRAINT "FK_product_reviews_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_reviews" ADD CONSTRAINT "FK_product_reviews_product" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_reviews" DROP CONSTRAINT "FK_product_reviews_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_reviews" DROP CONSTRAINT "FK_product_reviews_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" DROP CONSTRAINT "FK_wishlist_items_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" DROP CONSTRAINT "FK_wishlist_items_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_product_reviews_user_product"`,
    );
    await queryRunner.query(`DROP TABLE "product_reviews"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_wishlist_items_user_product"`,
    );
    await queryRunner.query(`DROP TABLE "wishlist_items"`);
  }
}
