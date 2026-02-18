# CostShield Cloud - Comprehensive Requirements & Research Document

## Executive Summary

This document provides exhaustive research and requirements for building **CostShield Cloud**, a production-ready OpenAI proxy SaaS that enforces budget limits between AI agents (OpenClaw) and the OpenAI API. This research aims to anticipate and address all potential issues before development begins.

### Key Findings Summary

- **Architecture**: Shared database with shared schema recommended for initial deployment
- **Security**: Multi-layered approach with encryption at rest, HTTPS, API key encryption (AES-256)
- **Rate Limiting**: Redis-based distributed rate limiting with token bucket algorithm
- **Budget Enforcement**: Database transactions with row-level locking to prevent race conditions
- **Authentication**: JWT with refresh tokens, stored in HTTP-only cookies
- **Token Counting**: tiktoken library for accurate OpenAI token counting
- **Deployment**: Railway or Render recommended for initial MVP
- **Payment**: Stripe with webhook verification for subscription management

---

## Table of Contents

1. [Multi-Tenant SaaS Architecture](#1-multi-tenant-saas-architecture)
2. [API Key Security & Encryption](#2-api-key-security--encryption)
3. [OpenAI API Proxy Implementation](#3-openai-api-proxy-implementation)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Database Schema Design](#5-database-schema-design)
6. [Rate Limiting Strategies](#6-rate-limiting-strategies)
7. [Cost Calculation & Token Counting](#7-cost-calculation--token-counting)
8. [Budget Enforcement](#8-budget-enforcement)
9. [Error Handling & Resilience](#9-error-handling--resilience)
10. [Security Considerations](#10-security-considerations)
11. [Monitoring & Logging](#11-monitoring--logging)
12. [Payment Processing](#12-payment-processing)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [API Versioning](#14-api-versioning)
15. [Common Pitfalls & Mitigation](#15-common-pitfalls--mitigation)
16. [Testing Strategy](#16-testing-strategy)
17. [Deployment Checklist](#17-deployment-checklist)

---

## 1. Multi-Tenant SaaS Architecture

### Overview
Multi-tenancy allows a single application instance to serve multiple customers (tenants) while maintaining data isolation and customization.

### Database Isolation Models

#### 1.1 Shared Database, Shared Schema (RECOMMENDED)
**Description**: All tenants share the same database and tables, with a `tenant_id` or `user_id` column for data separation.

**Advantages**:
- Simplest and most cost-effective
- Easiest maintenance (single database to backup, monitor, update)
- Simplified schema management
- Highest tenant density (lowest cost per tenant)

**Disadvantages**:
- Risk of data leaks if queries not properly filtered
- Potential "noisy neighbor" problems
- Less isolation for compliance requirements
- Management operations more complex at scale

**Recommendation**: Use for initial MVP and scale until hitting 10,000+ users or compliance requirements necessitate change.

#### 1.2 Shared Database, Separate Schemas
**Description**: Single database with tenant-specific schemas.

**Advantages**:
- Better logical separation
- Lower risk of data leaks
- Still cost-effective

**Disadvantages**:
- Schema migrations become complex (must apply to all schemas)
- Database object limits
- Backup/restore complexity
- **Expert consensus: AVOID** - complexity comparable to separate databases without sufficient isolation

**Recommendation**: Generally avoid unless specific regulatory requirements demand it.

#### 1.3 Database-per-Tenant
**Description**: Each tenant has completely separate database.

**Advantages**:
- Maximum isolation
- Easier customization per tenant
- No noisy neighbor problems
- Simpler compliance
- Easier scaling per tenant

**Disadvantages**:
- Highest operational complexity
- Most expensive
- Schema migrations across all databases
- Connection management complexity

**Recommendation**: Only for enterprise customers with specific isolation/compliance needs.

### Tenant Identification Methods

#### 1.1 Subdomain-Based (e.g., user123.costshield.dev)
**Advantages**:
- Strong sense of separation
- Easy DNS-based routing
- Professional appearance
- Custom domain mapping possible

**Disadvantages**:
- Requires wildcard DNS and SSL certificates
- More complex initial setup

**Recommendation**: Consider for future enhancement, not MVP.

#### 1.2 Path-Based (e.g., costshield.dev/api/v1/proxy)
**Advantages**:
- Simple implementation
- No DNS configuration needed
- Single domain

**Disadvantages**:
- Less customization
- Harder to isolate logs

**Recommendation**: ✅ **Use for MVP**

#### 1.3 Header-Based (e.g., X-API-Key)
**Advantages**:
- Clean URLs
- Flexible for API clients
- Better security controls

**Disadvantages**:
- Not browser-friendly
- Client must explicitly send identifier

**Recommendation**: ✅ **Use for API authentication**

### Implementation Strategy

```
┌─────────────────────────────────────────┐
│         CostShield Cloud                │
├─────────────────────────────────────────┤
│  Authentication Layer (JWT)             │
│  ├─ User signup/login                   │
│  └─ API key management                  │
├─────────────────────────────────────────┤
│  Tenant Context Middleware              │
│  ├─ Extract user from JWT               │
│  └─ Inject into request context         │
├─────────────────────────────────────────┤
│  Budget Enforcement Layer               │
│  ├─ Check available budget              │
│  ├─ Pre-authorization hold              │
│  └─ Post-completion adjustment          │
├─────────────────────────────────────────┤
│  OpenAI Proxy Layer                     │
│  ├─ Decrypt user's OpenAI key           │
│  ├─ Forward request with streaming      │
│  └─ Token counting                      │
├─────────────────────────────────────────┤
│  Database Layer                         │
│  ├─ users (id, email, password_hash)    │
│  ├─ api_keys (user_id, encrypted_key)   │
│  ├─ budgets (user_id, limit, used)      │
│  └─ requests (user_id, tokens, cost)    │
└─────────────────────────────────────────┘
```

---

## 2. API Key Security & Encryption

### 2.1 Storage Best Practices

**CRITICAL**: Never store API keys in plaintext.

#### Encryption Strategy
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: scrypt or Argon2 for deriving encryption keys from master secret
- **Storage**: Encrypted API keys in database, master encryption key in environment variable or KMS

#### Implementation Example (Node.js)

```javascript
const crypto = require('crypto');

class APIKeyEncryption {
  constructor(masterKey) {
    // Master key should be 32 bytes for AES-256
    this.masterKey = Buffer.from(masterKey, 'hex');
  }

  encrypt(apiKey) {
    // Generate random IV (12 bytes for GCM)
    const iv = crypto.randomBytes(12);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    
    // Encrypt
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Return IV + authTag + encrypted (all hex encoded)
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedData) {
    // Split the stored data
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### 2.2 Key Management Options

#### Option 1: Environment Variables (Simple, MVP)
**Setup**:
```bash
ENCRYPTION_MASTER_KEY=<64-character-hex-string>
```

**Pros**: Simple, no external dependencies
**Cons**: Not suitable for key rotation, limited audit trail

#### Option 2: AWS Secrets Manager (Production)
**Pros**: 
- Automatic rotation
- Audit logging
- Access control
- Multi-region replication

**Cons**: Additional cost (~$0.40/secret/month + API calls)

#### Option 3: HashiCorp Vault (Enterprise)
**Pros**:
- Self-hosted option
- Dynamic secrets
- Comprehensive audit log
- Fine-grained access control

**Cons**: Operational complexity, infrastructure overhead

**Recommendation**: 
- MVP: Environment variables with manual rotation procedure
- Production: AWS Secrets Manager or similar KMS

### 2.3 Security Checklist

- [ ] API keys encrypted at rest (AES-256-GCM)
- [ ] Master encryption key stored securely (env var/KMS)
- [ ] API keys only decrypted in memory for duration of request
- [ ] No API keys logged or cached
- [ ] Key rotation procedure documented
- [ ] Access to decrypted keys limited to proxy service
- [ ] Encryption keys never committed to Git
- [ ] Regular security audits scheduled

---

## 3. OpenAI API Proxy Implementation

### 3.1 Core Requirements

The proxy must:
1. Accept requests in OpenAI API format
2. Add user's OpenAI API key from database
3. Forward request to OpenAI with streaming support
4. Stream response back to client
5. Count tokens accurately
6. Calculate costs
7. Update user budget in real-time

### 3.2 Streaming Implementation

#### Server-Sent Events (SSE) Pattern

```javascript
app.post('/v1/chat/completions', async (req, res) => {
  try {
    // 1. Authenticate and get user
    const user = await authenticateRequest(req);
    
    // 2. Check budget
    const availableBudget = await checkBudget(user.id);
    if (availableBudget <= 0) {
      return res.status(429).json({ error: 'Budget exceeded' });
    }
    
    // 3. Decrypt user's OpenAI API key
    const openaiKey = await decryptAPIKey(user.encrypted_openai_key);
    
    // 4. Setup streaming response
    if (req.body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
    }
    
    // 5. Forward to OpenAI
    const openai = new OpenAI({ apiKey: openaiKey });
    const stream = await openai.chat.completions.create({
      ...req.body,
      stream: true
    });
    
    // 6. Track tokens for billing
    let inputTokens = 0;
    let outputTokens = 0;
    
    // 7. Stream response and count tokens
    for await (const chunk of stream) {
      // Forward chunk to client
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      
      // Count tokens
      if (chunk.usage) {
        inputTokens += chunk.usage.prompt_tokens || 0;
        outputTokens += chunk.usage.completion_tokens || 0;
      }
    }
    
    // 8. End stream
    res.write('data: [DONE]\n\n');
    res.end();
    
    // 9. Calculate cost and update budget (async)
    const cost = calculateCost(req.body.model, inputTokens, outputTokens);
    await updateBudget(user.id, cost);
    await logRequest(user.id, req.body.model, inputTokens, outputTokens, cost);
    
  } catch (error) {
    console.error('Proxy error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy error' });
    }
  }
});
```

### 3.3 Handling Different Response Types

#### Streaming Response
- Set appropriate headers: `Content-Type: text/event-stream`
- Use `res.write()` for each chunk
- Don't buffer entire response
- Handle client disconnection gracefully

#### Non-Streaming Response
- Buffer complete response
- Parse `usage` object for token counts
- Return full response to client

### 3.4 Error Handling

```javascript
async function proxyRequest(req, res) {
  const controller = new AbortController();
  
  // Handle client disconnect
  req.on('close', () => {
    controller.abort();
  });
  
  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });
    
    // Handle OpenAI errors
    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      return res.status(openaiResponse.status).json(error);
    }
    
    // ... streaming logic
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request aborted by client');
      return;
    }
    throw error;
  }
}
```

### 3.5 Rate Limit Handling from OpenAI

```javascript
async function forwardWithRetry(openaiKey, requestBody, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create(requestBody);
      return response;
    } catch (error) {
      if (error.status === 429) {
        // Rate limit exceeded
        const retryAfter = error.headers?.['retry-after'] || Math.pow(2, attempt);
        await sleep(retryAfter * 1000);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 3.6 Timeout Handling

```javascript
const PROXY_TIMEOUT = 60000; // 60 seconds

app.post('/v1/chat/completions', async (req, res) => {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Gateway timeout' });
    }
  }, PROXY_TIMEOUT);
  
  try {
    // ... proxy logic
  } finally {
    clearTimeout(timeoutId);
  }
});
```

---

## 4. Authentication & Authorization

### 4.1 Authentication Strategy: JWT + Refresh Tokens

**Why JWT over Sessions**:
- Stateless (scales horizontally)
- Works well with mobile/API clients
- No session store required (though we'll use one for refresh tokens)

**Why Refresh Tokens**:
- Short-lived access tokens (15 minutes)
- Longer-lived refresh tokens (7 days)
- Ability to revoke access

### 4.2 Token Flow

```
┌─────────┐                                              ┌─────────┐
│  Client │                                              │  Server │
└────┬────┘                                              └────┬────┘
     │                                                        │
     │ POST /api/auth/login                                  │
     │ { email, password }                                   │
     ├───────────────────────────────────────────────────────>│
     │                                                        │
     │          1. Validate credentials                      │
     │          2. Generate access token (15min)             │
     │          3. Generate refresh token (7 days)           │
     │          4. Store refresh token in DB                 │
     │                                                        │
     │ { accessToken, refreshToken }                         │
     │<───────────────────────────────────────────────────────┤
     │ Store in httpOnly cookie                              │
     │                                                        │
     │ Subsequent requests with Authorization header         │
     ├───────────────────────────────────────────────────────>│
     │                                                        │
     │ Access token expires                                  │
     │ POST /api/auth/refresh                                │
     │ { refreshToken }                                      │
     ├───────────────────────────────────────────────────────>│
     │                                                        │
     │          1. Validate refresh token                    │
     │          2. Check DB (not revoked)                    │
     │          3. Generate new access token                 │
     │          4. Rotate refresh token (optional)           │
     │                                                        │
     │ { accessToken, refreshToken }                         │
     │<───────────────────────────────────────────────────────┤
```

### 4.3 Implementation

```javascript
// JWT config
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const JWT_SECRET = process.env.JWT_SECRET;

// Generate tokens
function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  
  const refreshToken = jwt.sign(
    { userId, type: 'refresh', jti: uuidv4() }, // jti = unique token ID
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  
  return { accessToken, refreshToken };
}

// Store refresh token in DB
async function storeRefreshToken(userId, tokenId, expiresAt) {
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_id, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenId, expiresAt]
  );
}

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  // 1. Validate credentials
  const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // 2. Generate tokens
  const { accessToken, refreshToken } = generateTokens(user.id);
  const decoded = jwt.decode(refreshToken);
  
  // 3. Store refresh token
  await storeRefreshToken(user.id, decoded.jti, new Date(decoded.exp * 1000));
  
  // 4. Set httpOnly cookies
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  
  res.json({ accessToken, user: { id: user.id, email: user.email } });
});

// Refresh token endpoint
app.post('/api/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }
  
  try {
    // 1. Verify token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    
    // 2. Check if token exists in DB (not revoked)
    const storedToken = await db.query(
      'SELECT * FROM refresh_tokens WHERE token_id = $1 AND user_id = $2',
      [decoded.jti, decoded.userId]
    );
    
    if (!storedToken) {
      return res.status(401).json({ error: 'Token revoked' });
    }
    
    // 3. Generate new access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, type: 'access' },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    
    // 4. Optional: Rotate refresh token
    // (Implement token family tracking to detect token reuse)
    
    res.json({ accessToken });
    
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (refreshToken) {
    const decoded = jwt.decode(refreshToken);
    // Delete refresh token from DB
    await db.query('DELETE FROM refresh_tokens WHERE token_id = $1', [decoded.jti]);
  }
  
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
});
```

### 4.4 Password Hashing: Argon2 vs Bcrypt

**Recommendation**: Use **Argon2id** for new applications.

```javascript
const argon2 = require('argon2');

// Hash password on signup
const hashedPassword = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4
});

// Verify password on login
const isValid = await argon2.verify(hashedPassword, password);
```

### 4.5 Email Verification Flow

```javascript
// Generate verification token
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  
  // 1. Hash password
  const hashedPassword = await argon2.hash(password);
  
  // 2. Generate verification token
  const verificationToken = generateVerificationToken();
  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  // 3. Create user
  const user = await db.query(
    `INSERT INTO users (email, password_hash, verification_token, token_expiry, verified) 
     VALUES ($1, $2, $3, $4, false) RETURNING id`,
    [email, hashedPassword, verificationToken, tokenExpiry]
  );
  
  // 4. Send verification email
  await sendVerificationEmail(email, verificationToken);
  
  res.status(201).json({ 
    message: 'User created. Please check your email to verify your account.' 
  });
});

// Email verification endpoint
app.get('/api/auth/verify/:token', async (req, res) => {
  const { token } = req.params;
  
  const user = await db.query(
    'SELECT * FROM users WHERE verification_token = $1 AND token_expiry > NOW()',
    [token]
  );
  
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
  
  await db.query(
    'UPDATE users SET verified = true, verification_token = NULL WHERE id = $1',
    [user.id]
  );
  
  res.json({ message: 'Email verified successfully' });
});
```

### 4.6 Password Reset Flow

```javascript
// Request password reset
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  
  if (!user) {
    // Don't reveal if email exists
    return res.json({ message: 'If email exists, reset link has been sent' });
  }
  
  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  
  await db.query(
    'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3',
    [hashedToken, tokenExpiry, user.id]
  );
  
  // Send email with reset link
  await sendPasswordResetEmail(email, resetToken);
  
  res.json({ message: 'If email exists, reset link has been sent' });
});

// Reset password
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const user = await db.query(
    'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
    [hashedToken]
  );
  
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
  
  const hashedPassword = await argon2.hash(newPassword);
  
  await db.query(
    'UPDATE users SET password_hash = $1, reset_token = NULL WHERE id = $2',
    [hashedPassword, user.id]
  );
  
  res.json({ message: 'Password reset successfully' });
});
```

### 4.7 API Key Authentication (for Proxy Endpoint)

```javascript
// Middleware to authenticate proxy requests
async function authenticateProxyRequest(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // Hash the API key
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  
  // Lookup in database
  const userKey = await db.query(
    `SELECT u.* FROM users u 
     JOIN user_api_keys k ON u.id = k.user_id 
     WHERE k.key_hash = $1 AND k.active = true`,
    [hashedKey]
  );
  
  if (!userKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Attach user to request
  req.user = userKey;
  next();
}
```

---

## 5. Database Schema Design

### 5.1 Recommended Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  token_expiry TIMESTAMP,
  reset_token TEXT,
  reset_token_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_reset_token ON users(reset_token);

-- User API keys (for proxy authentication)
CREATE TABLE user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL, -- SHA-256 hash of the API key
  key_prefix VARCHAR(20) NOT NULL, -- First few chars for display (e.g., "sk_test_abc...")
  name VARCHAR(100), -- User-defined name
  active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_key_hash ON user_api_keys(key_hash);

-- OpenAI API keys (encrypted)
CREATE TABLE openai_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_key TEXT NOT NULL, -- AES-256-GCM encrypted
  key_prefix VARCHAR(20), -- First few chars for display (e.g., "sk-...")
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_openai_api_keys_user_id ON openai_api_keys(user_id);

-- Budgets table
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monthly_limit DECIMAL(10, 2) NOT NULL DEFAULT 10.00, -- USD
  current_usage DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- USD
  reset_day INT NOT NULL DEFAULT 1, -- Day of month to reset (1-28)
  last_reset_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_budgets_user_id ON budgets(user_id);

-- Requests log table
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL,
  input_tokens INT NOT NULL,
  output_tokens INT NOT NULL,
  total_tokens INT NOT NULL,
  cost DECIMAL(10, 6) NOT NULL, -- USD
  status VARCHAR(20) NOT NULL, -- 'success', 'error', 'rate_limited'
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_requests_created_at ON requests(created_at);
CREATE INDEX idx_requests_user_created ON requests(user_id, created_at);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_id UUID NOT NULL UNIQUE, -- JWT 'jti' claim
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_id ON refresh_tokens(token_id);

-- Subscriptions table (for Stripe integration)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  plan_name VARCHAR(50) NOT NULL, -- 'free', 'starter', 'pro'
  status VARCHAR(50) NOT NULL, -- 'active', 'canceled', 'past_due'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Usage statistics (aggregated daily for analytics)
CREATE TABLE daily_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_requests INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_daily_usage_stats_user_date ON daily_usage_stats(user_id, date);
```

### 5.2 Indexes Strategy

**Primary Indexes**:
- All primary keys (UUID with btree index)
- Foreign keys for joins
- Frequently queried columns (email, created_at)

**Composite Indexes**:
- `(user_id, created_at)` for paginated user-specific queries
- `(user_id, date)` for daily stats lookups

**Partial Indexes** (for production optimization):
```sql
-- Index only active API keys
CREATE INDEX idx_active_user_api_keys ON user_api_keys(user_id) 
WHERE active = true;

-- Index only verified users
CREATE INDEX idx_verified_users ON users(email) 
WHERE verified = true;
```

### 5.3 Migration Strategy

**Use a migration tool**: Recommended: **Prisma Migrate** or **node-pg-migrate**

```javascript
// migrations/001_initial_schema.js
exports.up = async (db) => {
  await db.query(`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      ...
    );
  `);
};

exports.down = async (db) => {
  await db.query('DROP TABLE users CASCADE;');
};
```

**Best Practices**:
- Never modify existing migrations
- Always create new migrations for schema changes
- Test migrations on staging before production
- Always provide a rollback (down) function
- Backup database before running migrations

### 5.4 Backup and Recovery

**Automated Backups**:
- Daily full backups (retained for 30 days)
- Hourly incremental backups (retained for 7 days)
- Point-in-time recovery (PITR) enabled

**Tools**:
- **Managed PostgreSQL** (e.g., Railway, Render, AWS RDS) handles this automatically
- **Self-hosted**: Use `pg_dump` + cron jobs

```bash
# Daily backup script
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U postgres costshield > "backups/costshield_$TIMESTAMP.sql"

# Compress and upload to S3
gzip "backups/costshield_$TIMESTAMP.sql"
aws s3 cp "backups/costshield_$TIMESTAMP.sql.gz" s3://costshield-backups/
```

---

## 6. Rate Limiting Strategies

### 6.1 Rate Limiting Architecture

```
┌────────────────────────────────────────┐
│          Client Request                │
└────────────────┬───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│    Rate Limit Middleware               │
│    ┌──────────────────────────────┐   │
│    │ 1. Identify user (API key)   │   │
│    │ 2. Check Redis for count     │   │
│    │ 3. Increment counter         │   │
│    │ 4. Set expiry if first req   │   │
│    └──────────────────────────────┘   │
└────────────────┬───────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
    Rate OK?          Rate Exceeded?
        │                 │
        ▼                 ▼
┌─────────────────┐ ┌────────────────────┐
│ Continue to     │ │ Return 429         │
│ Proxy           │ │ Too Many Requests  │
└─────────────────┘ └────────────────────┘
```

### 6.2 Implementation with Redis

```javascript
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Rate limit configuration
const RATE_LIMITS = {
  free: { rpm: 10, tpm: 100000 },    // Requests per minute, Tokens per minute
  starter: { rpm: 60, tpm: 500000 },
  pro: { rpm: 300, tpm: 2000000 }
};

async function rateLimitMiddleware(req, res, next) {
  const userId = req.user.id;
  const userPlan = req.user.plan || 'free';
  const limits = RATE_LIMITS[userPlan];
  
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  try {
    // Check request count
    const requestKey = `ratelimit:requests:${userId}`;
    const requestCount = await redis.incr(requestKey);
    
    if (requestCount === 1) {
      await redis.expire(requestKey, 60); // Expire after 1 minute
    }
    
    if (requestCount > limits.rpm) {
      const ttl = await redis.ttl(requestKey);
      res.set('X-RateLimit-Limit', limits.rpm);
      res.set('X-RateLimit-Remaining', 0);
      res.set('X-RateLimit-Reset', now + (ttl * 1000));
      res.set('Retry-After', ttl);
      
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${limits.rpm} requests per minute`,
        retryAfter: ttl
      });
    }
    
    // Set rate limit headers
    res.set('X-RateLimit-Limit', limits.rpm);
    res.set('X-RateLimit-Remaining', limits.rpm - requestCount);
    
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open: allow request if Redis is down
    next();
  }
}
```

### 6.3 Token-Based Rate Limiting

For more sophisticated control, implement token bucket algorithm:

```javascript
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.refillRate = refillRate; // tokens per second
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  
  async consume(userId, tokensNeeded) {
    const key = `token_bucket:${userId}`;
    
    // Get current state from Redis
    const state = await redis.get(key);
    let bucket = state ? JSON.parse(state) : {
      tokens: this.capacity,
      lastRefill: Date.now()
    };
    
    // Refill tokens based on time elapsed
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
    
    // Try to consume tokens
    if (bucket.tokens >= tokensNeeded) {
      bucket.tokens -= tokensNeeded;
      await redis.set(key, JSON.stringify(bucket), 'EX', 3600);
      return { allowed: true, remaining: bucket.tokens };
    }
    
    await redis.set(key, JSON.stringify(bucket), 'EX', 3600);
    return { allowed: false, remaining: bucket.tokens };
  }
}

// Usage
const bucket = new TokenBucket(100000, 1667); // 100k capacity, ~100k per minute
const result = await bucket.consume(userId, estimatedTokens);

if (!result.allowed) {
  return res.status(429).json({ error: 'Token rate limit exceeded' });
}
```

### 6.4 Distributed Rate Limiting Best Practices

**1. Use Redis Lua Scripts for Atomicity**

```lua
-- rate_limit.lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('INCR', key)
if current == 1 then
    redis.call('EXPIRE', key, window)
end

if current > limit then
    return 0  -- Rate limit exceeded
end

return 1  -- OK
```

```javascript
// Load Lua script
const rateLimitScript = fs.readFileSync('./rate_limit.lua', 'utf8');
const rateLimitSHA = await redis.script('LOAD', rateLimitScript);

// Execute
const result = await redis.evalsha(rateLimitSHA, 1, key, limit, window);
```

**2. Sliding Window Counter**

```javascript
async function slidingWindowRateLimit(userId, limit, windowSeconds) {
  const now = Date.now();
  const key = `ratelimit:sliding:${userId}`;
  
  // Remove old entries outside the window
  await redis.zremrangebyscore(key, 0, now - (windowSeconds * 1000));
  
  // Count requests in the window
  const count = await redis.zcard(key);
  
  if (count >= limit) {
    return false; // Rate limit exceeded
  }
  
  // Add current request
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, windowSeconds);
  
  return true; // OK
}
```

### 6.5 Rate Limit Strategy per Endpoint

| Endpoint | Free Tier | Starter | Pro | Notes |
|----------|-----------|---------|-----|-------|
| `/api/auth/login` | 5/min | 10/min | 20/min | Prevent brute force |
| `/api/auth/signup` | 3/hour | 5/hour | 10/hour | Prevent abuse |
| `/v1/chat/completions` | 10/min | 60/min | 300/min | OpenAI proxy |
| `/api/usage/stats` | 60/min | 120/min | 300/min | Read-only |
| `/api/keys/*` | 30/min | 60/min | 120/min | API key management |

---

## 7. Cost Calculation & Token Counting

### 7.1 Accurate Token Counting with tiktoken

```javascript
const { encoding_for_model } = require('tiktoken');

class TokenCounter {
  constructor() {
    this.encoders = {};
  }
  
  getEncoder(model) {
    if (!this.encoders[model]) {
      this.encoders[model] = encoding_for_model(model);
    }
    return this.encoders[model];
  }
  
  countTokens(text, model = 'gpt-4') {
    const encoder = this.getEncoder(model);
    const tokens = encoder.encode(text);
    return tokens.length;
  }
  
  // Count tokens for chat messages
  countChatTokens(messages, model = 'gpt-4') {
    const encoder = this.getEncoder(model);
    
    let tokenCount = 0;
    
    // Format overhead per message
    const tokensPerMessage = 3; // <|start|>role/name\n{content}<|end|>\n
    const tokensPerName = 1;
    
    for (const message of messages) {
      tokenCount += tokensPerMessage;
      
      for (const [key, value] of Object.entries(message)) {
        tokenCount += encoder.encode(value).length;
        if (key === 'name') {
          tokenCount += tokensPerName;
        }
      }
    }
    
    tokenCount += 3; // Every reply is primed with <|start|>assistant<|message|>
    
    return tokenCount;
  }
  
  estimateOutputTokens(maxTokens, temperature = 1.0) {
    // Heuristic: higher temperature = more tokens used
    return Math.ceil(maxTokens * (0.7 + (temperature * 0.3)));
  }
}

// Usage
const counter = new TokenCounter();
const inputTokens = counter.countChatTokens(messages, 'gpt-4');
```

### 7.2 OpenAI Pricing (as of 2026)

```javascript
// Pricing per 1M tokens (USD)
const PRICING = {
  'gpt-4o': {
    input: 2.50,
    output: 10.00
  },
  'gpt-4o-mini': {
    input: 0.15,
    output: 0.60
  },
  'gpt-4-turbo': {
    input: 10.00,
    output: 30.00
  },
  'gpt-4': {
    input: 30.00,
    output: 60.00
  },
  'gpt-3.5-turbo': {
    input: 0.50,
    output: 1.50
  }
};

function calculateCost(model, inputTokens, outputTokens) {
  const pricing = PRICING[model];
  
  if (!pricing) {
    throw new Error(`Unknown model: ${model}`);
  }
  
  const inputCost = (inputTokens / 1000000) * pricing.input;
  const outputCost = (outputTokens / 1000000) * pricing.output;
  
  return Number((inputCost + outputCost).toFixed(6));
}

// Example
const cost = calculateCost('gpt-4o', 1000, 500);
// Input: 1000 tokens * $2.50/1M = $0.0025
// Output: 500 tokens * $10.00/1M = $0.0050
// Total: $0.0075
```

### 7.3 Handling Streaming Token Counts

**Challenge**: With streaming responses, token counts come at the end.

**Solution**: Pre-authorization with adjustment

```javascript
async function handleStreamingRequest(req, res) {
  const user = req.user;
  const { messages, model, max_tokens = 4096 } = req.body;
  
  // 1. Count input tokens
  const inputTokens = counter.countChatTokens(messages, model);
  
  // 2. Estimate maximum possible cost
  const estimatedOutputTokens = max_tokens;
  const estimatedCost = calculateCost(model, inputTokens, estimatedOutputTokens);
  
  // 3. Check if user has enough budget
  const availableBudget = await getBudget(user.id);
  
  if (availableBudget < estimatedCost) {
    return res.status(429).json({
      error: 'Insufficient budget',
      available: availableBudget,
      estimated: estimatedCost
    });
  }
  
  // 4. Create a "pre-authorization" hold
  await createBudgetHold(user.id, estimatedCost);
  
  try {
    // 5. Stream the response
    let actualOutputTokens = 0;
    
    const stream = await openai.chat.completions.create({
      ...req.body,
      stream: true
    });
    
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      
      // Count actual tokens
      if (chunk.choices[0]?.delta?.content) {
        const content = chunk.choices[0].delta.content;
        actualOutputTokens += counter.countTokens(content, model);
      }
      
      // Get final usage from last chunk
      if (chunk.usage) {
        actualOutputTokens = chunk.usage.completion_tokens;
      }
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
    
    // 6. Calculate actual cost
    const actualCost = calculateCost(model, inputTokens, actualOutputTokens);
    
    // 7. Release hold and charge actual amount
    await releaseBudgetHold(user.id, estimatedCost);
    await chargeBudget(user.id, actualCost);
    
    // 8. Log request
    await logRequest({
      userId: user.id,
      model,
      inputTokens,
      outputTokens: actualOutputTokens,
      cost: actualCost,
      status: 'success'
    });
    
  } catch (error) {
    // Release hold on error
    await releaseBudgetHold(user.id, estimatedCost);
    throw error;
  }
}
```

### 7.4 Price Change Handling

**Strategy**: Store pricing in database with effective dates

```sql
CREATE TABLE model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL,
  input_price_per_million DECIMAL(10, 2) NOT NULL,
  output_price_per_million DECIMAL(10, 2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example data
INSERT INTO model_pricing (model_name, input_price_per_million, output_price_per_million, effective_from)
VALUES ('gpt-4o', 2.50, 10.00, '2026-01-01');
```

```javascript
async function getCurrentPricing(model, date = new Date()) {
  const pricing = await db.query(
    `SELECT * FROM model_pricing 
     WHERE model_name = $1 
     AND effective_from <= $2 
     AND (effective_to IS NULL OR effective_to > $2)
     ORDER BY effective_from DESC 
     LIMIT 1`,
    [model, date]
  );
  
  return pricing;
}
```

---

## 8. Budget Enforcement

### 8.1 Preventing Race Conditions

**Problem**: Concurrent requests can bypass budget limits.

**Example**:
```
User has $5 budget remaining

Request A: Check budget ($5) → OK → Process → Deduct $3
Request B: Check budget ($5) → OK → Process → Deduct $3
                    ↓
User spent $6 with only $5 budget!
```

**Solution**: Database transactions with row-level locking

```javascript
async function enforcebudget(userId, estimatedCost) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // SELECT FOR UPDATE locks the row
    const result = await client.query(
      `SELECT monthly_limit, current_usage 
       FROM budgets 
       WHERE user_id = $1 
       FOR UPDATE`,
      [userId]
    );
    
    const budget = result.rows[0];
    const available = budget.monthly_limit - budget.current_usage;
    
    if (available < estimatedCost) {
      await client.query('ROLLBACK');
      throw new Error('Insufficient budget');
    }
    
    // Create a hold (pre-authorization)
    await client.query(
      `INSERT INTO budget_holds (user_id, amount, status) 
       VALUES ($1, $2, 'active')`,
      [userId, estimatedCost]
    );
    
    await client.query('COMMIT');
    
    return { success: true, available };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function chargeBudget(userId, actualCost, holdId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Update budget
    await client.query(
      `UPDATE budgets 
       SET current_usage = current_usage + $1, 
           updated_at = NOW() 
       WHERE user_id = $2`,
      [actualCost, userId]
    );
    
    // Release hold
    await client.query(
      `UPDATE budget_holds 
       SET status = 'released', amount_charged = $1 
       WHERE id = $2`,
      [actualCost, holdId]
    );
    
    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### 8.2 Budget Enforcement Schema

```sql
-- Add budget holds table
CREATE TABLE budget_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 6) NOT NULL,
  amount_charged DECIMAL(10, 6),
  status VARCHAR(20) NOT NULL, -- 'active', 'released', 'expired'
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour'
);

CREATE INDEX idx_budget_holds_user_id ON budget_holds(user_id);
CREATE INDEX idx_budget_holds_status ON budget_holds(status);
```

### 8.3 Budget Reset Strategies

```javascript
// Cron job to reset budgets monthly
async function resetMonthlyBudgets() {
  const today = new Date().getDate();
  
  // Find users whose reset day is today
  const usersToReset = await db.query(
    `SELECT id, monthly_limit FROM budgets 
     WHERE reset_day = $1 
     AND last_reset_at < NOW() - INTERVAL '25 days'`,
    [today]
  );
  
  for (const user of usersToReset) {
    await db.query(
      `UPDATE budgets 
       SET current_usage = 0, 
           last_reset_at = NOW() 
       WHERE id = $1`,
      [user.id]
    );
    
    // Send notification
    await sendBudgetResetNotification(user.id);
  }
}

// Run daily at midnight
cron.schedule('0 0 * * *', resetMonthlyBudgets);
```

### 8.4 Grace Periods and Soft Limits

```javascript
const BUDGET_THRESHOLDS = {
  WARNING: 0.80, // 80% of budget
  SOFT_LIMIT: 1.00, // 100% of budget
  HARD_LIMIT: 1.10  // 110% of budget (grace period)
};

async function checkBudgetWithGracePeriod(userId, estimatedCost) {
  const budget = await getBudget(userId);
  const usage = budget.current_usage / budget.monthly_limit;
  
  // Send warning at 80%
  if (usage >= BUDGET_THRESHOLDS.WARNING && usage < BUDGET_THRESHOLDS.SOFT_LIMIT) {
    await sendBudgetWarning(userId, usage);
  }
  
  // Soft limit: Allow with warning
  if (usage >= BUDGET_THRESHOLDS.SOFT_LIMIT && usage < BUDGET_THRESHOLDS.HARD_LIMIT) {
    await sendBudgetExceededWarning(userId);
    return { allowed: true, warning: 'Budget exceeded, grace period active' };
  }
  
  // Hard limit: Block
  if (usage >= BUDGET_THRESHOLDS.HARD_LIMIT) {
    return { allowed: false, error: 'Budget hard limit reached' };
  }
  
  return { allowed: true };
}
```

### 8.5 Rollover Budgets (Optional Feature)

```sql
-- Add rollover column
ALTER TABLE budgets ADD COLUMN rollover_enabled BOOLEAN DEFAULT false;
ALTER TABLE budgets ADD COLUMN rollover_amount DECIMAL(10, 2) DEFAULT 0.00;

-- Rollover logic
CREATE OR REPLACE FUNCTION rollover_budget() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rollover_enabled AND OLD.current_usage < OLD.monthly_limit THEN
    NEW.rollover_amount := OLD.monthly_limit - OLD.current_usage;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER budget_reset_rollover
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  WHEN (NEW.last_reset_at > OLD.last_reset_at)
  EXECUTE FUNCTION rollover_budget();
```

---

## 9. Error Handling & Resilience

### 9.1 Error Classification

```javascript
class ProxyError extends Error {
  constructor(message, statusCode, code, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'ProxyError';
  }
}

// Specific error types
class BudgetExceededError extends ProxyError {
  constructor(available, required) {
    super(
      'Insufficient budget',
      429,
      'BUDGET_EXCEEDED',
      { available, required }
    );
  }
}

class OpenAIAPIError extends ProxyError {
  constructor(originalError) {
    super(
      originalError.message,
      originalError.status || 500,
      'OPENAI_ERROR',
      { originalError: originalError.toJSON() }
    );
  }
}

class RateLimitError extends ProxyError {
  constructor(retryAfter) {
    super(
      'Rate limit exceeded',
      429,
      'RATE_LIMIT_EXCEEDED',
      { retryAfter }
    );
  }
}

class InvalidAPIKeyError extends ProxyError {
  constructor() {
    super(
      'Invalid or missing API key',
      401,
      'INVALID_API_KEY'
    );
  }
}
```

### 9.2 Global Error Handler

```javascript
app.use((err, req, res, next) => {
  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    userId: req.user?.id,
    path: req.path
  });
  
  // Send error response
  if (err instanceof ProxyError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
        details: err.details
      }
    });
  }
  
  // Handle OpenAI SDK errors
  if (err.constructor.name === 'APIError') {
    return res.status(err.status || 500).json({
      error: {
        message: err.message,
        code: 'OPENAI_ERROR',
        type: err.type
      }
    });
  }
  
  // Handle database errors
  if (err.code?.startsWith('23')) { // PostgreSQL constraint violations
    return res.status(400).json({
      error: {
        message: 'Database constraint violation',
        code: 'DB_CONSTRAINT_VIOLATION'
      }
    });
  }
  
  // Default error
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
});
```

### 9.3 Retry Logic with Exponential Backoff

```javascript
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      const isRetryable = error.status === 429 || error.status === 503 || error.code === 'ECONNRESET';
      
      if (!isRetryable || isLastAttempt) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
      await sleep(delay);
    }
  }
}

// Usage
const response = await retryWithBackoff(async () => {
  return await openai.chat.completions.create(requestBody);
});
```

### 9.4 Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.error('Circuit breaker opened');
    }
  }
}

// Usage
const openaiCircuit = new CircuitBreaker(5, 60000);

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const response = await openaiCircuit.execute(async () => {
      return await openai.chat.completions.create(req.body);
    });
    res.json(response);
  } catch (error) {
    if (error.message === 'Circuit breaker is OPEN') {
      return res.status(503).json({
        error: 'Service temporarily unavailable'
      });
    }
    throw error;
  }
});
```

### 9.5 Graceful Shutdown

```javascript
let isShuttingDown = false;
const activeConnections = new Set();

// Track active connections
app.use((req, res, next) => {
  if (isShuttingDown) {
    return res.status(503).json({ error: 'Server is shutting down' });
  }
  
  activeConnections.add(req);
  res.on('finish', () => {
    activeConnections.delete(req);
  });
  
  next();
});

async function gracefulShutdown(signal) {
  console.log(`Received ${signal}, starting graceful shutdown...`);
  isShuttingDown = true;
  
  // Stop accepting new connections
  server.close(() => {
    console.log('Server closed to new connections');
  });
  
  // Wait for active connections to complete (max 30 seconds)
  const timeout = setTimeout(() => {
    console.log('Forcefully closing remaining connections');
    process.exit(1);
  }, 30000);
  
  // Wait for all connections to close
  while (activeConnections.size > 0) {
    console.log(`Waiting for ${activeConnections.size} connections to close...`);
    await sleep(1000);
  }
  
  clearTimeout(timeout);
  
  // Close database connections
  await pool.end();
  await redis.quit();
  
  console.log('Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

---

## 10. Security Considerations

### 10.1 HTTP Security Headers (Helmet.js)

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 10.2 CORS Configuration

```javascript
const cors = require('cors');

const ALLOWED_ORIGINS = [
  'https://costshield.dev',
  'https://app.costshield.dev',
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));
```

### 10.3 Input Validation

```javascript
const Joi = require('joi');

// Request validation schemas
const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
  }),
  
  signup: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character'
      })
  }),
  
  chatCompletion: Joi.object({
    model: Joi.string().valid('gpt-4', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo').required(),
    messages: Joi.array().items(
      Joi.object({
        role: Joi.string().valid('system', 'user', 'assistant').required(),
        content: Joi.string().required()
      })
    ).min(1).required(),
    temperature: Joi.number().min(0).max(2),
    max_tokens: Joi.number().min(1).max(32000),
    stream: Joi.boolean()
  })
};

