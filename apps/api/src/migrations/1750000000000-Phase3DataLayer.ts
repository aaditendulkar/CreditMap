import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3DataLayer1750000000000 implements MigrationInterface {
  name = 'Phase3DataLayer1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Enum types ──────────────────────────────────────────────────────────

    await queryRunner.query(`CREATE TYPE "gender_enum" AS ENUM ('M', 'F', 'O')`);
    await queryRunner.query(`CREATE TYPE "category_enum" AS ENUM ('SC', 'ST', 'OBC', 'General')`);
    await queryRunner.query(
      `CREATE TYPE "occupation_enum" AS ENUM ('salaried', 'self_employed', 'daily_wage', 'gig', 'student', 'farm', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "income_source_enum" AS ENUM ('salary', 'daily_wage', 'business', 'freelance', 'farm', 'rent', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "bill_type_enum" AS ENUM ('electricity', 'water', 'gas', 'mobile', 'broadband', 'rent', 'insurance', 'other')`,
    );
    await queryRunner.query(`CREATE TYPE "txn_type_enum" AS ENUM ('credit', 'debit')`);
    await queryRunner.query(
      `CREATE TYPE "txn_category_enum" AS ENUM ('rent', 'food', 'utilities', 'emi', 'salary', 'freelance', 'business', 'transfer', 'medical', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "txn_channel_enum" AS ENUM ('upi', 'cash', 'bank_transfer', 'neft', 'imps', 'other')`,
    );

    // ── user_profiles ───────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "user_profiles" (
        "id"                     uuid        NOT NULL,
        "user_id"                uuid        NOT NULL,
        "state"                  varchar(50),
        "district"               varchar(50),
        "pin_code"               varchar(6),
        "date_of_birth"          date,
        "gender"                 "gender_enum",
        "category"               "category_enum",
        "occupation"             "occupation_enum",
        "monthly_income_stated"  integer,
        "has_bank_account"       boolean     NOT NULL DEFAULT false,
        "has_jan_dhan"           boolean     NOT NULL DEFAULT false,
        "has_upi"                boolean     NOT NULL DEFAULT false,
        "onboarding_complete"    boolean     NOT NULL DEFAULT false,
        "created_at"             TIMESTAMP   NOT NULL DEFAULT now(),
        "updated_at"             TIMESTAMP   NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_profiles"        PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_user_profiles_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // ── income_records ──────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "income_records" (
        "id"            uuid                NOT NULL,
        "user_id"       uuid                NOT NULL,
        "record_month"  date                NOT NULL,
        "source"        "income_source_enum" NOT NULL,
        "amount"        numeric(10,2)       NOT NULL
                          CONSTRAINT "CHK_income_records_amount" CHECK ("amount" > 0),
        "is_regular"    boolean             NOT NULL DEFAULT true,
        "notes"         text,
        "created_at"    TIMESTAMP           NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMP           NOT NULL DEFAULT now(),
        CONSTRAINT "PK_income_records" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_income_records_user_source_month"
          UNIQUE ("user_id", "source", "record_month"),
        CONSTRAINT "FK_income_records_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_income_records_user_month" ON "income_records" ("user_id", "record_month" DESC)`,
    );

    // ── bill_payments ───────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "bill_payments" (
        "id"          uuid             NOT NULL,
        "user_id"     uuid             NOT NULL,
        "bill_type"   "bill_type_enum" NOT NULL,
        "provider"    varchar(100),
        "bill_month"  date             NOT NULL,
        "amount"      numeric(10,2)    NOT NULL,
        "due_date"    date             NOT NULL,
        "paid_date"   date,
        "is_paid"     boolean          NOT NULL DEFAULT false,
        "created_at"  TIMESTAMP        NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP        NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bill_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bill_payments_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_bill_payments_user_month" ON "bill_payments" ("user_id", "bill_month" DESC)`,
    );

    // ── transactions ────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id"          uuid                  NOT NULL,
        "user_id"     uuid                  NOT NULL,
        "txn_date"    date                  NOT NULL,
        "type"        "txn_type_enum"       NOT NULL,
        "amount"      numeric(10,2)         NOT NULL
                        CONSTRAINT "CHK_transactions_amount" CHECK ("amount" > 0),
        "category"    "txn_category_enum"   NOT NULL,
        "description" varchar(200),
        "channel"     "txn_channel_enum",
        "created_at"  TIMESTAMP             NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_transactions_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_user_date" ON "transactions" ("user_id", "txn_date" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_transactions_user_date"`);
    await queryRunner.query(`DROP TABLE "transactions"`);

    await queryRunner.query(`DROP INDEX "IDX_bill_payments_user_month"`);
    await queryRunner.query(`DROP TABLE "bill_payments"`);

    await queryRunner.query(`DROP INDEX "IDX_income_records_user_month"`);
    await queryRunner.query(`DROP TABLE "income_records"`);

    await queryRunner.query(`DROP TABLE "user_profiles"`);

    await queryRunner.query(`DROP TYPE "txn_channel_enum"`);
    await queryRunner.query(`DROP TYPE "txn_category_enum"`);
    await queryRunner.query(`DROP TYPE "txn_type_enum"`);
    await queryRunner.query(`DROP TYPE "bill_type_enum"`);
    await queryRunner.query(`DROP TYPE "income_source_enum"`);
    await queryRunner.query(`DROP TYPE "occupation_enum"`);
    await queryRunner.query(`DROP TYPE "category_enum"`);
    await queryRunner.query(`DROP TYPE "gender_enum"`);
  }
}
