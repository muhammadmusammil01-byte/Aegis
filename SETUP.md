# AEGIS Rights Broker - Setup Guide

## Prerequisites Installation

### 1. Install Node.js
- Download from: https://nodejs.org/
- Recommended version: 18.x or higher
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

### 2. Install MongoDB
- **Windows/Mac**: Download from https://www.mongodb.com/try/download/community
- **Linux**: 
  ```bash
  sudo apt-get install mongodb
  ```
- Verify installation:
  ```bash
  mongod --version
  ```

## Project Setup

### Step 1: Clone and Install
```bash
# Clone the repository
git clone https://github.com/muhammadmusammil01-byte/Aegis.git
cd Aegis

# Install dependencies
npm install
```

### Step 2: Configure Environment
```bash
# Copy the environment template
cp .env.example .env

# Edit .env file with your settings
nano .env  # or use any text editor
```

**Required Environment Variables:**
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/aegis
NODE_ENV=development
VAULT_PATH=./vault
```

### Step 3: Start MongoDB
```bash
# In a new terminal, start MongoDB
mongod

# Or on Linux with systemd:
sudo systemctl start mongodb
```

### Step 4: Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### Step 5: Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```

## Quick Demo Workflow

### 1. Create an Admin User
```bash
# Use MongoDB shell
mongosh aegis

# Create admin user
db.users.insertOne({
  email: "admin@aegis.com",
  username: "admin",
  role: "Admin",
  balance: 10000,
  status: "Active",
  verifiedSocialHandles: [],
  createdAt: new Date()
})
```

### 2. Create a Test Creator
Visit: http://localhost:3000/creator-verify.html
- Click "Create one here"
- Enter username and email
- Save the User ID

### 3. Submit Content for Verification
- Paste a social media URL (Instagram, YouTube, TikTok, etc.)
- Copy the generated AEGIS token
- Add token to your social media bio
- Click "Verify Now"

### 4. Browse Marketplace
Visit: http://localhost:3000/marketplace.html
- View verified content
- Filter by platform or price
- Purchase licenses

### 5. Manage Rights
Visit: http://localhost:3000/consumer-rights.html
- View purchased licenses
- List licenses for resale
- Download certificates

### 6. Admin Dashboard
Visit: http://localhost:3000/admin-users.html
- Manage users and roles
- View platform statistics
- Moderate content

## Testing the Royalty System

### Primary Purchase Flow
1. Creator submits and verifies content (Price: $100)
2. Consumer A purchases → Creator gets $95, Platform gets $5
3. Consumer A receives license certificate

### Secondary Resale Flow
1. Consumer A lists license for resale at $150
2. Consumer B purchases the resale
3. Distribution:
   - Consumer A (seller): $127.50 (85%)
   - Original Creator: $15 (10% royalty)
   - Platform: $7.50 (5%)

## API Testing with cURL

### Create User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "creator@example.com",
    "username": "creator1",
    "role": "Creator"
  }'
```

### Initiate Verification
```bash
curl -X POST http://localhost:3000/api/verify/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "sourceUrl": "https://instagram.com/p/example"
  }'
```

### Complete Verification
```bash
curl -X POST http://localhost:3000/api/verify/complete \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "CONTENT_ID_HERE"
  }'
```

### Purchase License
```bash
curl -X POST http://localhost:3000/api/transactions/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "buyerId": "BUYER_USER_ID",
    "contentId": "CONTENT_ID_HERE"
  }'
```

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Make sure MongoDB is running
```bash
mongod
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution:** Change PORT in .env or kill the process using port 3000
```bash
# Find process
lsof -i :3000
# Kill process
kill -9 PID
```

### Module Not Found
```
Error: Cannot find module 'express'
```
**Solution:** Reinstall dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Verification Fails
**Possible causes:**
- Token not added to bio (must be in account bio, not post)
- URL blocked by platform
- Network timeout

**Solution:** 
- Ensure token is in profile bio
- Wait 30 seconds after adding token
- Check server logs for detailed error

## Production Deployment

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name aegis

# View logs
pm2 logs aegis

# Restart
pm2 restart aegis
```

### Using Docker
```bash
# Build image
docker build -t aegis-rights-broker .

# Run container
docker run -d -p 3000:3000 \
  -e MONGODB_URI=mongodb://mongo:27017/aegis \
  aegis-rights-broker
```

## Security Considerations

1. **Change default secrets** in .env for production
2. **Use HTTPS** in production
3. **Set up MongoDB authentication**
4. **Implement rate limiting** for API endpoints
5. **Regular backups** of vault directory
6. **Monitor** transaction logs for anomalies

## Support & Resources

- **Documentation:** README.md
- **API Reference:** See routes/ directory
- **Issues:** GitHub Issues
- **Architecture:** See problem statement in repository

## License

MIT License - See LICENSE file for details