// Validation middleware
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Validation error',
        details: errors
      });
    }
    
    req.body = value; // Use validated & sanitized data
    next();
  };
}

// Usage
app.post('/api/auth/login', validate(schemas.login), loginHandler);
app.post('/v1/chat/completions', validate(schemas.chatCompletion), proxyHandler);
```

### 10.4 CSRF Protection

```javascript
const csrf = require('csurf');

// Enable CSRF protection for state-changing operations
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Apply to forms and state-changing endpoints
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Protected routes
app.post('/api/settings', csrfProtection, updateSettingsHandler);
app.delete('/api/keys/:id', csrfProtection, deleteKeyHandler);
```

### 10.5 SQL Injection Prevention

```javascript
// ✅ GOOD: Parameterized queries
await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ❌ BAD: String concatenation
await db.query(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ GOOD: ORM/Query Builder (Prisma example)
await prisma.user.findUnique({
  where: { email: email }
});
```

### 10.6 XSS Prevention

```javascript
const xss = require('xss');

// Sanitize user input
function sanitizeInput(input) {
  if (typeof input === 'string') {
    return xss(input, {
      whiteList: {},        // Remove all HTML tags
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
  }
  return input;
}

// Middleware
app.use((req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
});

function sanitizeObject(obj) {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'object' ? sanitizeObject(item) : sanitizeInput(item)
      );
    } else {
      sanitized[key] = sanitizeInput(value);
    }
  }
  return sanitized;
}
```

### 10.7 Secrets Management Checklist

- [ ] No secrets in code or environment variables committed to Git
- [ ] Use environment variables for development
- [ ] Use AWS Secrets Manager / HashiCorp Vault for production
- [ ] Rotate secrets regularly (every 90 days)
- [ ] Different secrets for dev/staging/production
- [ ] Limit access to secrets (principle of least privilege)
- [ ] Audit secret access logs
- [ ] Use strong random generation for API keys (crypto.randomBytes)

---

## 11. Monitoring & Logging

### 11.1 Structured Logging

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'costshield-proxy' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Usage
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  ip: req.ip
});

logger.error('OpenAI API error', {
  userId: user.id,
  model: req.body.model,
  error: error.message,
  statusCode: error.status
});
```

