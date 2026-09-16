import express, { Request, Response } from 'express';
import pool from '../config/database.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { withAudit } from '../utils/withAudit.js';
import {
  listTicketRuleSets,
  resolveTicketRuleForUser,
  validateTicketRuleForUser,
} from '../services/ticketRules.service.js';

const router = express.Router();

//
// =====================================================
// EMPLOYEES
// =====================================================
//

router.get('/employees', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      per_page = 20,
      search,
      department,
      sortBy = 'name',
      order = 'asc',
    } = req.query;

    const allowedSort = ['name', 'department', 'position', 'amount', 'zk_user_id'];
    const sortColumn = allowedSort.includes(String(sortBy)) ? String(sortBy) : 'name';
    const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

    let query = `
      SELECT zk_user_id, name, department, position, amount
      FROM users
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) AS total
      FROM users
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // SEARCH (name, id, department, position)
    if (search) {
      query += ` AND (
        name ILIKE $${paramIndex} OR
        zk_user_id ILIKE $${paramIndex} OR
        department ILIKE $${paramIndex} OR
        position ILIKE $${paramIndex}
      )`;

      countQuery += ` AND (
        name ILIKE $${paramIndex} OR
        zk_user_id ILIKE $${paramIndex} OR
        department ILIKE $${paramIndex} OR
        position ILIKE $${paramIndex}
      )`;

      params.push(`%${search}%`);
      paramIndex++;
    }

    // DEPARTMENT FILTER
    if (department) {
      query += ` AND department = $${paramIndex}`;
      countQuery += ` AND department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    // TOTAL COUNT
    const countResult = await pool.query(countQuery, params);
    const total = Number(countResult.rows[0].total);

    // PAGINATION
    const pageNum = Number(page) || 1;
    const pageSize = Number(per_page) || 20;
    const offset = (pageNum - 1) * pageSize;

    query += `
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramIndex}
      OFFSET $${paramIndex + 1}
    `;

    params.push(pageSize, offset);

    const result = await pool.query(query, params);

    res.json({
      data: result.rows,
      total,
      page: pageNum,
      per_page: pageSize,
      total_pages: Math.ceil(total / pageSize),
    });

  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Error fetching employees' });
  }
});

//
// GET SINGLE EMPLOYEE
//
router.get('/employees/:zk_user_id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { zk_user_id } = req.params;

    const result = await pool.query(
      `SELECT * FROM users WHERE zk_user_id = $1`,
      [zk_user_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching employee' });
  }
});

//
// UPSERT EMPLOYEE
//
router.post('/employees', authenticateToken, authorizeRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const { zk_user_id, name, department, position, amount } = req.body;
    
    if (!zk_user_id || !name || !department) {
      return res.status(400).json({
        message: 'zk_user_id, name, and department are required',
      });
    }
    console.log("Logged in user:", req.user);
    const adminId = req.user?.zk_user_id || 'system';
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = await withAudit(
      {
        zk_user_id: adminId,
        action: 'UPSERT',
        entity: 'EMPLOYEE',
        entity_id: zk_user_id,
        details: `Upserted employee: ${name} (${zk_user_id})`,
        ip_address:ip,
      },
      async () => {
        return await pool.query(
          `
          INSERT INTO users (zk_user_id, name, department, position, amount)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (zk_user_id)
          DO UPDATE SET
            name = EXCLUDED.name,
            department = EXCLUDED.department,
            position = EXCLUDED.position,
            amount = EXCLUDED.amount,
            updated_at = NOW()
          RETURNING *
          `,
          [
            zk_user_id,
            name,
            department,
            position || 'Staff',
            Number(amount || 0),
          ]
        );
      }
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Save employee error:', error);
    res.status(500).json({ message: 'Error saving employee' });
  }
});

//
// UPDATE EMPLOYEE (optional explicit endpoint)
//
router.put('/employees/:zk_user_id', authenticateToken, authorizeRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const { zk_user_id } = req.params;
    const { name, department, position, amount } = req.body;
    
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = await withAudit(
      {
        zk_user_id: req.user?.zk_user_id || 'system',
        action: 'UPDATE',
        entity: 'EMPLOYEE',
        entity_id: zk_user_id,
        details: `Updated employee: ${name} (${zk_user_id})`,
        ip_address: ip,
      },
      async () => {
        const updateResult = await pool.query(
          `
          UPDATE users
          SET name = $1,
              department = $2,
              position = $3,
              amount = $4,
              updated_at = NOW()
          WHERE zk_user_id = $5
          RETURNING *
          `,
          [name, department, position, Number(amount || 0), zk_user_id]
        );
        return updateResult;
      }
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating employee' });
  }
});

