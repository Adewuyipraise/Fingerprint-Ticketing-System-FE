import pool from '../config/database.js';

type AuditParams = {
  zk_user_id: string;
  user_name?: string;
  user_role?: string;
  action: string;
  entity: string;
  entity_id?: string;
  details?: string;
  ip_address?:string;
};

export const withAudit = async (
  audit: AuditParams,
  dbOperation: () => Promise<any>
) => {
  try {
    // 1. Run main DB operation first
    const result = await dbOperation();

    // 2. Write audit log AFTER success
    // Try with ip_address first, fall back to without if column doesn't exist
    try {
      await pool.query(
        `INSERT INTO audit_logs 
         (zk_user_id, user_name, user_role, action, entity, entity_id, details, ip_address, timestamp) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          audit.zk_user_id,
          audit.user_name || 'System', 
          audit.user_role || 'Admin',  
          audit.action,
          audit.entity,
          audit.entity_id || null,
          audit.details || null,
          audit.ip_address || '127.0.0.1', // Default IP for system actions
        ]
      );
    } catch (auditError) {
      // If ip_address column doesn't exist, insert without it
      await pool.query(
        `INSERT INTO audit_logs 
         (zk_user_id, action, entity, entity_id, details, timestamp) 
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          audit.zk_user_id,
          audit.action,
          audit.entity,
          audit.entity_id || null,
          audit.details || null,
        ]
      );
    }

    return result;
  } catch (err) {
    console.error('Operation failed:', err);
    throw err;
  }
};