### 11.2 Request Logging Middleware

```javascript
app.use((req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Response sent', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id
    });
  });
  
  next();
});
```

### 11.3 Metrics Collection

```javascript
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code']
});

const proxyRequestCounter = new prometheus.Counter({
  name: 'proxy_requests_total',
  help: 'Total number of proxy requests',
  labelNames: ['model', 'status']
});

const budgetGauge = new prometheus.Gauge({
  name: 'user_budget_remaining',
  help: 'Remaining budget for users',
  labelNames: ['user_id']
});

// Collect default metrics
prometheus.collectDefaultMetrics();

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});

// Usage in proxy handler
proxyRequestCounter.inc({ model: req.body.model, status: 'success' });
budgetGauge.set({ user_id: user.id }, availableBudget);
```

### 11.4 Alerting Conditions

**Critical Alerts** (immediate notification):
- Budget exceeded for user
- OpenAI API key invalid/expired
- Database connection lost
- Error rate > 5% over 5 minutes
- Response time P95 > 5 seconds

**Warning Alerts** (daily digest):
- Budget at 80% for user
- Unusual traffic patterns
- Slow queries (> 1 second)

```javascript
// Budget alert
async function checkBudgetAlert(userId, currentUsage, limit) {
  const usage = currentUsage / limit;
  
  if (usage >= 1.0) {
    await sendAlert('CRITICAL', {
      type: 'BUDGET_EXCEEDED',
      userId,
      usage: currentUsage,
      limit
    });
  } else if (usage >= 0.8) {
    await sendAlert('WARNING', {
      type: 'BUDGET_WARNING',
      userId,
      usage: currentUsage,
      limit,
      percentage: Math.round(usage * 100)
    });
  }
}
```

