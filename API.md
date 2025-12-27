# AEGIS Rights Broker - API Documentation

Base URL: `http://localhost:3000/api`

## Authentication
Currently, the API uses simple User ID-based authentication. In production, implement JWT or OAuth.

---

## Verification Endpoints

### Initiate Verification
Generate a verification token for a social media link.

**Endpoint:** `POST /api/verify/initiate`

**Request Body:**
```json
{
  "userId": "string",
  "sourceUrl": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contentId": "string",
    "token": "AEGIS-XXXX",
    "platform": "Instagram",
    "message": "Please add the token to your Instagram bio"
  }
}
```

**Supported Platforms:**
- Instagram
- YouTube
- TikTok
- Twitter
- Facebook

---

### Complete Verification
Verify ownership by checking if token exists in bio.

**Endpoint:** `POST /api/verify/complete`

**Request Body:**
```json
{
  "contentId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contentLink": {
      "_id": "string",
      "status": "Active",
      "aiPriceSuggested": 50,
      "vaultPath": "string"
    },
    "message": "Content verified and added to marketplace!"
  }
}
```

**Error Cases:**
- Token not found in bio
- Content link not found
- Already verified

---

### Check Verification Status
Get the current status of a content verification.

**Endpoint:** `GET /api/verify/status/:contentId`

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "Pending|Active|Rejected",
    "verificationToken": "AEGIS-XXXX",
    "verifiedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Transaction Endpoints

### Purchase License
Purchase commercial usage rights (primary or resale).

**Endpoint:** `POST /api/transactions/purchase`

**Request Body:**
```json
{
  "buyerId": "string",
  "contentId": "string",
  "sellerId": "string (optional, for resale)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "licenseId": "LIC-XXXXXXXX",
    "purchasePrice": 100.00,
    "certificatePath": "string"
  }
}
```

**Payment Distribution:**
- **Primary Purchase:** 95% creator, 5% platform
- **Resale:** 85% seller, 10% original creator, 5% platform

---

### List for Resale
List a license for resale in the secondary market.

**Endpoint:** `POST /api/transactions/resale/list`

**Request Body:**
```json
{
  "licenseId": "string",
  "resalePrice": 150.00
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "licenseId": "string",
    "isForResale": true,
    "resalePrice": 150.00
  }
}
```

---

### Remove from Resale
Remove a license from the resale market.

**Endpoint:** `POST /api/transactions/resale/remove`

**Request Body:**
```json
{
  "licenseId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "licenseId": "string",
    "isForResale": false
  }
}
```

---

### Get Certificate
Retrieve a digital rights certificate.

**Endpoint:** `GET /api/transactions/certificate/:licenseId`

**Response:**
```json
{
  "success": true,
  "data": {
    "licenseId": "LIC-XXXXXXXX",
    "issuedAt": "2024-01-01T00:00:00.000Z",
    "purchasePrice": 100.00,
    "buyer": {
      "userId": "string",
      "username": "string",
      "email": "string"
    },
    "content": {
      "contentId": "string",
      "sourceUrl": "string",
      "platform": "Instagram",
      "metadata": {}
    },
    "rightsGranted": [
      "Commercial usage rights",
      "Distribution rights",
      "Display rights",
      "Resale rights (with 10% royalty)"
    ],
    "signature": "crypto-hash",
    "verificationUrl": "https://aegis.platform/verify/LIC-XXXXXXXX"
  }
}
```

---

## Marketplace Endpoints

### Browse Marketplace
Get all active content available for purchase.

**Endpoint:** `GET /api/marketplace`

