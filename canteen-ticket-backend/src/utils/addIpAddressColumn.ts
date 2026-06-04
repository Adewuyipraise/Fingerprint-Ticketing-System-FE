import pool from '../config/database.js';

const addIpAddressColumn = async () => {
  try {
    console.log('Checking audit_logs table for ip_address column...');
    
    // Check if column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs' AND column_name = 'ip_address'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('ip_address column not found, adding it...');
      await pool.query(`
        ALTER TABLE audit_logs 
        ADD COLUMN ip_address VARCHAR(45)
      `);
      console.log('✓ ip_address column added to audit_logs table');
    } else {
      console.log('✓ ip_address column already exists');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to add ip_address column:', error);
    process.exit(1);
  }
};

addIpAddressColumn();