### 11.5 Log Aggregation

**Options**:
- **Datadog**: Full observability platform
- **Logtail**: Simple log aggregation
- **ELK Stack**: Self-hosted option
- **CloudWatch Logs**: AWS native

**Configuration** (Datadog example):

```javascript
const tracer = require('dd-trace').init({
  service: 'costshield-proxy',
  env: process.env.NODE_ENV,
  logInjection: true
});

// All winston logs will be sent to Datadog
```

---

## 12. Payment Processing (Stripe)

### 12.1 Subscription Plans

```javascript
// Define plans
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    monthlyBudget: 5, // $5
    features: ['10 requests/min', 'Basic support']
  },
  starter: {
    name: 'Starter',
    price: 9.99,
    stripePriceId: 'price_xxxxxxxxxxxxx',
    monthlyBudget: 50,
    features: ['60 requests/min', 'Email support', '$50 monthly budget']
  },
  pro: {
    name: 'Pro',
    price: 29.99,
    stripePriceId: 'price_yyyyyyyyyyyyy',
    monthlyBudget: 200,
    features: ['300 requests/min', 'Priority support', '$200 monthly budget']
  }
};
```

### 12.2 Checkout Session

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/billing/checkout', authMiddleware, async (req, res) => {
  const { planId } = req.body;
  const user = req.user;
  
  const plan = PLANS[planId];
  if (!plan || planId === 'free') {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  
  try {
    // Create or get Stripe customer
    let customer = await getStripeCustomer(user.id);
    
    if (!customer) {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id }
      });
      
      await db.query(
        `INSERT INTO subscriptions (user_id, stripe_customer_id, plan_name, status) 
         VALUES ($1, $2, 'free', 'active')`,
        [user.id, customer.id]
      );
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1
        }
      ],
      success_url: `${process.env.APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/pricing`,
      metadata: {
        userId: user.id,
        planId: planId
      }
    });
    
    res.json({ checkoutUrl: session.url });
    
  } catch (error) {
    logger.error('Stripe checkout error', { error: error.message, userId: user.id });
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});
```

### 12.3 Webhook Handling

```javascript
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

