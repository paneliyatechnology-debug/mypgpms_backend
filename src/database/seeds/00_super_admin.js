import { hashPassword } from '../../utils/password.js';
import ROLES from '../../constants/roles.js';

/**
 * Seed: Default Super Admin
 *
 * Safe / idempotent — will NOT touch any existing data.
 * Creates the super_admin account only when it does not already exist.
 *
 * Run individually:
 *   npx knex seed:run --specific=00_super_admin.js
 *
 * Default credentials:
 *   Email   : superadmin@mypgpms.com
 *   Password: SuperAdmin@123
 *
 * ⚠️  Change the password immediately after first login in production.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const seed = async (knex) => {
  const SUPER_ADMIN_EMAIL = 'superadmin@mypgpms.com';
  const DEFAULT_PASSWORD  = 'SuperAdmin@123';

  // Check if super admin already exists
  const existing = await knex('users')
    .where({ email: SUPER_ADMIN_EMAIL, role: ROLES.SUPER_ADMIN })
    .first();

  if (existing) {
    console.log(`[Seed] Super admin already exists (id=${existing.id}). Skipping.`);
    return;
  }

  const hashed = await hashPassword(DEFAULT_PASSWORD);

  await knex('users').insert({
    name    : 'Super Administrator',
    email   : SUPER_ADMIN_EMAIL,
    password: hashed,
    role    : ROLES.SUPER_ADMIN,
    phone   : '9800000000',
    gender  : 'male',
    address : 'MYPGPMS Headquarters',
    status  : 'active',
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  });

  console.log(`[Seed] ✅ Super admin created successfully.`);
  console.log(`[Seed]    Email   : ${SUPER_ADMIN_EMAIL}`);
  console.log(`[Seed]    Password: ${DEFAULT_PASSWORD}`);
  console.log(`[Seed]    ⚠️  Please change the password after first login!`);
};
