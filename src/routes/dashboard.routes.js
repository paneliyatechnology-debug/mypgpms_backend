import { Router } from 'express';
import { getDashboard, getSuperAdminDashboard } from '../controllers/dashboard.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

/**
 * @route   GET /api/v1/dashboard/superadmin
 * @desc    Get platform-wide Super Admin KPI overview, 6-month revenue trajectory, and PG distribution
 * @access  Private (Super Admin)
 */
router.get('/superadmin', authenticate, authorize(ROLES.SUPER_ADMIN), getSuperAdminDashboard);

/**
 * @route   GET /api/v1/dashboard
 * @desc    Get dashboard data dynamically tailored to user's role:
 *          - Admin / Super Admin: Operations Dashboard (Residents, Occupancy, Revenue, Dues, Complaints, Trends, Room Breakdown, Activity)
 *          - Resident: Resident Dashboard (Stay details, Rent due, Next event, Gate pass, Quick actions, Today's menu, Complaints, Notice, Notifications)
 * @access  Private (Authenticated users: Resident, Admin, Super Admin, Branch Manager)
 */
router.get('/', authenticate, getDashboard);

export default router;