app.post('/api/webhooks/stripe', 
  express.raw({ type: 'application/json' }), 
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    let event;
    
    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', { error: err.message });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object);
          break;
          
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpdate(event.data.object);
          break;
          
        case 'customer.subscription.deleted':
          await handleSubscriptionCanceled(event.data.object);
          break;
          
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;
          
        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object);
          break;
          
        default:
          logger.info('Unhandled Stripe event', { type: event.type });
      }
      
      res.json({ received: true });
      
    } catch (error) {
      logger.error('Stripe webhook handler error', { 
        error: error.message, 
        eventType: event.type 
      });
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }
);

async function handleCheckoutCompleted(session) {
  const userId = session.metadata.userId;
  const planId = session.metadata.planId;
  const plan = PLANS[planId];
  
  // Update subscription in database
  await db.query(
    `UPDATE subscriptions 
     SET stripe_subscription_id = $1, 
         plan_name = $2, 
         status = 'active',
         updated_at = NOW() 
     WHERE user_id = $3`,
    [session.subscription, planId, userId]
  );
  
  // Update budget
  await db.query(
    `UPDATE budgets 
     SET monthly_limit = $1,
         updated_at = NOW() 
     WHERE user_id = $2`,
    [plan.monthlyBudget, userId]
  );
  
  // Send confirmation email
  await sendSubscriptionConfirmationEmail(userId, planId);
}