//
// DELETE EMPLOYEE
//
router.delete('/employees/:zk_user_id', authenticateToken, authorizeRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const { zk_user_id } = req.params;

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = await withAudit(
      {
        zk_user_id: req.user?.zk_user_id || 'system',
        action: 'DELETE',
        entity: 'EMPLOYEE',
        entity_id: zk_user_id,
        details: `Deleted employee: ${zk_user_id}`,
        ip_address: ip,
      },
      async () => {
        return await pool.query(
          `DELETE FROM users WHERE zk_user_id = $1 RETURNING zk_user_id`,
          [zk_user_id]
        );
      }
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting employee' });
  }
});

//
// BULK UPLOAD
//
router.post('/employees/bulk-upload', authenticateToken, authorizeRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const { employees } = req.body;

    if (!Array.isArray(employees)) {
      return res.status(400).json({ message: 'Invalid employees array' });
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await withAudit(
      {
        zk_user_id: req.user?.zk_user_id || 'system',
        action: 'BULK_UPLOAD',
        entity: 'EMPLOYEE',
        details: `Bulk uploaded ${employees.length} employees`,
        ip_address: ip,
      },
      async () => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          for (const emp of employees) {
            const {
              employee_id,
              name,
              department,
              role,
              amount,
            } = emp;

            if (!employee_id || !name) continue;

            await client.query(
              `
              INSERT INTO users (zk_user_id, name, department, position, amount)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (zk_user_id)
              DO UPDATE SET
                name = EXCLUDED.name,
                department = EXCLUDED.department,
                position = EXCLUDED.position,
                amount = EXCLUDED.amount,
                updated_at = NOW()
              `,
              [
                employee_id,
                name,
                department || 'Other',
                role || 'Staff',
                Number(amount || 0),
              ]
            );
          }
          await client.query('COMMIT');
          return { success: true };
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      }
    );

    res.json({
      message: `Processed ${employees.length} employees`,
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ message: 'Bulk upload failed' });
  }
});

//
// BULK DELETE
//
router.post('/employees/bulk-delete', authenticateToken, authorizeRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      return res.status(400).json({ message: 'Invalid ids' });
    }
    
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = await withAudit(
      {
        zk_user_id: req.user?.zk_user_id || 'system',
        action: 'BULK_DELETE',
        entity: 'EMPLOYEE',
        details: `Bulk deleted ${ids.length} employees: ${ids.join(', ')}`,
        ip_address: ip,
      },
      async () => {
        return await pool.query(
          `DELETE FROM users WHERE zk_user_id = ANY($1)`,
          [ids]
        );
      }
    );

    res.json({
      success: true,
      deleted: result.rowCount,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Bulk delete failed' });
  }
});

//
// =====================================================
// TICKET RULES
// =====================================================
//

router.get('/ticket-rules', authenticateToken, authorizeRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const data = await listTicketRuleSets();
    res.json({ data });
  } catch (error) {
    console.error('List ticket rules error:', error);
    res.status(500).json({ message: 'Error fetching ticket rules' });
  }
});

router.get('/ticket-rules/resolve/:zk_user_id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const resolved = await resolveTicketRuleForUser(req.params.zk_user_id);

    if (!resolved) {
      return res.status(404).json({ message: 'No ticket rule found for employee' });
    }

    res.json({ data: resolved });
  } catch (error) {
    console.error('Resolve ticket rule error:', error);
    res.status(500).json({ message: 'Error resolving ticket rule' });
  }
});

router.get('/ticket-rules/validate/:zk_user_id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const validation = await validateTicketRuleForUser(req.params.zk_user_id);
    res.json({ data: validation });
  } catch (error) {
    console.error('Validate ticket rule error:', error);
    res.status(500).json({ message: 'Error validating ticket rule' });
  }
});

