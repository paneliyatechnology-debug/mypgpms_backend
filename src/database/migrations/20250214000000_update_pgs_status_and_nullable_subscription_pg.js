/**
 * Migration:
 * 1. Extend pgs.status ENUM to support Super Admin review & suspension workflows
 *    ('active', 'under_review', 'suspended', 'inactive').
 * 2. Allow subscription_plans.pg_id to be nullable so Super Admin can manage
 *    platform-wide plans in addition to PG-scoped plans.
 *
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
export const up = async (knex) => {
  await knex.raw(`
    ALTER TABLE pgs
    MODIFY COLUMN status ENUM('active', 'under_review', 'suspended', 'inactive')
    NOT NULL DEFAULT 'active'
  `);

  await knex.raw(`
    ALTER TABLE subscription_plans
    MODIFY COLUMN pg_id INT UNSIGNED NULL
  `);
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
export const down = async (knex) => {
  await knex('pgs')
    .whereIn('status', ['under_review', 'suspended'])
    .update({ status: 'inactive' });

  await knex.raw(`
    ALTER TABLE pgs
    MODIFY COLUMN status ENUM('active', 'inactive')
    NOT NULL DEFAULT 'active'
  `);

  const firstPg = await knex('pgs').whereNull('deleted_at').orderBy('id', 'asc').first();
  if (firstPg) {
    await knex('subscription_plans')
      .whereNull('pg_id')
      .update({ pg_id: firstPg.id });

    await knex.raw(`
      ALTER TABLE subscription_plans
      MODIFY COLUMN pg_id INT UNSIGNED NOT NULL
    `);
  }
};