async function handleSubscriptionUpdate(subscription) {
  const customer = subscription.customer;
  
  // Find user by Stripe customer ID
  const result = await db.query(
    'SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1',
    [customer]
  );
  
  if (!result.rows[0]) {
    logger.error('User not found for Stripe customer', { customer });
    return;
  }
  
  const userId = result.rows[0].user_id;
  
  // Update subscription status
  await db.query(
    `UPDATE subscriptions 
     SET status = $1,
         current_period_start = $2,
         current_period_end = $3,
         cancel_at_period_end = $4,
         updated_at = NOW() 
     WHERE user_id = $5`,
    [
      subscription.status,
      new Date(subscription.current_period_start * 1000),
      new Date(subscription.current_period_end * 1000),
      subscription.cancel_at_period_end,
      userId
    ]
  );
}

async function handleSubscriptionCanceled(subscription) {
  const customer = subscription.customer;
  
  const result = await db.query(
    'SELECT user_id FROM subscriptions WHERE stripe_customer_id = $1',
    [customer]
  );
  
  if (!result.rows[0]) return;
  
  const userId = result.rows[0].user_id;
  
  // Downgrade to free plan
  await db.query(
    `UPDATE subscriptions 
     SET plan_name = 'free', 
         status = 'canceled',
         updated_at = NOW() 
     WHERE user_id = $1`,
    [userId]
  );
  
  // Reduce budget
  await db.query(
    `UPDATE budgets 
     SET monthly_limit = $1,
         updated_at = NOW() 
     WHERE user_id = $2`,
    [PLANS.free.monthlyBudget, userId]
  );
  
  await sendSubscriptionCanceledEmail(userId);
}