**Query Parameters:**
- `platform` (optional): Instagram|YouTube|TikTok|Twitter|Facebook
- `minPrice` (optional): number
- `maxPrice` (optional): number
- `page` (optional): number (default: 1)
- `limit` (optional): number (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "contentLinks": [
      {
        "_id": "string",
        "sourceUrl": "string",
        "platform": "Instagram",
        "currentPrice": 100.00,
        "aiPriceSuggested": 100.00,
        "metadata": {
          "title": "string",
          "description": "string",
          "thumbnailUrl": "string"
        },
        "originalCreatorId": {
          "username": "string",
          "email": "string"
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

---

### View Resale Market
Get all licenses available for resale.

**Endpoint:** `GET /api/marketplace/resale`

**Query Parameters:**
- `page` (optional): number (default: 1)
- `limit` (optional): number (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "licenses": [
      {
        "_id": "string",
        "licenseId": "LIC-XXXXXXXX",
        "buyerId": {
          "username": "string",
          "email": "string"
        },
        "contentId": {
          "sourceUrl": "string",
          "platform": "Instagram",
          "metadata": {}
        },
        "purchasePrice": 100.00,
        "resalePrice": 150.00,
        "isForResale": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

---

### Get Content Details
Get detailed information about a specific content link.

**Endpoint:** `GET /api/marketplace/:contentId`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "sourceUrl": "string",
    "platform": "Instagram",
    "originalCreatorId": {
      "username": "string",
      "email": "string",
      "verifiedSocialHandles": []
    },
    "status": "Active",
    "currentPrice": 100.00,
    "aiPriceSuggested": 100.00,
    "vaultPath": "string",
    "metadata": {},
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## User Endpoints

### List Users
Get all users (admin only).

**Endpoint:** `GET /api/users`

**Query Parameters:**
- `role` (optional): Admin|Creator|Distributor|Consumer
- `status` (optional): Active|Frozen|Suspended
- `page` (optional): number
- `limit` (optional): number

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [],
    "pagination": {}
  }
}
```

---

### Create User
Register a new user.

**Endpoint:** `POST /api/users`

**Request Body:**
```json
{
  "email": "string",
  "username": "string",
  "role": "Creator|Consumer|Distributor (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "email": "string",
    "username": "string",
    "role": "Creator",
    "balance": 0,
    "status": "Active"
  }
}
```

---

### Get User
Get user details by ID.

**Endpoint:** `GET /api/users/:userId`

---

### Update User
Update user information (admin only).

**Endpoint:** `PUT /api/users/:userId`

**Request Body:**
```json
{
  "role": "string (optional)",
  "status": "string (optional)",
  "balance": "number (optional)"
}
```

---

### Delete User
Delete a user (admin only).

**Endpoint:** `DELETE /api/users/:userId`

---

### Get User's Licenses
Get all licenses owned by a user.

**Endpoint:** `GET /api/users/:userId/licenses`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "licenseId": "string",
      "contentId": {},
      "purchasePrice": 100.00,
      "isForResale": false,
      "purchasedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Get User's Content
Get all content created by a user.

**Endpoint:** `GET /api/users/:userId/content`

---

## Admin Endpoints

### List All Content
Get all content for moderation (admin only).

**Endpoint:** `GET /api/admin/content`

**Query Parameters:**
- `status` (optional): Pending|Active|TakenDown|Rejected
- `platform` (optional): platform name
- `page` (optional): number
- `limit` (optional): number

---

### Update Content Status
Approve, reject, or take down content (admin only).

**Endpoint:** `PUT /api/admin/content/:contentId/status`

**Request Body:**
```json
{
  "status": "Pending|Active|TakenDown|Rejected"
}
```

---

### Delete Content
Permanently delete content (admin only).

**Endpoint:** `DELETE /api/admin/content/:contentId`

---

### Get Platform Statistics
Get platform-wide statistics (admin only).

**Endpoint:** `GET /api/admin/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 100,
      "creators": 30
    },
    "content": {
      "total": 500,
      "active": 450
    },
    "licenses": {
      "total": 200
    },
    "revenue": {
      "totalVolume": 50000.00
    }
  }
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Currently not implemented. For production, implement rate limiting:
- 100 requests per 15 minutes per IP
- 1000 requests per hour per user

---

## Webhook Events (Future)

Future implementation will include webhooks for:
- `content.verified` - Content successfully verified
- `license.purchased` - New license purchased
- `license.resold` - License resold
- `royalty.paid` - Royalty payment to creator
- `content.taken_down` - Content removed by admin

---

## Data Models

### User
- `_id`: ObjectId
- `email`: String (unique)
- `username`: String (unique)
- `role`: Enum (Admin, Creator, Distributor, Consumer)
- `balance`: Number
- `verifiedSocialHandles`: Array
- `status`: Enum (Active, Frozen, Suspended)
- `createdAt`: Date

### ContentLink
- `_id`: ObjectId
- `sourceUrl`: String (unique)
- `platform`: Enum
- `originalCreatorId`: ObjectId (ref: User)
- `status`: Enum (Pending, Active, TakenDown, Rejected)
- `verificationToken`: String (unique)
- `currentPrice`: Number
- `aiPriceSuggested`: Number
- `vaultPath`: String
- `metadata`: Object
- `createdAt`: Date

### LicenseRecord
- `_id`: ObjectId
- `licenseId`: String (unique)
- `buyerId`: ObjectId (ref: User)
- `contentId`: ObjectId (ref: ContentLink)
- `purchasePrice`: Number
- `royaltyPercentage`: Number (default: 10)
- `isForResale`: Boolean
- `resalePrice`: Number
- `certificatePath`: String
- `transactionHistory`: Array
- `purchasedAt`: Date

---

## Testing Examples

See SETUP.md for cURL examples and testing workflows.
