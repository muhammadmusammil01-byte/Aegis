/**
 * JWT Configuration
 */

module.exports = {
  secret: process.env.JWT_SECRET || 'nexushub_jwt_secret_change_in_production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Token options
  options: {
    issuer: 'NexusHub',
    audience: 'nexushub-users'
  }
};
