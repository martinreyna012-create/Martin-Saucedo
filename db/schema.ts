import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const therapistProfiles=sqliteTable('therapist_profiles',{
 ownerId:text('owner_id').primaryKey(),name:text('name').notNull(),specialty:text('specialty').notNull().default(''),clinic:text('clinic').notNull().default(''),license:text('license').notNull().default(''),color:text('color').notNull().default('green'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
});
export const patients=sqliteTable('patients',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),name:text('name').notNull(),age:integer('age'),goal:text('goal').notNull().default(''),archived:integer('archived').notNull().default(0),version:integer('version').notNull().default(1),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
},t=>[index('patients_owner_idx').on(t.ownerId)]);
export const appointments=sqliteTable('appointments',{
 id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),patientId:text('patient_id').notNull().references(()=>patients.id),date:text('session_date').notNull(),time:text('start_time').notNull(),startMinute:integer('start_minute').notNull(),duration:integer('duration').notNull(),status:text('status').notNull().default('planned'),goal:text('goal').notNull().default(''),planJson:text('plan_json').notNull().default('[]'),notes:text('notes').notNull().default(''),version:integer('version').notNull().default(1),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
},t=>[index('appointments_owner_date_idx').on(t.ownerId,t.date)]);