async function handlePaymentFailed(invoice) {
  const customer = invoice.customer;
  
  const result = await db.query(
    'SELECT u.id, u.email FROM users u 
     JOIN subscriptions s ON u.id = s.user_id 
     WHERE s.stripe_customer_id = $1',
    [customer]
  );
  
  if (!result.rows[0]) return;
  
  const user = result.rows[0];
  
  // Send payment failed email
  await sendPaymentFailedEmail(user.id, user.email, invoice.attempt_count);
  
  // If 3rd attempt failed, suspend account
  if (invoice.attempt_count >= 3) {
    await db.query(
      `UPDATE subscriptions 
       SET status = 'past_due' 
       WHERE user_id = $1`,
      [user.id]
    );
  }
}
```

### 12.4 Proration Handling

Stripe handles proration automatically when upgrading/downgrading mid-cycle. No additional code needed.

### 12.5 Cancel Subscription

```javascript
app.post('/api/billing/cancel', authMiddleware, async (req, res) => {
  const user = req.user;
  
  try {
    const subscription = await db.query(
      'SELECT * FROM subscriptions WHERE user_id = $1',
      [user.id]
    );
    
    if (!subscription.rows[0] || !subscription.rows[0].stripe_subscription_id) {
      return res.status(400).json({ error: 'No active subscription' });
    }
    
    // Cancel at period end (user keeps access until end of billing period)
    await stripe.subscriptions.update(
      subscription.rows[0].stripe_subscription_id,
      { cancel_at_period_end: true }
    );
    
    await db.query(
      'UPDATE subscriptions SET cancel_at_period_end = true WHERE user_id = $1',
      [user.id]
    );
    
    res.json({ message: 'Subscription will be canceled at period end' });
    
  } catch (error) {
    logger.error('Subscription cancelation error', { error: error.message, userId: user.id });
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});
```

---

## 13. Deployment & Infrastructure

### 13.1 Platform Comparison

| Feature | Railway | Render | Fly.io |
|---------|---------|--------|--------|
| **Pricing** | $5/month credit, usage-based | Free tier with limits, $7+/month | Pay as you go, $0.006/GB-hour |
| **Ease of Use** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Good | ⭐⭐⭐ Moderate |
| **PostgreSQL** | $5/month plugin | $7/month, free tier (90 days) | $0.15/GB-month |
| **Redis** | $3/month plugin | Not built-in | $0.30/GB-month |
| **Auto-scaling** | Manual | Built-in | Manual/Auto via CLI |
| **Global CDN** | Single region | Single region | Multi-region edge |
| **SSL** | Automatic | Automatic | Automatic |
| **Environments** | Yes (dev/staging/prod) | Limited | Via separate orgs |
| **CI/CD** | GitHub integration | GitHub integration | GitHub Actions |
| **Docker Support** | Yes (Nixpacks or Dockerfile) | Yes | Yes (Docker-first) |
| **Compliance** | Working on SOC 2 | SOC 2, GDPR | GDPR |

### 13.2 Recommendation

**MVP/Early Stage**: **Railway**
- Fastest setup
- All-in-one dashboard
- Simple plugin system for PostgreSQL and Redis
- $5 monthly credit sufficient for testing

**Production/Scale**: **Render** or **Railway Pro**
- Better price/performance ratio
- Built-in autoscaling (Render)
- SOC 2 compliance (important for SaaS)

### 13.3 Infrastructure Setup

#### Railway Deployment

1. **Create `railway.toml`**:
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[services]]
name = "web"

[[services]]
name = "postgres"
plugin = "postgresql"

[[services]]
name = "redis"
plugin = "redis"
```

2. **Environment Variables**:
```bash
# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# App
NODE_ENV=production
PORT=3000
APP_URL=https://costshield.dev

# Secrets
JWT_SECRET=<generate-with-openssl-rand-hex-64>
ENCRYPTION_MASTER_KEY=<generate-with-openssl-rand-hex-32>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (using SendGrid)
SENDGRID_API_KEY=SG...
FROM_EMAIL=noreply@costshield.dev
```

3. **Deploy**:
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

#### Render Deployment

1. **Create `render.yaml`**:
```yaml
services:
  - type: web
    name: costshield-api
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true
      - key: ENCRYPTION_MASTER_KEY
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: costshield-db
          property: connectionString
    
  - type: redis
    name: costshield-redis
    ipAllowList: []
    
databases:
  - name: costshield-db
    databaseName: costshield
    user: costshield
```

2. **Deploy**: Connect GitHub repo in Render dashboard

### 13.4 Managed PostgreSQL Setup

```bash
# Railway (automatic with plugin)
# Render (automatic with render.yaml)

# If self-managed (DigitalOcean example):
doctl databases create costshield-db \
  --engine pg \
  --version 15 \
  --size db-s-1vcpu-1gb \
  --region nyc1

# Get connection string
doctl databases connection costshield-db
```

### 13.5 Environment Variables Validation

```javascript
const Joi = require('joi');

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  ENCRYPTION_MASTER_KEY: Joi.string().length(64).required(),
  STRIPE_SECRET_KEY: Joi.string().pattern(/^sk_(test|live)_/).required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().pattern(/^whsec_/).required(),
  SENDGRID_API_KEY: Joi.string().required(),
  APP_URL: Joi.string().uri().required()
}).unknown();

const { error, value: env } = envSchema.validate(process.env);

if (error) {
  console.error('❌ Environment validation error:', error.message);
  process.exit(1);
}

module.exports = env;
```

### 13.6 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test
          JWT_SECRET: test_secret_key_for_ci_only_not_production
      
      - name: Run migrations
        run: npm run migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Railway CLI
        run: npm install -g @railway/cli
      
      - name: Deploy to Railway
        run: railway up --service=web
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### 13.7 SSL/TLS Configuration

**Automatic** on Railway/Render/Fly.io - no configuration needed.

For custom domains:
1. Add domain in platform dashboard
2. Update DNS records (CNAME or A record)
3. SSL certificate automatically provisioned via Let's Encrypt

---

## 14. API Versioning

### 14.1 URL-Based Versioning

```
/api/v1/auth/login
/api/v1/keys
/v1/chat/completions  (OpenAI compatibility)
```

### 14.2 Version Routing

```javascript
// v1 routes
const v1Router = express.Router();

v1Router.use('/auth', require('./routes/v1/auth'));
v1Router.use('/keys', require('./routes/v1/keys'));
v1Router.use('/usage', require('./routes/v1/usage'));
v1Router.post('/chat/completions', require('./routes/v1/proxy'));

app.use('/api/v1', v1Router);
app.use('/v1', v1Router); // OpenAI compatibility

// Default to latest version
app.use('/api', v1Router);
```

### 14.3 Deprecation Strategy

```javascript
// Deprecated endpoint
app.get('/api/v1/stats', (req, res, next) => {
  res.set('X-API-Deprecated', 'true');
  res.set('X-API-Sunset', 'Tue, 31 Dec 2026 23:59:59 GMT');
  res.set('X-API-Replacement', '/api/v1/usage/stats');
  
  // Still serve the response
  next();
});

// When sunset date passed, return 410 Gone
app.get('/api/v1/stats', (req, res) => {
  res.status(410).json({
    error: 'This endpoint has been deprecated',
    sunset: '2026-12-31',
    replacement: '/api/v1/usage/stats'
  });
});
```

---

## 15. Common Pitfalls & Mitigation

### 15.1 OpenClaw Bypassing Proxy

**Problem**: OpenClaw might cache the OpenAI API base URL and bypass our proxy.

**Solution**:
1. Provide clear documentation showing how to configure OpenClaw to use our proxy
2. Offer SDK/wrapper that enforces proxy usage
3. Monitor for direct OpenAI API calls (if user's OpenAI key has unexpected usage)

### 15.2 Token Counting Inaccuracy

**Problem**: Streaming responses make it hard to count tokens accurately in real-time.

**Solution**:
1. Use pre-authorization holds with estimated max tokens
2. Adjust after actual token count is known
3. Use tiktoken for input, parse `usage` from OpenAI response for output
4. Add 5-10% buffer for estimation errors

### 15.3 Race Conditions in Budget Enforcement

**Problem**: Concurrent requests can bypass budget limits.

**Solution**:
1. Use database transactions with `SELECT FOR UPDATE`
2. Implement pre-authorization holds
3. Release holds after actual cost is calculated
4. Use optimistic locking for high-concurrency scenarios

### 15.4 Rate Limiting from OpenAI

**Problem**: User might hit OpenAI's rate limits even if within our limits.

**Solution**:
1. Implement exponential backoff with retries
2. Queue requests during rate limit periods
3. Show clear error messages to users
4. Track OpenAI rate limit headers and warn users proactively

### 15.5 Database Connection Pool Exhaustion

**Problem**: High concurrency can exhaust PostgreSQL connections.

**Solution**:
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Maximum pool size
  min: 5,                     // Minimum pool size
  idleTimeoutMillis: 30000,   // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Timeout if connection takes > 5 seconds
  maxUses: 7500              // Close connection after 7500 uses
});

// Monitor pool
setInterval(() => {
  logger.info('DB Pool Stats', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  });
}, 60000);
```

### 15.6 Redis Failures (Fail Open)

**Problem**: If Redis goes down, rate limiting breaks.

**Solution**:
```javascript
async function rateLimitMiddleware(req, res, next) {
  try {
    // Try Redis rate limiting
    await checkRateLimit(req.user.id);
    next();
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logger.error('Redis connection failed, failing open');
      // Allow request but log incident
      next();
    } else {
      throw error; // Rate limit exceeded
    }
  }
}
```

### 15.7 Encryption Key Rotation

**Problem**: Rotating encryption keys requires re-encrypting all API keys.

**Solution**:
1. Support multiple encryption keys (current + old)
2. Store key version with each encrypted value
3. Implement background job to re-encrypt with new key
4. Remove old key after all data re-encrypted

```javascript
// Encryption with key versioning
function encrypt(plaintext) {
  const version = 'v2'; // Current key version
  const key = ENCRYPTION_KEYS[version];
  const encrypted = encryptWithKey(plaintext, key);
  
  return `${version}:${encrypted}`;
}

