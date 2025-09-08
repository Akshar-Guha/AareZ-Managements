import type { Knex } from "knex";
import bcrypt from 'bcryptjs';  // Direct default import

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.text('name').notNullable();
    table.text('email').notNullable().unique();
    table.text('password_hash').notNullable();
    table.text('role').notNullable().defaultTo('mr');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('doctors', (table) => {
    table.increments('id').primary();
    table.text('code').unique().notNullable();
    table.text('name').notNullable();
    table.text('specialty');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('products', (table) => {
    table.increments('id').primary();
    table.text('name').notNullable();
    table.text('category').notNullable();
    table.text('status').notNullable().defaultTo('Active');
    table.decimal('price', 12, 2).defaultTo(0);
    table.text('product_type');
    table.text('packaging_type');
    table.integer('strips_per_box');
    table.integer('units_per_strip');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('investments', (table) => {
    table.increments('id').primary();
    table.integer('doctor_id').references('doctors.id');
    table.text('doctor_code');
    table.text('doctor_name');
    table.decimal('amount', 12, 2).notNullable();
    table.date('investment_date').notNullable();
    table.decimal('expected_returns', 12, 2);
    table.decimal('actual_returns', 12, 2);
    table.specificType('preferences', 'TEXT[]');
    table.text('notes');
    table.integer('created_by').references('users.id');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('bills', (table) => {
    table.increments('id').primary();
    table.text('merchant');
    table.date('bill_date');
    table.decimal('total', 12, 2);
    table.jsonb('items');
    table.text('raw_text');
    table.jsonb('extracted');
    table.integer('created_by').references('users.id');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('activity_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('users.id');
    table.text('action').notNullable();
    table.text('entity_type').notNullable();
    table.integer('entity_id');
    table.jsonb('details');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('pharmacies', (table) => {
    table.increments('id').primary();
    table.text('name').notNullable();
    table.text('city').notNullable();
    table.text('address').notNullable();
    table.jsonb('product_with_count_given').defaultTo('[]');
    table.date('date_given').notNullable();
    table.jsonb('current_stock_owns').defaultTo('[]');
    table.date('due_date_amount').notNullable();
    table.text('scheme_applied');
    table.integer('created_by').references('users.id');
    table.timestamps(true, true);
  });

  // Insert default users if they don't exist
  const adminExists = await knex('users').where('email', 'admin@aarezhealth.com').first();
  if (!adminExists) {
    console.log('Creating default admin user...');
    const password_hash = await bcrypt.hash('admin123', 10);
    await knex('users').insert({
      name: 'Umbra',
      email: 'admin@aarezhealth.com',
      password_hash,
      role: 'admin',
    });
    console.log('Default admin user created: admin@aarezhealth.com / admin123');
  }

  const extraUsers = [
    { name: 'User One', email: 'user1@aarezhealth.com', password: 'user123' },
    { name: 'User Two', email: 'user2@aarezhealth.com', password: 'user123' },
    { name: 'User Three', email: 'user3@aarezhealth.com', password: 'user123' }
  ];

  for (const u of extraUsers) {
    const userExists = await knex('users').where('email', u.email).first();
    if (!userExists) {
      const password_hash = await bcrypt.hash(u.password, 10);
      await knex('users').insert({
        name: u.name,
        email: u.email,
        password_hash,
        role: 'user',
      });
      console.log(`Default user created: ${u.email} / ${u.password}`);
    }
  }

  const mrExists = await knex('users').where('email', 'mr@aarezhealth.com').first();
  if (!mrExists) {
    console.log('Creating default MR user...');
    const password_hash = await bcrypt.hash('mr123', 10);
    await knex('users').insert({
      name: 'MR User',
      email: 'mr@aarezhealth.com',
      password_hash,
      role: 'mr',
    });
    console.log('Default MR user created: mr@aarezhealth.com / mr123');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pharmacies');
  await knex.schema.dropTableIfExists('activity_logs');
  await knex.schema.dropTableIfExists('bills');
  await knex.schema.dropTableIfExists('investments');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('doctors');
  await knex.schema.dropTableIfExists('users');
}