// Ticket Policy CRUD routes - to be inserted into data.ts

// =====================================================
// TICKET POLICY CRUD
// =====================================================

// CREATE rule set
router.post('/ticket-rules', authenticateToken, authorizeRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const { name, position, max_per_day, priority, is_default, is_active } = req.body;
      if (!name || max_per_day === undefined) {
      return res.status(400).json({ message: 'name and max_per_day are required' });
    }
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = await withAudit(
      {
        zk_user_id: req.user?.zk_user_id || 'system',
        action: 'CREATE',
        entity: 'TICKET_RULE_SET',
        details: 'Created rule set: ' + name,
        ip_address: ip,
      },
     async () => {
        return await pool.query(
          'INSERT INTO ticket_rule_sets (name, position, max_per_day, priority, is_default, is_active, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
          [name, position || 'all', max_per_day, priority || 0, is_default || false, is_active !== false, req.user?.zk_user_id || 'system']
        );
      }
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Create rule set error:', error);
    res.status(500).json({ message: 'Error creating rule set' });
  }
});

// UPDATE rule set
router.put('/ticket-rules/:id', authenticateToken, authorizeRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, max_per_day, is_default, is_active } = req.body;

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = await withAudit(
      {
        zk_user_id: req.user?.zk_user_id || 'system',
        action: 'UPDATE',
        entity: 'TICKET_RULE_SET',
        entity_id: id,
        details: 'Updated rule set: ' + (name || id),
        ip_address: ip,
      },
      async () => {
        return await pool.query(
          'UPDATE ticket_rule_sets SET name = COALESCE($1, name), max_per_day = COALESCE($2, max_per_day), is_default = COALESCE($3, is_default), is_active = COALESCE($4, is_active), updated_at = NOW() WHERE id = $5 RETURNING *',
          [name, max_per_day, is_default, is_active, id]
        );
      }
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Rule set not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Update rule set error:', error);
    res.status(500).json({ message: 'Error updating rule set' });
  }
});

// DELETE rule set
router.delete('/ticket-rules/:id', authenticateToken, authorizeRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = await withAudit(
      {
        zk_user_id: req.user?.zk_user_id || 'system',
        action: 'DELETE',
        entity: 'TICKET_RULE_SET',
        entity_id: id,
        details: 'Deleted rule set: ' + id,
        ip_address: ip,
      },
      async () => {
        return await pool.query('DELETE FROM ticket_rule_sets WHERE id = $1 RETURNING id', [id]);
      }
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Rule set not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete rule set error:', error);
    res.status(500).json({ message: 'Error deleting rule set' });
  }
});

// ADD time window to rule set
router.post('/ticket-rules/:id/windows', authenticateToken, authorizeRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, name, start_time, end_time } = req.body;

    if (!start_time || !end_time) {
      return res.status(400).json({ message: 'start_time and end_time are required' });
    }

    const result = await pool.query(
      'INSERT INTO ticket_rule_windows (rule_set_id, name, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, label || name || null, start_time, end_time]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Add window error:', error);
    res.status(500).json({ message: 'Error adding time window' });
  }
});

// DELETE time window
router.delete('/ticket-rules/windows/:windowId', authenticateToken, authorizeRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const { windowId } = req.params;
    const result = await pool.query('DELETE FROM ticket_rule_windows WHERE id = $1 RETURNING id', [windowId]);

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Window not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete window error:', error);
    res.status(500).json({ message: 'Error deleting time window' });
  }
});

// ADD assignment to rule set
router.post('/ticket-rules/:id/assignments', authenticateToken, authorizeRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, department, position, zk_user_id, priority } = req.body;

    if (!role && !department && !zk_user_id) {
      return res.status(400).json({ message: 'At least one of role, department, or zk_user_id is required' });
    }

    const result = await pool.query(
      'INSERT INTO ticket_rule_assignments (rule_set_id, role, position, zk_user_id, priority) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, role || null, position || null, zk_user_id || null, priority || 0]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Add assignment error:', error);
    res.status(500).json({ message: 'Error adding assignment' });
  }
});

