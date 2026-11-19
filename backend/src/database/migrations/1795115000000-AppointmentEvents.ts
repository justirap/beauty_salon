import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppointmentEvents1795115000000 implements MigrationInterface {
  name = 'AppointmentEvents1795115000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "appointment_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "appointment_id" uuid NOT NULL, "message" character varying(240) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_appointment_events" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment_events" ADD CONSTRAINT "FK_appointment_events_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointment_events" DROP CONSTRAINT "FK_appointment_events_appointment"`,
    );
    await queryRunner.query(`DROP TABLE "appointment_events"`);
  }
}
