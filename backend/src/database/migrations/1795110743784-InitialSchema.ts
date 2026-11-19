import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1795110743784 implements MigrationInterface {
    name = 'InitialSchema1795110743784'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('CLIENT', 'STYLIST', 'ADMIN')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "first_name" character varying(60) NOT NULL, "last_name" character varying(60) NOT NULL, "email" character varying(254) NOT NULL, "password_hash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'CLIENT', CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(80) NOT NULL, "stock" integer NOT NULL, CONSTRAINT "UQ_4c9fb58de893725258746385e16" UNIQUE ("name"), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "treatments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(80) NOT NULL, "description" text NOT NULL, "duration_minutes" integer NOT NULL, "price" numeric(8,2) NOT NULL, CONSTRAINT "PK_133f26d52c70b9fa3c2dbb3c89e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "treatment_ingredients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "treatment_id" uuid NOT NULL, "product_id" uuid NOT NULL, "quantity_per_visit" integer NOT NULL, CONSTRAINT "UQ_9f7f4aba56bff149f4a853e8a9a" UNIQUE ("treatment_id", "product_id"), CONSTRAINT "PK_281756103822ceed899d12b700b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "stylist_skills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "stylist_id" uuid NOT NULL, "treatment_id" uuid NOT NULL, CONSTRAINT "UQ_23b2f7c883edda47015adb03362" UNIQUE ("stylist_id", "treatment_id"), CONSTRAINT "PK_752ef5b7cdcb202196a600f7592" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "appointment_photos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "appointment_id" uuid NOT NULL, "file_name" character varying(80) NOT NULL, "mime_type" character varying(40) NOT NULL, CONSTRAINT "PK_5e221c33df6df02d77e8bd73dd1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."appointments_status_enum" AS ENUM('BOOKED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "appointments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "client_id" uuid NOT NULL, "stylist_id" uuid NOT NULL, "treatment_id" uuid NOT NULL, "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'BOOKED', CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "appointment_stock_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "appointment_id" uuid NOT NULL, "product_id" uuid NOT NULL, "quantity" integer NOT NULL, CONSTRAINT "PK_1482310e5c61a30c83e50d2f09b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "treatment_ingredients" ADD CONSTRAINT "FK_13ec89f0334df9acc3eecce8b5f" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "treatment_ingredients" ADD CONSTRAINT "FK_ff49de40c7a74b2d2f46e06fe5d" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stylist_skills" ADD CONSTRAINT "FK_4ec4746506e411371dbcf40d1cd" FOREIGN KEY ("stylist_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stylist_skills" ADD CONSTRAINT "FK_1e95213d9139820048c61f77f84" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointment_photos" ADD CONSTRAINT "FK_474b66da55946e8c1e4c5d46179" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_ccc5bbce58ad6bc96faa428b1e4" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_d7326e32e2577be9f0b37d22e14" FOREIGN KEY ("stylist_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_7bb12179740e7574318004c2f89" FOREIGN KEY ("treatment_id") REFERENCES "treatments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointment_stock_lines" ADD CONSTRAINT "FK_8aa15253d8c19a37559830e195e" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointment_stock_lines" ADD CONSTRAINT "FK_4d446d78b4cababf1098df0ff53" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointment_stock_lines" DROP CONSTRAINT "FK_4d446d78b4cababf1098df0ff53"`);
        await queryRunner.query(`ALTER TABLE "appointment_stock_lines" DROP CONSTRAINT "FK_8aa15253d8c19a37559830e195e"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_7bb12179740e7574318004c2f89"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_d7326e32e2577be9f0b37d22e14"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_ccc5bbce58ad6bc96faa428b1e4"`);
        await queryRunner.query(`ALTER TABLE "appointment_photos" DROP CONSTRAINT "FK_474b66da55946e8c1e4c5d46179"`);
        await queryRunner.query(`ALTER TABLE "stylist_skills" DROP CONSTRAINT "FK_1e95213d9139820048c61f77f84"`);
        await queryRunner.query(`ALTER TABLE "stylist_skills" DROP CONSTRAINT "FK_4ec4746506e411371dbcf40d1cd"`);
        await queryRunner.query(`ALTER TABLE "treatment_ingredients" DROP CONSTRAINT "FK_ff49de40c7a74b2d2f46e06fe5d"`);
        await queryRunner.query(`ALTER TABLE "treatment_ingredients" DROP CONSTRAINT "FK_13ec89f0334df9acc3eecce8b5f"`);
        await queryRunner.query(`DROP TABLE "appointment_stock_lines"`);
        await queryRunner.query(`DROP TABLE "appointments"`);
        await queryRunner.query(`DROP TYPE "public"."appointments_status_enum"`);
        await queryRunner.query(`DROP TABLE "appointment_photos"`);
        await queryRunner.query(`DROP TABLE "stylist_skills"`);
        await queryRunner.query(`DROP TABLE "treatment_ingredients"`);
        await queryRunner.query(`DROP TABLE "treatments"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
    }

}