// DELETE assignment
router.delete('/ticket-rules/assignments/:assignmentId', authenticateToken, authorizeRole(['admin', 'hr']), async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const result = await pool.query('DELETE FROM ticket_rule_assignments WHERE id = $1 RETURNING id', [assignmentId]);

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ message: 'Error deleting assignment' });
  }
});

// =====================================================
// TICKET CREATION (with policy enforcement)
// =====================================================


//route for position on ticket rule
router.get('/positions', authenticateToken, async (req, res) => {
  try {
    // This query gets all unique positions from your users table
    const result = await pool.query('SELECT DISTINCT position FROM users WHERE position IS NOT NULL');
    const positions = result.rows.map(row => row.position);
    res.json({ data: positions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching positions' });
  }
});

// Issue/print a ticket with policy validation
router.post('/tickets/issue', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { zk_user_id, event_name, amount } = req.body;

    if (!zk_user_id) {
      return res.status(400).json({ message: 'zk_user_id is required' });
    }

    // Validate ticket policy
    const validation = await validateTicketRuleForUser(zk_user_id);

    if (!validation.allowed) {
      return res.status(403).json({
        message: validation.reason || 'Ticket printing not allowed',
        policy: {
          isConfigured: validation.isConfigured,
          usageCountToday: validation.usageCountToday,
          maxPerDay: validation.maxPerDay,
          activeWindowLabel: validation.activeWindowLabel,
          matchedBy: validation.matchedBy,
        }
      });
    }

    // Generate ticket number using local time (Africa/Lagos)
    // Format: {employee_id}-{YYYY-MM-DD}-{HH:MM:SS}:{ms}
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const ticketNumber = `${zk_user_id}-${dateStr}-${timeStr}:${ms}`;

    // Get user info
    const userResult = await pool.query(
      'SELECT name, department FROM users WHERE zk_user_id = $1',
      [zk_user_id]
    );
    const userInfo = userResult.rows[0] || {};

    // Create ticket with event_date stored as UTC TIMESTAMPTZ
    // Use NOW() directly (already TIMESTAMPTZ in UTC), then convert to Africa/Lagos for display
    const result = await withAudit(
      {
        zk_user_id: req.user?.zk_user_id || 'system',
        action: 'ISSUE_TICKET',
        entity: 'TICKET',
        entity_id: ticketNumber,
        details: 'Issued ticket ' + ticketNumber + ' for ' + zk_user_id,
      },
      async () => {
        return await pool.query(
          'INSERT INTO tickets (ticket_number, zk_user_id, event_name, event_date, name, department, amount) VALUES ($1, $2, $3, NOW(), $4, $5, $6) RETURNING *',
          [ticketNumber, zk_user_id, event_name || 'Meal', userInfo.name || '', userInfo.department || '', Number(amount || 0)]
        );
      }
    );

    res.status(201).json({
      data: result.rows[0],
      policy: {
        ruleSetName: validation.ruleSet?.name,
        usageCountToday: validation.usageCountToday + 1,
        maxPerDay: validation.maxPerDay,
        activeWindowLabel: validation.activeWindowLabel,
      }
    });
  } catch (error) {
    console.error('Issue ticket error:', error);
    res.status(500).json({ message: 'Error issuing ticket' });
  }
});

//
// =====================================================
// DASHBOARD
// =====================================================
//

