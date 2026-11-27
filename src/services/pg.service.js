import db from '../config/db.js';
import { buildFileUrl } from '../utils/url.js';
import { AppError } from '../utils/apiResponse.js';
import { HTTP_STATUS, AUDIT_ACTIONS } from '../constants/index.js';
import auditService from './audit.service.js';


/**
 * Service managing Paying Guest (PG) facilities
 * Handles PG creation, updates, deletions, and resident listings.
 */
class PgService {
  /**
   * Safe columns to select for PG entities
   */
  static selectFields = [
    'id',
    'owner_id',
    'name',
    'type',
    'phone',
    'address',
    'city',
    'state',
    'pincode',
    'total_rooms',
    'total_beds',
    'amenities',
    'rules',
    'status',
    'logo',
    'pg_upi_id',
    'pg_bank_name',
    'pg_account_number',
    'pg_ifsc_code',
    'pg_account_holder_name',
    'created_at',
    'updated_at',
    'deleted_at',
  ];

  /**
   * Create a new PG for an owner (admin)
   * Enforces 1 PG per admin rule.
   * @param {number|string} owner_id - User ID of the owner
   * @param {object} pg_data - Details of the PG facility
   * @param {object} [trx=null] - Optional Knex transaction instance
   * @returns {Promise<object>} Created PG object
   */
  create = async (owner_id, pg_data, trx = null) => {
    const query = trx ? db('pgs').transacting(trx) : db('pgs');

    // Enforce 1 Admin = 1 PG rule
    const existing = await query.where({ owner_id }).whereNull('deleted_at').first();
    if (existing) {
      throw new AppError(
        'An admin can only own one PG property. You can create multiple branches under your existing PG.',
        HTTP_STATUS.CONFLICT
      );
    }

    const [pg_id] = await query.insert({
      owner_id,
      name: pg_data.name,
      type: pg_data.type || 'coed',
      phone: pg_data.phone,
      address: pg_data.address,
      city: pg_data.city,
      state: pg_data.state,
      pincode: pg_data.pincode,
      total_rooms: pg_data.total_rooms || 0,
      total_beds: pg_data.total_beds || 0,
      amenities: Array.isArray(pg_data.amenities)
        ? JSON.stringify(pg_data.amenities)
        : pg_data.amenities || null,
      rules: pg_data.rules || null,
      status: pg_data.status || 'active',
      logo: pg_data.logo || null,
      pg_upi_id: pg_data.pg_upi_id || null,
      pg_bank_name: pg_data.pg_bank_name || null,
      pg_account_number: pg_data.pg_account_number || null,
      pg_ifsc_code: pg_data.pg_ifsc_code ? String(pg_data.pg_ifsc_code).toUpperCase() : null,
      pg_account_holder_name: pg_data.pg_account_holder_name || null,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    return await this.findById(pg_id, trx);
  };

  /**
   * Update an existing PG facility
   * @param {number|string} id - PG ID
   * @param {object} pg_data - Fields to update
   * @param {object} [trx=null] - Optional Knex transaction instance
   * @returns {Promise<object>} Updated PG object
   */
  update = async (id, pg_data, trx = null) => {
    const query = trx ? db('pgs').transacting(trx) : db('pgs');

    const updateFields = {};
    if (pg_data.name !== undefined) updateFields.name = pg_data.name;
    if (pg_data.type !== undefined) updateFields.type = (pg_data.type === 'null' || !pg_data.type) ? null : pg_data.type;
    if (pg_data.phone !== undefined) updateFields.phone = (pg_data.phone === 'null' || !pg_data.phone) ? null : pg_data.phone;
    if (pg_data.address !== undefined) updateFields.address = (pg_data.address === 'null' || !pg_data.address) ? null : pg_data.address;
    if (pg_data.city !== undefined) updateFields.city = (pg_data.city === 'null' || !pg_data.city) ? null : pg_data.city;
    if (pg_data.state !== undefined) updateFields.state = (pg_data.state === 'null' || !pg_data.state) ? null : pg_data.state;
    if (pg_data.pincode !== undefined) updateFields.pincode = (pg_data.pincode === 'null' || !pg_data.pincode) ? null : pg_data.pincode;
    if (pg_data.total_rooms !== undefined) updateFields.total_rooms = (pg_data.total_rooms === 'null' || pg_data.total_rooms === '') ? 0 : (Number(pg_data.total_rooms) || 0);
    if (pg_data.total_beds !== undefined) updateFields.total_beds = (pg_data.total_beds === 'null' || pg_data.total_beds === '') ? 0 : (Number(pg_data.total_beds) || 0);
    if (pg_data.amenities !== undefined) {
      updateFields.amenities = Array.isArray(pg_data.amenities)
        ? JSON.stringify(pg_data.amenities)
        : ((pg_data.amenities === 'null' || !pg_data.amenities) ? null : pg_data.amenities);
    }
    if (pg_data.rules !== undefined) updateFields.rules = (pg_data.rules === 'null' || !pg_data.rules) ? null : pg_data.rules;
    if (pg_data.status !== undefined) updateFields.status = pg_data.status;
    if (pg_data.logo !== undefined) updateFields.logo = (pg_data.logo === 'null' || !pg_data.logo) ? null : pg_data.logo;
    if (pg_data.pg_upi_id !== undefined) updateFields.pg_upi_id = (pg_data.pg_upi_id === 'null' || !pg_data.pg_upi_id) ? null : pg_data.pg_upi_id;
    if (pg_data.pg_bank_name !== undefined) updateFields.pg_bank_name = (pg_data.pg_bank_name === 'null' || !pg_data.pg_bank_name) ? null : pg_data.pg_bank_name;
    if (pg_data.pg_account_number !== undefined) updateFields.pg_account_number = (pg_data.pg_account_number === 'null' || !pg_data.pg_account_number) ? null : pg_data.pg_account_number;
    if (pg_data.pg_ifsc_code !== undefined) {
      updateFields.pg_ifsc_code = (pg_data.pg_ifsc_code && pg_data.pg_ifsc_code !== 'null') ? String(pg_data.pg_ifsc_code).toUpperCase() : null;
    }
    if (pg_data.pg_account_holder_name !== undefined) {
      updateFields.pg_account_holder_name = (pg_data.pg_account_holder_name === 'null' || !pg_data.pg_account_holder_name) ? null : pg_data.pg_account_holder_name;
    }

    if (Object.keys(updateFields).length > 0) {
      updateFields.updated_at = db.fn.now();
      await query.where({ id }).update(updateFields);
    }

    return await this.findById(id, trx);
  };

  /**
   * Find PG by ID with owner information and active resident count
   * @param {number|string} id - PG ID
   * @param {object} [trx=null] - Optional Knex transaction instance
   * @returns {Promise<object|null>}
   */
  findById = async (id, trx = null) => {
    const query = trx ? db('pgs').transacting(trx) : db('pgs');

    const pg = await query
      .where('pgs.id', id)
      .whereNull('pgs.deleted_at')
      .leftJoin('users', (join) => {
        join.on('pgs.owner_id', '=', 'users.id').andOnNull('users.deleted_at');
      })
      .select(
        'pgs.*',
        'users.name as owner_name',
        'users.email as owner_email',
        'users.phone as owner_phone',
        'users.gender as owner_gender',
        'users.address as owner_address',
        'users.profile_photo as owner_profile_photo'
      )
      .first();

    if (!pg) return null;

    // Parse amenities JSON if stored as string
    if (typeof pg.amenities === 'string') {
      try {
        pg.amenities = JSON.parse(pg.amenities);
      } catch {
        // Keep string if not valid JSON
      }
    }

    // Calculate total active resident occupancy across all rooms
    const active_stay_query = trx ? db('resident_pg_stays').transacting(trx) : db('resident_pg_stays');
    const [{ active_residents }] = await active_stay_query
      .where({ pg_id: id, status: 'active' })
      .whereNull('deleted_at')
      .count('id as active_residents');

    const activeCount = Number(active_residents) || 0;
    const totalBeds = Number(pg.total_beds) || 0;
    pg.active_residents_count = activeCount;
    pg.occupancy_rate = totalBeds > 0 ? Math.min(100, Math.round((activeCount / totalBeds) * 100)) : 0;
    pg.logo_url = buildFileUrl('pgs', pg.logo);
    pg.owner_profile_photo_url = buildFileUrl('users', pg.owner_profile_photo);
    pg.bank_details = {
      pg_upi_id: pg.pg_upi_id || null,
      pg_bank_name: pg.pg_bank_name || null,
      pg_account_number: pg.pg_account_number || null,
      pg_ifsc_code: pg.pg_ifsc_code || null,
      pg_account_holder_name: pg.pg_account_holder_name || null,
    };
    return pg;
  };

  /**
   * Find single PG owned by an admin
   * @param {number|string} owner_id - Admin user ID
   * @param {object} [trx=null] - Optional Knex transaction instance
   * @returns {Promise<object|null>}
   */
  findByOwnerId = async (owner_id, trx = null) => {
    const query = trx ? db('pgs').transacting(trx) : db('pgs');
    const pg = await query.where({ owner_id }).whereNull('deleted_at').first();
    if (!pg) return null;
    return await this.findById(pg.id, trx);
  };

  /**
   * Find all PGs with pagination and filters
   * @param {object} options
   * @returns {Promise<{ pgs: Array, pagination: object }>}
   */
  findAll = async ({ owner_id = null, city = '', type = '', status = '', search = '', page = 1, limit = 10 }) => {
    const current_page = Math.max(1, parseInt(page, 10) || 1);
    const per_page = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (current_page - 1) * per_page;

    let query = db('pgs')
      .whereNull('pgs.deleted_at')
      .leftJoin('users', (join) => {
        join.on('pgs.owner_id', '=', 'users.id').andOnNull('users.deleted_at');
      })
      .select(
        'pgs.*',
        'users.name as owner_name',
        'users.email as owner_email',
        'users.phone as owner_phone',
        'users.gender as owner_gender',
        'users.address as owner_address',
        'users.profile_photo as owner_profile_photo'
      );

    let count_query = db('pgs')
      .whereNull('pgs.deleted_at')
      .leftJoin('users', (join) => {
        join.on('pgs.owner_id', '=', 'users.id').andOnNull('users.deleted_at');
      })
      .count('pgs.id as total');

    if (owner_id) {
      query = query.where('pgs.owner_id', owner_id);
      count_query = count_query.where('pgs.owner_id', owner_id);
    }

    if (city) {
      query = query.where('pgs.city', 'like', `%${city}%`);
      count_query = count_query.where('pgs.city', 'like', `%${city}%`);
    }

    if (type) {
      query = query.where('pgs.type', type);
      count_query = count_query.where('pgs.type', type);
    }

    if (status) {
      query = query.where('pgs.status', status);
      count_query = count_query.where('pgs.status', status);
    }

    if (search) {
      const search_pattern = `%${search}%`;
      const search_filter = (builder) => {
        builder
          .where('pgs.name', 'like', search_pattern)
          .orWhere('pgs.address', 'like', search_pattern)
          .orWhere('pgs.city', 'like', search_pattern)
          .orWhere('pgs.phone', 'like', search_pattern)
          .orWhere('users.name', 'like', search_pattern)
          .orWhere('users.email', 'like', search_pattern);
      };
      query = query.where(search_filter);
      count_query = count_query.where(search_filter);
    }

    const [pgs, [{ total }]] = await Promise.all([
      query.orderBy('pgs.id', 'desc').limit(per_page).offset(offset),
      count_query,
    ]);

    const pgIds = pgs.map((p) => p.id);
    const residentCountsMap = new Map();
    if (pgIds.length > 0) {
      const stayCounts = await db('resident_pg_stays')
        .whereIn('pg_id', pgIds)
        .where({ status: 'active' })
        .whereNull('deleted_at')
        .select('pg_id')
        .count('id as active_residents')
        .groupBy('pg_id');

      stayCounts.forEach((row) => {
        residentCountsMap.set(Number(row.pg_id), Number(row.active_residents) || 0);
      });
    }

    pgs.forEach((pg) => {
      if (typeof pg.amenities === 'string') {
        try {
          pg.amenities = JSON.parse(pg.amenities);
        } catch {
          // Keep string
        }
      }
      const activeCount = residentCountsMap.get(Number(pg.id)) || 0;
      const totalBeds = Number(pg.total_beds) || 0;
      pg.active_residents_count = activeCount;
      pg.occupancy_rate = totalBeds > 0 ? Math.min(100, Math.round((activeCount / totalBeds) * 100)) : 0;
      pg.logo_url = buildFileUrl('pgs', pg.logo);
      pg.owner_profile_photo_url = buildFileUrl('users', pg.owner_profile_photo);
      pg.bank_details = {
        pg_upi_id: pg.pg_upi_id || null,
        pg_bank_name: pg.pg_bank_name || null,
        pg_account_number: pg.pg_account_number || null,
        pg_ifsc_code: pg.pg_ifsc_code || null,
        pg_account_holder_name: pg.pg_account_holder_name || null,
      };
    });

    const total_records = Number(total);
    const total_pages = Math.ceil(total_records / per_page) || 1;

    return {
      pgs,
      pagination: {
        total: total_records,
        page: current_page,
        limit: per_page,
        total_records,
        total_pages,
        has_next: current_page < total_pages,
        has_prev: current_page > 1,
      },
    };
  };

  /**
   * Get aggregated PG KPIs, facility type distribution, and available cities
   */
  getStats = async () => {
    const [summaryRow] = await db('pgs')
      .whereNull('deleted_at')
      .select(
        db.raw('COUNT(id) as total_pgs'),
        db.raw("COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) as active_pgs"),
        db.raw("COALESCE(SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END), 0) as pending_pgs"),
        db.raw("COALESCE(SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END), 0) as suspended_pgs"),
        db.raw("COALESCE(SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END), 0) as inactive_pgs"),
        db.raw('COALESCE(SUM(total_rooms), 0) as total_rooms'),
        db.raw('COALESCE(SUM(total_beds), 0) as total_beds')
      );

    const [residentRow] = await db('resident_pg_stays')
      .where({ status: 'active' })
      .whereNull('deleted_at')
      .count('id as total_residents');

    const typeRows = await db('pgs')
      .whereNull('deleted_at')
      .select('type')
      .count('id as count')
      .groupBy('type');

    const pg_distribution = { coed: 0, boys: 0, girls: 0 };
    typeRows.forEach((row) => {
      const key = String(row.type || '').toLowerCase();
      if (key in pg_distribution) {
        pg_distribution[key] = Number(row.count) || 0;
      }
    });

    const cityRows = await db('pgs')
      .whereNull('deleted_at')
      .whereNotNull('city')
      .where('city', '!=', '')
      .distinct('city')
      .orderBy('city', 'asc');

    return {
      total_pgs: Number(summaryRow?.total_pgs) || 0,
      active_pgs: Number(summaryRow?.active_pgs) || 0,
      pending_pgs: Number(summaryRow?.pending_pgs) || 0,
      suspended_pgs: Number(summaryRow?.suspended_pgs) || 0,
      inactive_pgs: Number(summaryRow?.inactive_pgs) || 0,
      total_rooms: Number(summaryRow?.total_rooms) || 0,
      total_beds: Number(summaryRow?.total_beds) || 0,
      total_residents: Number(residentRow?.total_residents) || 0,
      pg_distribution,
      cities: cityRows.map((r) => r.city).filter(Boolean),
    };
  };

  /**
   * Update PG operational status (Super Admin action)
   */
  updateStatus = async (id, status, reason = null, req = null) => {
    const existing = await this.findById(id);
    if (!existing) {
      throw new AppError('PG property not found', HTTP_STATUS.NOT_FOUND);
    }

    const oldStatus = existing.status;
    await db('pgs')
      .where({ id })
      .whereNull('deleted_at')
      .update({
        status,
        updated_at: db.fn.now(),
      });

    const updated = await this.findById(id);

    auditService.log({
      pg_id: Number(id),
      module: 'PGS',
      action: AUDIT_ACTIONS.STATUS_CHANGE,
      entity_type: 'pg',
      entity_id: id,
      description: `Changed PG "${existing.name}" status from ${oldStatus} to ${status}${reason ? ` (${reason})` : ''}`,
      old_values: { status: oldStatus },
      new_values: { status, ...(reason ? { reason } : {}) },
      req,
    });

    return updated;
  };

  /**
   * Get all residents who stayed or are currently staying in a PG
   * @param {number|string} pg_id - PG ID
   * @param {object} options
   * @returns {Promise<{ residents: Array, pagination: object }>}
   */
  getPgResidents = async (pg_id, { status = '', page = 1, limit = 10 }) => {
    const offset = (page - 1) * limit;

    let query = db('resident_pg_stays')
      .where('resident_pg_stays.pg_id', pg_id)
      .whereNull('resident_pg_stays.deleted_at')
      .join('users', (join) => {
        join.on('resident_pg_stays.resident_id', '=', 'users.id').andOnNull('users.deleted_at');
      })
      .join('rooms', (join) => {
        join.on('resident_pg_stays.room_id', '=', 'rooms.id').andOnNull('rooms.deleted_at');
      })
      .select(
        'resident_pg_stays.id as stay_id',
        'resident_pg_stays.pg_id',
        'resident_pg_stays.room_id',
        'rooms.room_no as room_number',
        'rooms.room_type',
        'resident_pg_stays.bed_number',
        'resident_pg_stays.monthly_rent',
        'resident_pg_stays.security_deposit',
        'resident_pg_stays.check_in_date',
        'resident_pg_stays.check_out_date',
        'resident_pg_stays.status as stay_status',
        'resident_pg_stays.notes',
        'resident_pg_stays.created_at as stay_created_at',
        'resident_pg_stays.deleted_at as stay_deleted_at',
        'users.id as resident_id',
        'users.name as resident_name',
        'users.email as resident_email',
        'users.phone as resident_phone',
        'users.gender as resident_gender'
      );

    let count_query = db('resident_pg_stays')
      .where('resident_pg_stays.pg_id', pg_id)
      .whereNull('resident_pg_stays.deleted_at')
      .count('resident_pg_stays.id as total');

    if (status) {
      query = query.where('resident_pg_stays.status', status);
      count_query = count_query.where('resident_pg_stays.status', status);
    }

    const [stays, [{ total }]] = await Promise.all([
      query.orderBy('resident_pg_stays.id', 'desc').limit(limit).offset(offset),
      count_query,
    ]);

    const total_records = Number(total);
    const total_pages = Math.ceil(total_records / limit);

    return {
      residents: stays,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total_records,
        total_pages,
        has_next: page < total_pages,
        has_prev: page > 1,
      },
    };
  };
}

export default new PgService();
