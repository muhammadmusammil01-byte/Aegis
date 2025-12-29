/**
 * PostgreSQL Database Configuration
 */

const { Pool } = require('pg');

// Connection pool configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nexushub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Event handlers
pool.on('connect', () => {
  console.log('✓ New database connection established');
});

pool.on('error', (err) => {
  console.error('✗ Unexpected database error:', err);
});

// Database operations
const db = {
  /**
   * Execute a query
   * @param {string} text - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise} Query result
   */
  query: async (text, params) => {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Query executed:', { text, duration: `${duration}ms`, rows: result.rowCount });
      }
      
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  /**
   * Get a client from the pool for transactions
   * @returns {Promise} Database client
   */
  getClient: async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Set timeout for transactions
    const timeout = setTimeout(() => {
      console.error('Client checkout timeout');
    }, 5000);
    
    // Monkey patch to track query execution
    client.query = (...args) => {
      client.lastQuery = args;
      return query.apply(client, args);
    };
    
    // Monkey patch release to clear timeout
    client.release = () => {
      clearTimeout(timeout);
      client.query = query;
      client.release = release;
      return release.apply(client);
    };
    
    return client;
  },

  /**
   * Connect to database
   * @returns {Promise} Connection result
   */
  connect: async () => {
    try {
      const client = await pool.connect();
      console.log('✓ PostgreSQL connection pool initialized');
      client.release();
      return true;
    } catch (error) {
      console.error('✗ PostgreSQL connection failed:', error.message);
      throw error;
    }
  },

  /**
   * Disconnect from database
   * @returns {Promise} Disconnection result
   */
  disconnect: async () => {
    try {
      await pool.end();
      console.log('✓ PostgreSQL connection pool closed');
      return true;
    } catch (error) {
      console.error('✗ Error closing PostgreSQL pool:', error.message);
      throw error;
    }
  },

  /**
   * Check database health
   * @returns {Promise<boolean>} Health status
   */
  checkHealth: async () => {
    try {
      const result = await pool.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
};

module.exports = db;