router.get('/dashboard/departments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(department, 'Unknown') as department,
        COUNT(*)::int as total
      FROM users
      GROUP BY department
      ORDER BY total DESC
    `);

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Department distribution error:', error);
    res.status(500).json({ message: 'Error loading department distribution' });
  }
});

router.get('/dashboard/tickets', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = Number(days) || 30;

    const result = await pool.query(`
      SELECT
        DATE(event_date AT TIME ZONE 'Africa/Lagos') as date,
        COUNT(*)::int as used
      FROM tickets
      WHERE event_date >= NOW() - ($1 * INTERVAL '1 day')
      GROUP BY DATE(event_date AT TIME ZONE 'Africa/Lagos')
      ORDER BY date ASC
    `, [daysNum]);

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Ticket chart error:', error);
    res.status(500).json({ message: 'Error loading ticket chart' });
  }
});

router.get('/audit-logs', authenticateToken, authorizeRole(['admin', 'hr', 'auditor']), async (req: Request, res: Response) => {
  try {
    const { page = 1, per_page = 5, search, action, entity } = req.query;
    const pageNum = Number(page) || 1;
    const pageSize = Number(per_page) || 5;
    const offset = (pageNum - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (a.details ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (action) {
      whereClause += ` AND a.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }
    if (entity) {
      whereClause += ` AND a.entity = $${paramIndex}`;
      params.push(entity);
      paramIndex++;
    }

    const countResult = await pool.query(`
      SELECT COUNT(*) AS total FROM audit_logs a
      LEFT JOIN users u ON a.zk_user_id = u.zk_user_id
      ${whereClause}
    `, params);

    const total = Number(countResult.rows[0].total);

    // Dynamic IP address check
    let hasIpAddress = true;
    try {
      await pool.query(`SELECT ip_address FROM audit_logs LIMIT 1`);
    } catch (e) {
      hasIpAddress = false;
    }

    const ipSelect = hasIpAddress ? 'a.ip_address' : 'NULL AS ip_address';

    // FIX: Use $placeholders for pagination and pass a flat params array
    const result = await pool.query(`
      SELECT
        a.id, a.action, a.entity, a.details, a.timestamp,
        u.name AS user_name,
        u.position AS user_role,
        ${ipSelect}
      FROM audit_logs a
      LEFT JOIN users u ON a.zk_user_id = u.zk_user_id
      ${whereClause}
      ORDER BY a.timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, pageSize, offset]); // Combine search params with limit/offset

    res.json({
      data: result.rows,
      total,
      page: pageNum,
      per_page: pageSize,
      total_pages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
});


router.get('/dashboard/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Get first day of current month in Africa/Lagos timezone
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setMonth(firstDayOfMonth.getMonth(), 1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    const firstDayStr = firstDayOfMonth.toISOString();

    // 1. Get This Month's Count AND Amount using Africa/Lagos timezone
    // Filter by current month for monthly reset behavior
    const monthStats = await pool.query(`
      SELECT
        COUNT(*) as count,
        SUM(COALESCE(amount, 0)) as amount
      FROM tickets
      WHERE event_date >= $1
    `, [firstDayStr]);

    // 2. Get Today's Count AND Today's Amount using Africa/Lagos timezone
    const todayStats = await pool.query(`
      SELECT
        COUNT(*) as count,
        SUM(COALESCE(amount, 0)) as amount
      FROM tickets
      WHERE DATE(event_date AT TIME ZONE 'Africa/Lagos') = (NOW() AT TIME ZONE 'Africa/Lagos')::DATE
    `);

    // 3. Get Overall Totals (for all time reference)
    const employees = await pool.query(`SELECT COUNT(*) FROM users`);
    const tickets = await pool.query(`SELECT COUNT(*) FROM tickets`);
    const totalAmountResult = await pool.query(`SELECT SUM(COALESCE(amount, 0)) as total FROM tickets`);

    // 4. Send a flat response
    res.json({
      total_employees: Number(employees.rows[0].count),
      total_tickets: Number(monthStats.rows[0].count),
      month_meals: Number(monthStats.rows[0].count),
      month_amount: Number(monthStats.rows[0].amount || 0),
      today_meals: Number(todayStats.rows[0].count),
      today_amount: Number(todayStats.rows[0].amount || 0),
      total_tickets_all_time: Number(tickets.rows[0].count),
      total_amount_all_time: Number(totalAmountResult.rows[0].total || 0)
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Dashboard error' });
  }
});
//
// =====================================================
// REPORTS
// =====================================================
//

router.get('/reports/summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, zk_user_id } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (zk_user_id && zk_user_id !== 'all') {
      whereClause += ` AND t.zk_user_id = $${paramIndex}`;
      params.push(zk_user_id);
      paramIndex++;
    }

    // Convert event_date (stored as UTC TIMESTAMPTZ) to Africa/Lagos for date comparison
    if (start_date) {
      whereClause += ` AND DATE(t.event_date AT TIME ZONE 'Africa/Lagos') >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereClause += ` AND DATE(t.event_date AT TIME ZONE 'Africa/Lagos') <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    // 1. Overall stats
    const statsQuery = `
      SELECT
        COUNT(*) as total_meals,
        SUM(COALESCE(t.amount, 0))::INTEGER as total_amount
      FROM tickets t
      ${whereClause}
    `;
    const statsResult = await pool.query(statsQuery, params);

    // 2. Distribution by position
    const positionQuery = `
      SELECT
        COALESCE(u.position, 'Staff') as name,
        COUNT(*) as count,
        SUM(COALESCE(t.amount, 0))::INTEGER as amount
      FROM tickets t
      LEFT JOIN users u ON t.zk_user_id = u.zk_user_id
      ${whereClause}
      GROUP BY COALESCE(u.position, 'Staff')
    `;
    const positionResult = await pool.query(positionQuery, params);

    // 3. Daily trends - convert to Africa/Lagos timezone
    const dailyQuery = `
      SELECT
        DATE(t.event_date AT TIME ZONE 'Africa/Lagos') as date,
        COUNT(*) as count,
        SUM(COALESCE(t.amount, 0))::INTEGER as amount
      FROM tickets t
      ${whereClause}
      GROUP BY DATE(t.event_date AT TIME ZONE 'Africa/Lagos')
      ORDER BY date ASC
    `;
    const dailyResult = await pool.query(dailyQuery, params);

    res.json({
      summary: statsResult.rows[0],
      positionData: positionResult.rows,
      dailyData: dailyResult.rows,
    });
  } catch (error) {
    console.error('Report summary error:', error);
    res.status(500).json({ message: 'Error generating report summary' });
  }
});
//
// =====================================================
// TICKETS
// =====================================================
//

router.get('/tickets', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      per_page = 10000,
      start_date,
      end_date,
      zk_user_id,
      search,
      department,
      date,
    } = req.query as Record<string, string | undefined>;

    // Defensive: reject the literal strings "undefined" / "null" / ""
    const clean = (v?: string) =>
      v && v !== 'undefined' && v !== 'null' && v.trim() !== '' ? v : undefined;

    const pageNum = Number(page) || 1;
    const pageSize = Number(per_page) || 10000;
    const offset = (pageNum - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    const zkUserId   = clean(zk_user_id);
    const dept       = clean(department);
    const searchTerm = clean(search);
    const dayFilter  = clean(date);
    const startDate  = clean(start_date);
    const endDate    = clean(end_date);

    if (zkUserId && zkUserId !== 'all') {
      whereClause += ` AND t.zk_user_id = $${paramIndex}`;
      params.push(zkUserId);
      paramIndex++;
    }

    if (dept && dept !== 'all') {
      whereClause += ` AND t.department = $${paramIndex}`;
      params.push(dept);
      paramIndex++;
    }

    if (searchTerm) {
      whereClause += ` AND (
        t.ticket_number ILIKE $${paramIndex}
        OR t.zk_user_id  ILIKE $${paramIndex}
        OR t.name        ILIKE $${paramIndex}
      )`;
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    if (dayFilter) {
      whereClause += ` AND DATE(t.event_date AT TIME ZONE 'Africa/Lagos') = $${paramIndex}`;
      params.push(dayFilter);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND DATE(t.event_date AT TIME ZONE 'Africa/Lagos') >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    if (endDate) {
      whereClause += ` AND DATE(t.event_date AT TIME ZONE 'Africa/Lagos') <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tickets t ${whereClause}`,
      params
    );
    const total = Number(countResult.rows[0].count);

    params.push(pageSize, offset);

    const result = await pool.query(
      `
      SELECT
        t.id,
        t.ticket_number,
        t.zk_user_id,
        t.event_name,
        t.event_date,
        t.printed_at,
        t.name,
        t.department,
        t.amount,
        u.position AS position,
        (t.event_date AT TIME ZONE 'Africa/Lagos')::DATE as event_date_local,
        TO_CHAR(t.printed_at AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') as printed_date,
        TO_CHAR(t.printed_at AT TIME ZONE 'Africa/Lagos', 'HH24:MI:SS') as printed_time
      FROM tickets t
      LEFT JOIN users u ON u.zk_user_id = t.zk_user_id
      ${whereClause}
      ORDER BY t.event_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      params
    );

    res.json({
      data: result.rows,
      total,
      page: pageNum,
      per_page: pageSize,
      total_pages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: 'Error fetching tickets' });
  }
});;

export default router;
