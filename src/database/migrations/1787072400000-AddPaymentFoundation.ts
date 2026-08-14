import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentFoundation1787072400000 implements MigrationInterface {
  name = 'AddPaymentFoundation1787072400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" SERIAL NOT NULL, "orderId" integer NOT NULL, "provider" character varying(50) NOT NULL, "providerPaymentId" character varying(255), "idempotencyKey" character varying(128) NOT NULL, "amount" numeric(10,2) NOT NULL, "currency" character(3) NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "failureCode" character varying(100), "failureMessage" character varying(500), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "succeededAt" TIMESTAMP, CONSTRAINT "CHK_payments_status" CHECK ("status" IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')), CONSTRAINT "CHK_payments_amount" CHECK ("amount" >= 0), CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_order_status" ON "payments" ("orderId", "status")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payments_provider_payment" ON "payments" ("provider", "providerPaymentId") WHERE "providerPaymentId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payments_idempotency_key" ON "payments" ("idempotencyKey")`,
    );
    await queryRunner.query(
      `CREATE TABLE "payment_events" ("id" SERIAL NOT NULL, "paymentId" integer NOT NULL, "provider" character varying(50) NOT NULL, "providerEventId" character varying(255) NOT NULL, "providerPaymentId" character varying(255) NOT NULL, "eventType" character varying NOT NULL, "processingStatus" character varying NOT NULL DEFAULT 'processed', "processingMessage" character varying(500), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "processedAt" TIMESTAMP, CONSTRAINT "CHK_payment_events_processing_status" CHECK ("processingStatus" IN ('processed', 'requires_reconciliation')), CONSTRAINT "CHK_payment_events_type" CHECK ("eventType" IN ('succeeded', 'failed')), CONSTRAINT "PK_payment_events_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payment_events_provider_event" ON "payment_events" ("provider", "providerEventId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment_events" ADD CONSTRAINT "FK_payment_events_payment" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_events" DROP CONSTRAINT "FK_payment_events_payment"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_order"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_payment_events_provider_event"`,
    );
    await queryRunner.query(`DROP TABLE "payment_events"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_payments_idempotency_key"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_payments_provider_payment"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_order_status"`);
    await queryRunner.query(`DROP TABLE "payments"`);
  }
}
