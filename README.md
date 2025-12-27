# 🛡️ AEGIS Rights Broker

> The first zero-hosting marketplace where creators sell commercial usage rights to their social media content. No middlemen. Pure ledger economics.

## 🎯 Overview

AEGIS is a revolutionary **Link-to-Ledger** marketplace that allows content creators to monetize their social media posts by selling commercial usage rights. Built with Node.js, MongoDB, and Vanilla JavaScript, it implements a zero-trust architecture with automated royalty distribution.

## ✨ Key Features

### 🔐 Challenge-Response Verification
- Unique token generation (e.g., `AEGIS-X9F2`)
- Bio-based verification (not just post-based)
- Automated scraping with axios and cheerio
- Prevents fraud and ensures account ownership

### 🗃️ Snapshot Vault
- Encrypted backup of verified content
- Prevents "link rot" - content persists even if original is deleted
- Master copies stored for buyers
- Dynamic watermarking with buyer information

### 💰 Automated Royalty System
**Primary Purchase:**
- 95% to Creator
- 5% to Platform

**Secondary Resale:**
- 85% to Seller
- 10% to Original Creator (passive royalty)
- 5% to Platform

All transactions are atomic using MongoDB transactions.

### 📜 Digital Certificates
- PDF certificates with cryptographic signatures
- JSON exports with verification URLs
- Anti-piracy watermarking
- Downloadable rights documentation

### ♻️ Resale Marketplace
- Buyers can resell licenses
- Automatic royalty distribution
- Original creators earn perpetually
- Transparent transaction history

## 🚀 Quick Start

### Prerequisites
- Node.js 14+
- MongoDB 4+
- npm or yarn

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/muhammadmusammil01-byte/Aegis.git
cd Aegis
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and other settings
```

4. **Start MongoDB:**
```bash
# Make sure MongoDB is running
mongod
```

5. **Start the server:**
```bash
npm start
# or for development with auto-reload:
npm run dev
```

6. **Access the application:**
```
http://localhost:3000
```

## 📁 Project Structure

```
Aegis/
├── models/              # Mongoose schemas
│   ├── User.js         # User model with roles
│   ├── ContentLink.js  # Content links with verification
│   └── LicenseRecord.js # License and transactions
├── routes/             # Express API routes
│   ├── verification.js # Verification endpoints
│   ├── transactions.js # Purchase and resale
│   ├── marketplace.js  # Public marketplace
│   ├── users.js        # User management
│   └── admin.js        # Admin operations
├── services/           # Business logic
│   ├── verificationService.js  # Token generation & verification
│   ├── transactionService.js   # Payment processing
│   └── certificateService.js   # Certificate generation
├── public/             # Frontend assets
│   ├── css/
│   │   └── style.css   # Bold minimalism styling
│   ├── js/
│   │   ├── marketplace.js
│   │   ├── creator-verify.js
│   │   ├── consumer-rights.js
│   │   ├── admin-users.js
│   │   └── admin-links.js
│   ├── index.html      # Landing page
│   ├── marketplace.html # Browse content
│   ├── creator-verify.html # Submit & verify
│   ├── consumer-rights.html # User dashboard
│   ├── admin-users.html # User management
│   └── admin-links.html # Content moderation
├── vault/              # Encrypted content storage
├── server.js           # Express server
├── package.json        # Dependencies
└── .env.example        # Environment template
```

## 🔄 Complete Workflow

### 1. **Ingestion**
Creator pastes a social media link. Backend generates a unique verification token.

### 2. **Verification**
Creator adds token to their social bio. AEGIS scraper confirms it exists.

### 3. **Vaulting**
System downloads a master copy to encrypted storage, preventing link rot.

### 4. **Licensing**
Consumer purchases rights. System issues a signed Digital Rights Certificate.

### 5. **Passive Income**
Consumer resells the license. 10% automatically goes back to original creator.

## 🎨 Frontend Pages

| Page | Purpose |
|------|---------|
| **index.html** | Landing page explaining the Link-to-Ledger model |
| **marketplace.html** | Browse active content with live embeds |
| **creator-verify.html** | Submit links and complete verification |
| **consumer-rights.html** | View purchased licenses and manage resales |
| **admin-users.html** | User management and role elevation |
| **admin-links.html** | Content moderation and takedowns |

## 🔌 API Endpoints

### Verification
- `POST /api/verify/initiate` - Generate verification token
- `POST /api/verify/complete` - Complete verification
- `GET /api/verify/status/:contentId` - Check status

### Transactions
- `POST /api/transactions/purchase` - Purchase license
- `POST /api/transactions/resale/list` - List for resale
- `POST /api/transactions/resale/remove` - Remove from resale
- `GET /api/transactions/certificate/:licenseId` - Get certificate

### Marketplace
- `GET /api/marketplace` - Browse active content
- `GET /api/marketplace/resale` - View resale market
- `GET /api/marketplace/:contentId` - Content details

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:userId` - Update user
- `GET /api/users/:userId/licenses` - User's licenses
- `GET /api/users/:userId/content` - User's content

### Admin
- `GET /api/admin/content` - List all content
- `PUT /api/admin/content/:contentId/status` - Update status
- `DELETE /api/admin/content/:contentId` - Delete content
- `GET /api/admin/stats` - Platform statistics

## 🛡️ Built-In Protections

### Link Rot Mitigation
If a social media post is deleted, buyers can download the archived master file from the Snapshot Vault, preserving the value of their investment.

### Fraud Prevention
Token must be in the account bio (not just a post), ensuring the creator owns the entire account, not just a stolen video.

### Anti-Piracy
Dynamic watermarking embeds buyer email and IP into downloaded files, deterring unauthorized distribution.

## 🎨 Design Philosophy

**Bold Minimalism**
- High-contrast typography
- Dark mode by default
- Clean SaaS-style cards
- Zero visual clutter
- Performance-first approach

## 🔧 Configuration

### Environment Variables (.env)
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/aegis
NODE_ENV=development
VAULT_PATH=./vault
ADMIN_SECRET=your_admin_secret_here
JWT_SECRET=your_jwt_secret_here
```

## 🏗️ Technology Stack

- **Backend:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Scraping:** Axios + Cheerio
- **PDF Generation:** PDFKit
- **Frontend:** Vanilla JavaScript + CSS
- **Architecture:** RESTful API

## 📝 User Roles

- **Admin:** Full system control, user management, content moderation
- **Creator:** Submit and verify content, earn from sales and royalties
- **Distributor:** Advanced resale privileges (future feature)
- **Consumer:** Purchase licenses, resell rights

## 🔒 Security Features

- Cryptographically signed certificates
- Atomic MongoDB transactions
- Token-based ownership verification
- Watermarked content downloads
- Encrypted vault storage
- Role-based access control

## 🚧 Future Enhancements

- [ ] OAuth integration for social platforms
- [ ] AI-powered price optimization
- [ ] Blockchain verification layer
- [ ] Multi-currency support
- [ ] Advanced analytics dashboard
- [ ] Automated DMCA takedown integration

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 💬 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ for creators everywhere**
