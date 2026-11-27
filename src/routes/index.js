import { Router } from 'express';
import moment from 'moment';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import stayRoutes from './stay.routes.js';
import roomRoutes from './room.routes.js';
import buildingRoutes from './building.routes.js';
import paymentRoutes from './payment.routes.js';
import visitorRoutes from './visitor.routes.js';
import branchRoutes from './branch.routes.js';
import cronRoutes from './cron.routes.js';
import foodMenuRoutes from './foodMenu.routes.js';
import complaintRoutes from './complaint.routes.js';
import laundryRoutes from './laundry.routes.js';
import subscriptionRoutes from './subscription.routes.js';
import noticeRoutes from './notice.routes.js';
import pgRoutes from './pg.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import communityRoutes from './community.routes.js';
import auditRoutes from './audit.routes.js';
import { success } from '../utils/apiResponse.js';
import { authenticate, requireActivePg } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  return success(res, 'System is healthy', {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: moment().toISOString(),
  });
});

// ─── Public auth routes (login, register, OTP, refresh) ─────────────────────
router.use('/auth', authRoutes);

// ─── Cron / internal jobs (no pg check needed) ──────────────────────────────
router.use('/crons', cronRoutes);

// ─── PG management routes (super_admin only; no active-pg guard needed) ─────
// requireActivePg is bypassed for super_admin inside the middleware itself,
// but we still apply it so admins can only view their own active PG.
router.use('/pgs', pgRoutes);

// ─── All remaining routes: authenticate → requireActivePg → route handler ───
//
// requireActivePg rules (enforced inside the middleware):
//   • super_admin  → always passes through
//   • resident     → always passes through
//   • admin/staff  → blocked with 401 if PG status ≠ 'active'
//
router.use('/users',         authenticate, requireActivePg, userRoutes);
router.use('/stays',         authenticate, requireActivePg, stayRoutes);
router.use('/buildings',     authenticate, requireActivePg, buildingRoutes);
router.use('/rooms',         authenticate, requireActivePg, roomRoutes);
router.use('/payments',      authenticate, requireActivePg, paymentRoutes);
router.use('/visitors',      authenticate, requireActivePg, visitorRoutes);
router.use('/branches',      authenticate, requireActivePg, branchRoutes);
router.use('/food-menu',     authenticate, requireActivePg, foodMenuRoutes);
router.use('/complaints',    authenticate, requireActivePg, complaintRoutes);
router.use('/laundry',       authenticate, requireActivePg, laundryRoutes);
router.use('/subscriptions', authenticate, requireActivePg, subscriptionRoutes);
router.use('/notices',       authenticate, requireActivePg, noticeRoutes);
router.use('/dashboard',     authenticate, requireActivePg, dashboardRoutes);
router.use('/community',     authenticate, requireActivePg, communityRoutes);
router.use('/audits',        authenticate, requireActivePg, auditRoutes);

export default router;
