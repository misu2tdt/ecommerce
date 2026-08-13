import { MigrationInterface, QueryRunner } from 'typeorm';

export class IntegrateProductCatalog1786631851874 implements MigrationInterface {
  name = 'IntegrateProductCatalog1786631851874';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD "slug" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "UQ_464f927ae360106b783ed0b4106" UNIQUE ("slug")`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "status" character varying NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "categoryId" integer NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "products" ADD "brandId" integer`);
    await queryRunner.query(
      `ALTER TABLE "products" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_ff56834e735fa78a15d0cf21926" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_ea86d0c514c4ecbb5694cbf57df" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_ea86d0c514c4ecbb5694cbf57df"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_ff56834e735fa78a15d0cf21926"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "brandId"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "categoryId"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "status"`);
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "UQ_464f927ae360106b783ed0b4106"`,
    );
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "slug"`);
  }
}