function decrypt(ciphertext) {
  const [version, encrypted] = ciphertext.split(':');
  const key = ENCRYPTION_KEYS[version];
  
  if (!key) {
    throw new Error('Unknown encryption key version');
  }
  
  return decryptWithKey(encrypted, key);
}
```

---

## 16. Testing Strategy

### 16.1 Unit Tests

```javascript
// tests/unit/tokenCounter.test.js
const TokenCounter = require('../../src/utils/tokenCounter');
const counter = new TokenCounter();

describe('TokenCounter', () => {
  test('counts tokens accurately', () => {
    const text = 'Hello, world!';
    const count = counter.countTokens(text, 'gpt-4');
    expect(count).toBeGreaterThan(0);
  });
  
  test('counts chat messages', () => {
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ];
    const count = counter.countChatTokens(messages, 'gpt-4');
    expect(count).toBeGreaterThan(10);
  });
});
```

### 16.2 Integration Tests

```javascript
// tests/integration/proxy.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Proxy Endpoint', () => {
  let authToken;
  let apiKey;
  
  beforeAll(async () => {
    // Setup test user and API key
    authToken = await createTestUser();
    apiKey = await createTestAPIKey(authToken);
  });
  
  test('proxies request to OpenAI', async () => {
    const response = await request(app)
      .post('/v1/chat/completions')
      .set('X-API-Key', apiKey)
      .send({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "test"' }],
        max_tokens: 10
      });
    
    expect(response.status).toBe(200);
    expect(response.body.choices).toBeDefined();
  });
  
  test('enforces budget limit', async () => {
    // Set low budget
    await setBudget(testUserId, 0.01);
    
    const response = await request(app)
      .post('/v1/chat/completions')
      .set('X-API-Key', apiKey)
      .send({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Write an essay' }],
        max_tokens: 4000
      });
    
    expect(response.status).toBe(429);
    expect(response.body.error).toContain('budget');
  });
});
```

### 16.3 Load Testing

```javascript
// tests/load/proxy.load.js
const autocannon = require('autocannon');

const instance = autocannon({
  url: 'http://localhost:3000',
  connections: 100,
  duration: 30,
  requests: [
    {
      method: 'POST',
      path: '/v1/chat/completions',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.TEST_API_KEY
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10
      })
    }
  ]
});

autocannon.track(instance);
```

---

## 17. Deployment Checklist

### Pre-Launch Checklist

**Security**:
- [ ] All secrets in environment variables or KMS
- [ ] HTTPS enforced for all endpoints
- [ ] CORS properly configured
- [ ] Helmet.js security headers enabled
- [ ] Input validation on all endpoints
- [ ] CSRF protection enabled for state-changing operations
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] API keys encrypted at rest (AES-256-GCM)
- [ ] Rate limiting enabled

**Database**:
- [ ] Migrations tested on staging
- [ ] Backups configured (daily full, hourly incremental)
- [ ] Connection pooling configured
- [ ] Indexes created on frequently queried columns
- [ ] Point-in-time recovery enabled

**Monitoring**:
- [ ] Structured logging implemented
- [ ] Error tracking configured (Sentry/Datadog)
- [ ] Metrics collection enabled (Prometheus/Datadog)
- [ ] Alerts configured for critical issues
- [ ] Uptime monitoring (Pingdom/UptimeRobot)

**Infrastructure**:
- [ ] SSL certificates configured
- [ ] DNS records configured
- [ ] CDN configured (if needed)
- [ ] Environment variables validated
- [ ] CI/CD pipeline working
- [ ] Staging environment matches production

**Compliance**:
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance (if EU users)
- [ ] Data retention policy defined
- [ ] User data export functionality

**Testing**:
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Penetration testing (optional but recommended)

**Stripe**:
- [ ] Webhook endpoint configured and verified
- [ ] Test mode to live mode switch completed
- [ ] Subscription plans created
- [ ] Failed payment handling tested
- [ ] Proration working correctly

**Documentation**:
- [ ] API documentation published
- [ ] Integration guide for OpenClaw
- [ ] Troubleshooting guide
- [ ] Status page (status.costshield.dev)

### Launch Day Checklist

- [ ] Switch Stripe to live mode
- [ ] Update frontend to production API
- [ ] Monitor error rates closely
- [ ] Have rollback plan ready
- [ ] Team on standby for issues
- [ ] Post-launch announcement ready

### Post-Launch Checklist (Week 1)

- [ ] Review error logs daily
- [ ] Monitor user feedback
- [ ] Track conversion funnel
- [ ] Analyze performance metrics
- [ ] Check budget enforcement accuracy
- [ ] Verify token counting accuracy
- [ ] Review Stripe webhook logs

---

## Architecture Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (OpenClaw)                        │
└────────────────┬────────────────────────────────────────────────┘
                 │ HTTP Request with X-API-Key
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COSTSHIELD CLOUD API                         │
│                      (Node.js/Express)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 1. Auth Middleware                                        │ │
│  │    - Validate API key (hash & lookup)                     │ │
│  │    - Load user context                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 2. Rate Limiting Middleware (Redis)                       │ │
│  │    - Check Redis: incr ratelimit:{userId}                 │ │
│  │    - Return 429 if exceeded                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 3. Budget Check (PostgreSQL)                              │ │
│  │    - SELECT FOR UPDATE on budgets table                   │ │
│  │    - Estimate cost (tiktoken + pricing)                   │ │
│  │    - Create pre-authorization hold                        │ │
│  │    - Return 429 if insufficient budget                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 4. Proxy Handler                                          │ │
│  │    - Decrypt user's OpenAI API key (AES-256-GCM)          │ │
│  │    - Forward request to OpenAI API                        │ │
│  │    - Stream response back to client                       │ │
│  │    - Count tokens (tiktoken + usage object)               │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 5. Post-Processing (Async)                                │ │
│  │    - Calculate actual cost                                │ │
│  │    - Release pre-auth hold                                │ │
│  │    - Update budget (current_usage += actual_cost)         │ │
│  │    - Log request to requests table                        │ │
│  │    - Send alerts if budget thresholds crossed             │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ├──────────────────┬──────────────────┬───────────
                 ▼                  ▼                  ▼
         ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐
         │  PostgreSQL   │  │    Redis     │  │   OpenAI API     │
         │               │  │              │  │                  │
         │ - users       │  │ - rate       │  │ - /chat/        │
         │ - budgets     │  │   limits     │  │   completions   │
         │ - requests    │  │ - session    │  │                  │
         │ - api_keys    │  │   cache      │  │                  │
         └───────────────┘  └──────────────┘  └──────────────────┘
```

---

## Technology Stack Recommendations

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js
- **Language**: JavaScript (TypeScript optional for larger teams)
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **ORM**: Prisma (optional) or raw SQL with `pg` driver

### Security
- **Password Hashing**: Argon2id
- **JWT**: `jsonwebtoken`
- **Encryption**: Node.js `crypto` module (AES-256-GCM)
- **Security Headers**: Helmet.js
- **Input Validation**: Joi

### Infrastructure
- **Hosting**: Railway (MVP) or Render (Production)
- **Database**: Managed PostgreSQL (Railway/Render/DigitalOcean)
- **Redis**: Managed Redis (Railway/Render/Redis Cloud)
- **CDN**: Cloudflare (optional)
- **Monitoring**: Datadog or Logtail
- **Error Tracking**: Sentry

### Payment
- **Provider**: Stripe
- **Integration**: Official Stripe Node.js SDK

### Email
- **Provider**: SendGrid or Resend
- **Templates**: Handlebars

### OpenAI
- **Library**: Official OpenAI Node.js SDK
- **Token Counting**: tiktoken

---

## Conclusion

This document provides a comprehensive foundation for building CostShield Cloud. By following these guidelines and anticipating common pitfalls, you can build a secure, scalable, and production-ready OpenAI proxy SaaS.

### Next Steps

1. **Setup Development Environment**
   - Initialize Node.js project
   - Setup PostgreSQL and Redis locally (Docker Compose)
   - Configure environment variables

2. **Implement Core Features (Priority Order)**
   - User authentication (signup, login, email verification)
   - API key management
   - Budget enforcement with database transactions
   - OpenAI proxy with streaming
   - Token counting and cost calculation

3. **Add Payment Integration**
   - Stripe checkout
   - Webhook handling
   - Subscription management

4. **Deploy to Staging**
   - Railway/Render staging environment
   - Run integration tests
   - Load testing

5. **Launch MVP**
   - Deploy to production
   - Monitor closely
   - Iterate based on feedback

**Good luck building CostShield Cloud!** 🚀
