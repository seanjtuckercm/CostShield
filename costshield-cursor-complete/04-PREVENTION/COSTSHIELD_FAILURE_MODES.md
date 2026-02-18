# CostShield Cloud: Comprehensive Failure Modes & Anti-Patterns Analysis

## Executive Summary

This document provides a comprehensive analysis of all potential failure modes, anti-patterns, and security vulnerabilities that could affect CostShield Cloud, an OpenAI API proxy service with budget enforcement and multi-tenant SaaS capabilities.

### Most Critical Failure Modes (Prioritized by Risk)

#### 🔴 CRITICAL - Catastrophic Impact
1. **Multi-Tenant Data Leakage** - Cross-tenant database queries exposing sensitive data
2. **Budget Enforcement Race Conditions** - Concurrent requests bypassing budget limits
3. **Authentication Bypass Vulnerabilities** - JWT/session hijacking compromising accounts
4. **Payment Webhook Forgery** - Unauthenticated webhooks leading to billing fraud
5. **API Key Exposure** - Hardcoded secrets or leaked keys in code/logs

#### 🟠 HIGH - Severe Impact
6. **SQL Injection / Authorization Failures** - BOLA/IDOR vulnerabilities
7. **Token Counting Errors** - Inaccurate billing and budget miscalculations
8. **Database Connection Pool Exhaustion** - Complete service outage
9. **OpenAI Rate Limit Cascading Failures** - Service unavailability
10. **Missing Database Indexes** - Catastrophic performance degradation

#### 🟡 MEDIUM - Significant Impact
11. **Streaming Response Failures** - Incomplete OpenAI responses
12. **Deployment Configuration Errors** - Production environment misconfiguration
13. **Cache Poisoning** - Cross-tenant cached data exposure
14. **N+1 Query Problems** - Severe performance bottlenecks
15. **Horizontal Scaling Issues** - Data inconsistency during scale-out

---

## Table of Contents

1. [API Proxy Service Anti-Patterns](#1-api-proxy-service-anti-patterns)
2. [Multi-Tenant SaaS Security Failures](#2-multi-tenant-saas-security-failures)
3. [Security Vulnerabilities](#3-security-vulnerabilities)
4. [Token Counting Errors](#4-token-counting-errors)
5. [Budget Enforcement Failures](#5-budget-enforcement-failures)
6. [Database Design Mistakes](#6-database-design-mistakes)
7. [Performance Pitfalls](#7-performance-pitfalls)
8. [Authentication/Authorization Mistakes](#8-authenticationauthorization-mistakes)
9. [Payment Integration Pitfalls](#9-payment-integration-pitfalls)
10. [Cost Calculation Errors](#10-cost-calculation-errors)
11. [Deployment Mistakes](#11-deployment-mistakes)
12. [Scaling Issues](#12-scaling-issues)
13. [OpenAI API Specific Issues](#13-openai-api-specific-issues)
14. [Real-World Failure Examples](#14-real-world-failure-examples)
15. [Edge Cases Not Handled](#15-edge-cases-not-handled)
16. [Monitoring & Observability Failures](#16-monitoring--observability-failures)
17. [User Experience Mistakes](#17-user-experience-mistakes)
18. [Business Logic Errors](#18-business-logic-errors)
19. [Critical Failure Scenarios](#critical-failure-scenarios-top-10)
20. [Security Vulnerabilities Checklist](#security-vulnerabilities-checklist)
21. [Performance Pitfalls Checklist](#performance-pitfalls-checklist)
22. [Testing Strategy for Failure Modes](#testing-strategy-for-failure-modes)
23. [Incident Response Plan](#incident-response-plan)

---

## 1. API Proxy Service Anti-Patterns

### 1.1 Request/Response Handling Errors

#### What Could Go Wrong
- **Accessing Payload When Streaming Enabled**: When streaming is enabled, the message content is not accessible to policies, leading to incomplete processing or errors
- **Not Handling HTTP Method Variations**: Treating all HTTP methods the same (tunneling everything through GET/POST) breaks RESTful semantics
- **Ignoring Response Codes**: Returning only 200 or 500 prevents clear communication of outcomes to clients
- **Improper Header Forwarding**: Missing or incorrectly forwarding headers like `Authorization`, `Content-Type`, `X-Forwarded-For`
- **URL Encoding Issues**: Not properly URL-encoding special characters when forwarding requests

#### Why It Happens
- Developers use shortcut methods without understanding HTTP semantics
- Streaming configuration is enabled but policies still try to access body
- Lack of understanding of HTTP protocol nuances
- Using simple string concatenation instead of proper URL building libraries

#### Real-World Examples
- **Apigee Anti-Pattern**: "Accessing the request/response payload when streaming is enabled" causes policies to fail silently
- **Microsoft Azure**: URL encoding discrepancies between proxy and backend caused XSS vulnerabilities
- **Nginx Misconfiguration**: Path traversal via `/../` when normalization differs from backend

#### Prevention Strategies
- Use proper HTTP client libraries that handle encoding/decoding
- Never access message body when streaming is enabled
- Implement middleware for header sanitization and validation
- Use framework-specific reverse proxy utilities (e.g., `httputil.ReverseProxy` in Go)
- Test with various HTTP methods, not just GET/POST

#### Detection Methods
- Integration tests with different HTTP methods
- Security scanners for path traversal vulnerabilities
- Monitor for 4xx/5xx error rate spikes
- Log analysis for header-related errors

#### Recovery Procedures
- Implement graceful degradation (return 502/503 on proxy errors)
- Circuit breaker pattern to prevent cascading failures
- Rollback to last known good proxy configuration
- Enable detailed error logging for debugging

### 1.2 Streaming Implementation Failures

#### What Could Go Wrong
- **Proxy Buffering**: Proxy collects entire response before forwarding, negating streaming benefits
- **Missing Flush Operations**: Not calling `Flush()` after writing chunks leads to buffered output
- **HTTP/2 vs HTTP/1.1 Incompatibilities**: Forcing HTTP/2 when streaming works better with HTTP/1.1
- **Content-Encoding Interference**: Compression middleware buffering responses
- **Connection Timeout During Stream**: Long-running streams timing out before completion

#### Why It Happens
- Using `io.ReadAll(r.Body)` instead of streaming approach
- Not implementing `http.Flusher` interface correctly
- Middleware (compression, logging) interfering with stream
- Default HTTP client timeout too short for long streams
- Missing `Connection: keep-alive` headers

#### Real-World Examples
- **Go Proxy Issue**: Using `bufio.Scanner` without re-appending newlines broke streaming
- **API Gateway**: "Streaming responses are being buffered by a proxy in your network environment" error
- **OpenAI Proxy**: Streams stopping prematurely when responses are long

#### Prevention Strategies
```go
// Correct streaming implementation in Go
flusher, ok := w.(http.Flusher)
if !ok {
    http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
    return
}

scanner := bufio.NewScanner(resp.Body)
for scanner.Scan() {
    w.Write(scanner.Bytes())
    w.Write([]byte("\n")) // Re-append newline
    flusher.Flush()
}
```

- Use `httputil.ReverseProxy` with `FlushInterval: -1`
- Set `Content-Encoding: none` header to prevent compression
- Configure longer timeouts for streaming endpoints
- Disable buffering in proxy configuration

#### Detection Methods
- Test streaming endpoints with large responses
- Monitor "first byte time" vs "total response time"
- Client-side validation of chunked response format
- Load testing with concurrent streaming requests

#### Recovery Procedures
- Fall back to non-streaming mode if streaming fails
- Implement retry logic with exponential backoff
- Provide connection health checks before starting stream
- Log stream interruptions for analysis

### 1.3 Connection Pooling Errors

#### What Could Go Wrong
- **Pool Exhaustion**: All connections consumed, new requests wait indefinitely
- **Connection Leaks**: Connections not returned to pool after use
- **Stale Connections**: Long-lived connections becoming invalid
- **Improper Pool Sizing**: Pool too small for load or too large wasting resources
- **Missing Connection Validation**: Using dead connections from pool

#### Why It Happens
- Not closing connections in `finally` blocks
- Misconfigured `maxConnections` and `maxIdleTime`
- No connection health checks before reuse
- Backend server has lower max connections than proxy pool
- Network issues causing hung connections

#### Real-World Examples
- **Spring Cloud Gateway**: OOM errors with 1000 connection fixed pool under high load
- **Netty Memory Leak**: `EpollSocketChannel` instances retaining memory
- **AWS Lambda**: Connection pool exhaustion due to concurrent invocations

#### Prevention Strategies
- Use context managers / `try-finally` to ensure connection release
- Configure `maxConnections` based on backend capacity
- Set `maxIdleTime` and `maxLifeTime` for connections
- Implement connection validation (ping) before use
- Monitor connection pool metrics (active, idle, waiting)

#### Detection Methods
- Track connection pool utilization percentage
- Alert on waiting request queue depth
- Monitor connection creation/destruction rate
- Log connection acquisition timeout errors

#### Recovery Procedures
- Aggressively close idle connections
- Restart connection pool (drain and recreate)
- Scale up backend to increase connection capacity
- Implement request queuing with timeout

### 1.4 Memory Leaks in Proxies

#### What Could Go Wrong
- **ByteBuf Not Released**: Netty `ByteBuf` objects not explicitly released
- **Growing Request/Response Buffers**: Unbounded buffer growth for large payloads
- **Cached Response Accumulation**: Cache growing without eviction policy
- **Event Loop Thread Leaks**: Background threads not properly shutdown

#### Why It Happens
- Direct memory management in Netty not handled correctly
- Missing `ByteBuf.release()` calls in error paths
- No maximum size limit on in-memory buffers
- Cache without TTL or size limits
- Improper shutdown of async event loops

#### Real-World Examples
- **Netty Leak**: "LEAK: ByteBuf.release() was not called before garbage-collected"
- **API Gateway**: Memory consumption growing until OOM crash
- **Node.js Proxy**: Event listeners not removed causing memory leak

#### Prevention Strategies
- Enable Netty leak detection: `-Dio.netty.leakDetectionLevel=advanced`
- Use `try-finally` with `ByteBuf.release()`
- Set maximum request/response size limits
- Implement LRU cache with size limits
- Proper lifecycle management for event loops

#### Detection Methods
- Monitor heap memory growth over time
- Track `ByteBuf` allocation vs release
- Heap dump analysis to identify retained objects
- Load testing with sustained traffic

#### Recovery Procedures
- Automated restart on memory threshold
- Graceful shutdown and restart of proxy instances
- Dump heap for offline analysis
- Scale horizontally to distribute load

---

## 2. Multi-Tenant SaaS Security Failures

### 2.1 Data Leakage Between Tenants

#### What Could Go Wrong
- **Missing Tenant Filter in SQL**: Queries without `WHERE tenant_id = ?` returning all data
- **Shared Cache Poisoning**: Cache key without tenant ID prefix
- **Connection Pool Contamination**: Database session context (tenant_id) not reset between requests
- **Asynchronous Context Leaks**: Global variables in async code causing identity swapping
- **Cross-Tenant API Access**: API endpoints not validating tenant ownership of resources

#### Why It Happens
- **Application-Layer Isolation Only**: Relying solely on application code for filtering
- **ORM Bypasses**: Raw SQL queries or `find_by_id()` bypassing tenant scope
- **Missing RLS**: No Row-Level Security at database level
- **Race Conditions**: Async operations reading/writing wrong tenant context
- **Shared State**: Using singletons or global variables for tenant context

#### Real-World Examples
- **Microsoft Azure "ChaosDB" (2021)**: Jupyter Notebook feature allowed access to other customers' databases
- **Capital One Breach (2019)**: Misconfigured WAF in multi-tenant environment exposed 100M+ records
- **Nopcommerce (CVE-2024-58248)**: Lack of locking for order placement allowed duplicate gift card redeeming

#### Prevention Strategies

**Database Level**:
```sql
-- Enable Row-Level Security (PostgreSQL)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON api_keys
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**Application Level**:
```python
# Always use tenant-scoped queries
class TenantScopedQuerySet(models.QuerySet):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not hasattr(self, '_tenant_id'):
            raise ValueError("Tenant ID must be set")
    
    def filter(self, *args, **kwargs):
        return super().filter(tenant_id=self._tenant_id, *args, **kwargs)
```

**Cache Keys**:
```python
# Always prefix cache keys with tenant ID
cache_key = f"tenant:{tenant_id}:api_key:{key_id}"
```

**Connection Pool Reset**:
```python
# Reset session variables before returning connection to pool
await connection.execute("SELECT set_config('app.current_tenant_id', '', true);")
```

#### Detection Methods
- **Cross-Tenant Test Suite**: Automated tests attempting to access other tenant's data
- **SQL Query Analysis**: Scan all queries for missing tenant_id clause
- **Audit Log Analysis**: Monitor for users accessing unexpected tenant resources
- **Cache Hit Ratio by Tenant**: Abnormal cache hit rates may indicate poisoning

#### Recovery Procedures
- **Immediate Tenant Isolation**: Disable affected accounts until audit complete
- **Data Access Audit**: Review all access logs to identify compromised data
- **Forced Password Reset**: Require re-authentication for all tenants
- **Incident Notification**: GDPR/compliance notifications if PII exposed

### 2.2 Noisy Neighbor Problems

#### What Could Go Wrong
- **CPU Monopolization**: One tenant's heavy compute workload starving others
- **Memory Exhaustion**: Large dataset processing consuming all available RAM
- **Database I/O Saturation**: Heavy write operations blocking other tenants
- **Connection Pool Monopolization**: One tenant consuming all database connections
- **API Rate Limiting Bypass**: One tenant overwhelming shared infrastructure

#### Why It Happens
- No resource quotas per tenant
- Unbounded query complexity allowed
- Shared infrastructure without isolation
- Missing rate limiting at tenant level
- No priority queuing for tenant requests

#### Real-World Examples
- **AWS Lambda**: One customer's burst traffic affecting others in shared infrastructure
- **Multi-Tenant Database**: Poorly optimized query from one tenant causing 100% CPU
- **Snowflake**: Customer workloads competing for compute resources

#### Prevention Strategies
- **Per-Tenant Resource Quotas**: CPU, memory, connection limits
- **Query Complexity Limits**: Maximum query execution time, row scan limits
- **Priority Queuing**: Premium tenants get higher priority
- **Circuit Breakers**: Automatically throttle or isolate abusive tenants
- **Separate Compute Tiers**: Isolate high-usage tenants to dedicated resources

```python
# Rate limiting per tenant
@rate_limit(key=lambda: f"tenant:{get_current_tenant()}", rate="100/m")
def api_endpoint():
    pass

# Query timeout per tenant
query = session.query(Model).execution_options(timeout=10.0)
```

#### Detection Methods
- Monitor CPU/memory usage per tenant
- Track query execution time by tenant
- Connection pool utilization by tenant
- Alert on resource usage anomalies

#### Recovery Procedures
- Automatically throttle high-usage tenant
- Move tenant to isolated infrastructure
- Contact tenant about optimization
- Temporary suspension if abuse continues

---

## 3. Security Vulnerabilities

### 3.1 API Key Exposure

#### What Could Go Wrong
- **Hardcoded Keys in Source Code**: API keys committed to Git repositories
- **Leaked in Logs**: Keys printed in application or web server logs
- **Exposed in Client-Side Code**: Keys embedded in JavaScript or mobile apps
- **Insecure Environment Variables**: `.env` files committed to Git
- **Transmitted Over HTTP**: Keys sent in plaintext without encryption

#### Why It Happens
- Developers hardcode keys for "temporary" testing
- Verbose logging in production
- Misunderstanding of client-side vs server-side security
- Lack of `.gitignore` configuration
- Missing TLS/SSL configuration

#### Real-World Examples
- **GitHub Breach (2024)**: 13 million API secrets exposed in public repositories
- **Tesla API Key (2021)**: Hardcoded keys in open-source code
- **xAI API Key Leak (2025)**: Private API key published on GitHub

#### Prevention Strategies
- **Never Commit Secrets**: Use environment variables, secret managers
- **Secret Scanning**: GitHub Advanced Security, TruffleHog, Gitleaks
- **Encrypt Keys at Rest**: Use KMS, HashiCorp Vault, AWS Secrets Manager
- **Rotate Keys Regularly**: 60-90 day rotation cycle
- **Scope Keys Minimally**: Read-only keys where possible

```bash
# Pre-commit hook to detect secrets
#!/bin/sh
gitleaks detect --source . --verbose --no-git
```

#### Detection Methods
- Automated secret scanning in CI/CD
- Monitor for unusual API usage patterns
- Audit logs for access from unexpected IPs
- Alert on multiple keys compromised

#### Recovery Procedures
1. **Immediate Revocation**: Disable compromised keys
2. **Impact Assessment**: Review logs for malicious usage
3. **Notify Customers**: If customer keys exposed
4. **Generate New Keys**: Issue replacement keys
5. **Post-Mortem**: Document how exposure occurred

### 3.2 SQL Injection Vectors

#### What Could Go Wrong
- **Unsanitized User Input in Queries**: String concatenation instead of parameterized queries
- **Second-Order SQL Injection**: Stored data used in later queries without sanitization
- **ORM Bypass Vulnerabilities**: Using raw SQL with string interpolation
- **Blind SQL Injection**: Extracting data through timing or error responses

#### Why It Happens
- Using `f-strings` or string concatenation for SQL
- Trusting data from database (second-order)
- ORM misuse (`.raw()`, `.extra()` methods)
- Lack of input validation

#### Real-World Examples
- **Equifax Breach (2017)**: SQL injection in web application
- **Login Bypass**: `' OR '1'='1` in password field
- **Data Exfiltration**: `UNION SELECT` extracting sensitive data

#### Prevention Strategies
```python
# BAD - String concatenation
query = f"SELECT * FROM users WHERE tenant_id = '{tenant_id}'"

# GOOD - Parameterized query
query = "SELECT * FROM users WHERE tenant_id = %s"
cursor.execute(query, (tenant_id,))

# GOOD - ORM with proper filtering
User.objects.filter(tenant_id=tenant_id)
```

- Use parameterized queries ALWAYS
- Input validation (whitelist, type checking)
- Principle of least privilege for database users
- WAF with SQL injection rules

#### Detection Methods
- Static code analysis (Bandit, Semgrep)
- Dynamic security testing (OWASP ZAP, Burp Suite)
- Monitor for SQL error messages in logs
- Anomaly detection on query patterns

#### Recovery Procedures
- Immediately patch vulnerable code
- Review logs for exploitation attempts
- Audit all queries for similar vulnerabilities
- Notify affected users if data compromised

### 3.3 JWT Vulnerabilities

#### What Could Go Wrong
- **Algorithm Confusion Attack**: Changing `alg` from RS256 to HS256, using public key as secret
- **None Algorithm Accepted**: Server accepting `alg: "none"` tokens
- **Weak Secret Keys**: Using `"secret"` or short, guessable keys
- **No Signature Verification**: Using `decode()` instead of `verify()`
- **Missing Expiration Validation**: Accepting expired tokens

#### Why It Happens
- Using JWT library's decode method without verification
- Not explicitly rejecting `alg: "none"`
- Weak key generation
- Misconfigured JWT library
- Trusting client-supplied algorithm

#### Real-World Examples
- **Auth0 CVE-2018-0114**: Embedded JWK parameter allowed forged tokens
- **jwt-go Library**: Default allowed `alg: "none"` in older versions

#### Prevention Strategies
```python
# BAD - No verification
import jwt
token = jwt.decode(token_string, verify=False)

# GOOD - Proper verification
token = jwt.decode(
    token_string,
    secret_key,
    algorithms=['HS256'],  # Explicit algorithm
    options={
        'verify_signature': True,
        'verify_exp': True,
        'require': ['exp', 'iat', 'sub']
    }
)
```

- Always verify signature
- Explicitly specify allowed algorithms
- Use strong, random secret keys (32+ characters)
- Validate expiration, issuer, audience
- Rotate signing keys regularly

#### Detection Methods
- Security testing tools (jwt_tool)
- Monitor for token validation failures
- Audit auth implementation regularly
- Alert on unusual token patterns

#### Recovery Procedures
- Immediately fix JWT validation
- Revoke all existing tokens (force re-login)
- Issue incident advisory
- Audit for unauthorized access

### 3.4 Session Hijacking

#### What Could Go Wrong
- **Session Fixation**: Attacker provides session ID before authentication
- **Session ID Prediction**: Sequential or guessable session IDs
- **XSS-Based Token Theft**: JavaScript stealing session cookies
- **Man-in-the-Middle**: Session hijacked over unencrypted connection
- **Session Not Invalidated on Logout**: Old session remains valid

#### Why It Happens
- Not regenerating session ID after login
- Weak randomness in session ID generation
- Missing `HttpOnly` and `Secure` flags
- No HTTPS enforcement
- Sessions not properly destroyed

#### Prevention Strategies
```javascript
// Set secure cookie flags
res.cookie('session', sessionId, {
    httpOnly: true,  // Prevent JavaScript access
    secure: true,    // HTTPS only
    sameSite: 'strict', // CSRF protection
    maxAge: 3600000  // 1 hour expiration
});
```

- Regenerate session ID after login
- Use cryptographically secure random IDs
- Set `HttpOnly`, `Secure`, `SameSite` flags
- Enforce HTTPS
- Implement session timeout
- Destroy sessions on logout

#### Detection Methods
- Monitor for multiple IPs using same session
- Alert on geographically impossible session usage
- Track session creation/destruction patterns
- Anomaly detection on user behavior

#### Recovery Procedures
- Terminate suspicious sessions immediately
- Force re-authentication for all users
- Review session management implementation
- Notify affected users

---

*[Document continues with remaining 15 sections...]*



## 4. Token Counting Errors

### 4.1 Discrepancies Between Local and API Counts

#### What Could Go Wrong
- **Tiktoken vs Actual Tokens**: Local `tiktoken` count differs from OpenAI's actual count by 30-50%
- **Hidden Tool Call Tokens**: Internal tool calls, file search documents not exposed but counted
- **Container Format Overhead**: Chat message formatting adds tokens not visible in prompt
- **System Messages**: Hidden system instructions adding significant tokens
- **Input Array Length Impact**: More items in embedding API arrays = higher pessimistic estimation

#### Why It Happens
- OpenAI's API applies "pessimistic estimation" for arrays
- Internal tool calls (file search, code interpreter) not exposed to user
- Chat message format wrapping adds overhead
- System prompts injected by OpenAI
- `tiktoken` is an approximation, not exact

#### Real-World Examples
- **Embedding API**: 50% discrepancy between `tiktoken` count and actual API count
- **Assistants API**: "How do I count tokens?" - impossible to predict accurately
- **GPT-5 API**: "Very high token count" even with options set to "low"

#### Prevention Strategies
- Add 20-30% safety margin to `tiktoken` estimates
- Monitor actual vs estimated token usage
- Use OpenAI's `usage` field in responses as source of truth
- Track token count discrepancies per model
- Implement conservative budget alerts

```python
# Conservative token estimation
estimated_tokens = tiktoken_count(prompt)
safe_estimate = int(estimated_tokens * 1.3)  # 30% buffer
```

#### Detection Methods
- Compare `tiktoken` count vs `usage.total_tokens` from API
- Alert when discrepancy exceeds threshold
- Track per-model token counting accuracy
- Monitor budget exhaustion patterns

#### Recovery Procedures
- Adjust budget calculations based on observed discrepancies
- Provide clear communication to users about estimation accuracy
- Implement real-time usage tracking
- Refund users for significant overcharges

### 4.2 Streaming Token Count Issues

#### What Could Go Wrong
- **No Token Count in Stream**: Streaming responses don't include token count until end
- **Stream Interruption**: Token count lost if stream fails mid-response
- **Buffering Issues**: Partial tokens causing count inaccuracies
- **Multiple Tool Calls**: Repeated tool usage extending context automatically

#### Why It Happens
- Token count only available in final chunk
- Stream can fail before final chunk received
- Partial UTF-8 characters at chunk boundaries
- AI using tools multiple times without limit

#### Prevention Strategies
- Track token count from final stream chunk
- Estimate tokens if stream fails (`tiktoken` on partial response)
- Implement `max_tool_calls` and `parallel_tool_calls` limits
- Budget buffer for potential tool call overhead

```python
# Track streaming tokens
total_tokens = 0
for chunk in stream:
    if chunk.usage:
        total_tokens = chunk.usage.total_tokens
    yield chunk

if total_tokens == 0:
    # Estimate if final chunk not received
    total_tokens = estimate_tokens(accumulated_response)
```

#### Detection Methods
- Monitor stream failure rates
- Compare estimated vs actual tokens for completed streams
- Alert on budget exhaustion without token count
- Track tool call frequency

#### Recovery Procedures
- Use last known good token count
- Conservative estimation for failed streams
- Manual review of high-usage sessions
- Implement fallback counting methods

---

## 5. Budget Enforcement Failures

### 5.1 Race Conditions in Budget Checks

#### What Could Go Wrong
- **TOCTOU (Time-of-Check-Time-of-Use)**: Budget checked, but consumed by another request before use
- **Concurrent Request Bypass**: Multiple requests check budget simultaneously, all pass, total exceeds limit
- **Database Read-Then-Write Gap**: Reading current usage, calculating new usage, writing back (not atomic)
- **Distributed System Delays**: Different proxy instances with stale budget data
- **Single-Packet Attack**: Attacker sends multiple requests in single TCP packet to exploit timing

#### Why It Happens
- No database-level locks or atomic operations
- Naive implementation: `SELECT usage, then UPDATE usage`
- Distributed cache inconsistency
- No synchronization between proxy instances
- High concurrency stress testing not performed

#### Real-World Examples
- **Gift Card Race Condition (nopCommerce CVE-2024-58248)**: Duplicate redeeming via concurrent orders
- **Account Balance Race Condition**: Two withdrawals processed, account goes negative
- **API Key Rate Limit Bypass**: Multiple requests sent via HTTP/2 single-packet technique

#### Prevention Strategies

**Database-Level Atomicity**:
```sql
-- BAD: Read-then-write (race condition)
SELECT usage FROM budgets WHERE tenant_id = ?;
-- App calculates new usage
UPDATE budgets SET usage = ? WHERE tenant_id = ?;

-- GOOD: Atomic increment with constraint check
UPDATE budgets 
SET usage = usage + ? 
WHERE tenant_id = ? AND usage + ? <= limit
RETURNING usage;

-- If affected rows = 0, budget exceeded
```

**Pessimistic Locking**:
```sql
-- Lock row during transaction
SELECT usage FROM budgets WHERE tenant_id = ? FOR UPDATE;
-- Perform checks
UPDATE budgets SET usage = ? WHERE tenant_id = ?;
COMMIT;
```

**Optimistic Locking with Versioning**:
```python
class Budget(Model):
    tenant_id = Column(UUID)
    usage = Column(Numeric)
    limit = Column(Numeric)
    version = Column(Integer, default=1)

# Update with version check
updated = session.query(Budget).filter(
    Budget.tenant_id == tenant_id,
    Budget.version == old_version,
    Budget.usage + new_usage <= Budget.limit
).update({
    'usage': Budget.usage + new_usage,
    'version': Budget.version + 1
})

if updated == 0:
    raise BudgetExceeded()
```

**Redis Atomic Operations**:
```python
# Atomic increment with Lua script
lua_script = """
local current = tonumber(redis.call('GET', KEYS[1]) or "0")
local limit = tonumber(ARGV[1])
local increment = tonumber(ARGV[2])

if current + increment <= limit then
    redis.call('INCRBY', KEYS[1], increment)
    return 1
else
    return 0
end
"""

result = redis.eval(lua_script, 1, f"budget:{tenant_id}", limit, usage)
if result == 0:
    raise BudgetExceeded()
```

#### Detection Methods
- Stress testing with concurrent requests
- Monitor for usage slightly exceeding limits
- Track budget violations per tenant
- Use single-packet attack testing tools (Burp Turbo Intruder)

#### Recovery Procedures
- Temporarily suspend tenant if severe overage
- Refund accidental overcharges
- Implement stricter locking immediately
- Audit all budget transactions for discrepancies

### 5.2 Budget Reset Timing Bugs

#### What Could Go Wrong
- **Timezone Confusion**: Reset at midnight UTC vs tenant's local time
- **Leap Second Issues**: Incorrect handling of 61-second minutes
- **DST Transitions**: Budget reset missing or duplicated during time change
- **Concurrent Reset and Usage**: Request processed during reset operation
- **Partial Reset Failure**: Some tenants reset successfully, others fail

#### Why It Happens
- Using local time instead of UTC
- Not accounting for timezone differences
- Race condition during reset operation
- No transaction wrapping reset operation
- Reset job failing midway through batch

#### Prevention Strategies
- Always use UTC for internal time tracking
- Store tenant timezone preference separately
- Atomic reset operation within transaction
- Idempotent reset (safe to run multiple times)
- Distributed lock for reset job

```python
# Budget reset with proper timing
from datetime import datetime, timezone

def reset_monthly_budgets():
    with distributed_lock('budget_reset'):
        now = datetime.now(timezone.utc)
        
        # Atomic reset operation
        session.execute("""
            UPDATE budgets
            SET usage = 0, last_reset = :now
            WHERE reset_period = 'monthly'
            AND (
                last_reset IS NULL
                OR last_reset < date_trunc('month', :now)
            )
        """, {'now': now})
        
        session.commit()
```

#### Detection Methods
- Monitor reset job execution time
- Alert on partial reset completion
- Track usage patterns around reset time
- Validate reset occurred for all tenants

#### Recovery Procedures
- Manual reset for affected tenants
- Audit usage logs to determine fair billing
- Implement reset retry logic
- Notify tenants of any billing adjustments

---

## 6. Database Design Mistakes

### 6.1 Missing Indexes on Foreign Keys

#### What Could Go Wrong
- **Slow Join Performance**: Foreign key joins causing full table scans
- **Lock Escalation**: Full table scans causing table-level locks
- **Cascading Delete Slowness**: ON DELETE CASCADE scanning entire child table
- **N+1 Query Amplification**: Missing index + N+1 = catastrophic performance

#### Why It Happens
- Foreign keys don't automatically create indexes in all databases
- Developers assume ORM handles indexing
- Indexes added only to primary keys
- Compound foreign keys not indexed

#### Real-World Examples
- **PostgreSQL**: Foreign keys don't auto-create indexes
- **Django ORM**: `select_related()` slow without foreign key index
- **Production Outage**: Query timeout after adding foreign key without index

#### Prevention Strategies
```sql
-- Add index on foreign key columns
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_usage_logs_api_key_id ON usage_logs(api_key_id);

-- Compound foreign key
CREATE INDEX idx_api_keys_tenant_org ON api_keys(tenant_id, organization_id);
```

- Index ALL foreign key columns
- Use database migration tools that auto-add FK indexes
- Review query plans regularly
- Monitor slow query logs

#### Detection Methods
- Analyze query execution plans (`EXPLAIN`)
- Monitor for "Seq Scan" in PostgreSQL
- Track query execution time per table
- Use database performance monitoring tools

#### Recovery Procedures
- Add missing indexes with `CREATE INDEX CONCURRENTLY`
- Temporarily scale up database resources
- Cache frequently accessed data
- Implement query timeout limits

### 6.2 Soft Deletes Anti-Pattern

#### What Could Go Wrong
- **Data Bloat**: Deleted records accumulate, slowing queries
- **Referential Integrity Complexity**: Cascade deletes don't work naturally
- **Query Overhead**: Every query needs `WHERE deleted_at IS NULL`
- **Unique Constraint Issues**: Can't recreate record with same unique value
- **Vacuum/Cleanup Inefficiency**: `VACUUM` can't reclaim space for soft-deleted rows

#### Why It Happens
- Desire to preserve data for auditing
- Fear of data loss
- Undo functionality requirements
- Regulatory compliance misconception

#### Real-World Examples
- **Soft Delete Users**: User re-registers with same email, constraint violation
- **Performance Degradation**: 90% of table is soft-deleted, queries crawling
- **Data Recovery Nightmare**: Restoring cascaded soft deletes across 20 tables

#### Prevention Strategies
- Use separate audit/archive tables instead
- Hard delete with event sourcing for history
- Time-based partitioning to archive old data
- Explicit `deleted` boolean only when truly needed

```sql
-- BAD: Soft delete everywhere
SELECT * FROM users WHERE deleted_at IS NULL;

-- GOOD: Separate audit table
CREATE TABLE users_audit (
    user_id UUID,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    snapshot JSONB
);

-- Hard delete from main table
DELETE FROM users WHERE user_id = ?;
-- Archive to audit table
INSERT INTO users_audit SELECT * FROM users WHERE user_id = ?;
```

#### Detection Methods
- Monitor percentage of soft-deleted rows
- Track query performance on soft-delete tables
- Analyze table bloat metrics
- Review slow queries for missing `deleted_at` filters

#### Recovery Procedures
- Implement automated archival process
- Hard delete records older than retention period
- `VACUUM FULL` to reclaim space (downtime required)
- Migrate to separate archive database

### 6.3 N+1 Query Problems

#### What Could Go Wrong
- **ORM Lazy Loading**: Fetching user, then each user's API keys in loop (1 + N queries)
- **Missing Eager Loading**: Not using `select_related()` / `prefetch_related()`
- **API Endpoints**: `/users` endpoint making 100+ queries for 10 users
- **Exponential Growth**: N+1 queries at multiple nesting levels

#### Why It Happens
- ORM defaults to lazy loading
- Developers not aware of query count
- Accessing related objects in templates/loops
- No query count monitoring in development

#### Real-World Examples
```python
# BAD: N+1 query
users = User.objects.all()  # 1 query
for user in users:
    print(user.api_keys.count())  # N queries

# GOOD: Eager loading
users = User.objects.prefetch_related('api_keys')
for user in users:
    print(user.api_keys.count())  # Still 1 query (prefetch)
```

#### Prevention Strategies
- Use `select_related()` for ForeignKey (SQL JOIN)
- Use `prefetch_related()` for ManyToMany / reverse FK (2 queries)
- Enable query logging in development
- Implement query count assertions in tests

```python
# Django test to prevent N+1
from django.test.utils import override_settings

@override_settings(DEBUG=True)
def test_user_list_queries(self):
    users = User.objects.bulk_create([User() for _ in range(10)])
    
    with self.assertNumQueries(2):  # 1 for users, 1 for prefetch
        users = User.objects.prefetch_related('api_keys')
        for user in users:
            list(user.api_keys.all())
```

#### Detection Methods
- Query logging in development/staging
- APM tools (New Relic, Datadog) detecting N+1
- Django Debug Toolbar showing query count
- Automated tests asserting max query count

#### Recovery Procedures
- Add eager loading to affected endpoints
- Implement caching for frequently accessed data
- Database read replicas for read-heavy endpoints
- Paginate large result sets

---

## 7. Performance Pitfalls

### 7.1 Database Connection Pool Exhaustion

#### What Could Go Wrong
- **All Connections Consumed**: New requests wait indefinitely or timeout
- **Connection Leaks**: Connections not released after use
- **Long-Running Queries**: Queries holding connections for minutes
- **Transaction Not Committed**: Forgotten `COMMIT` holding connection and locks
- **Async Method Deadlock**: `async void` methods not completing before connection release

#### Why It Happens
- `pool_size` too small for traffic
- Missing `try-finally` to ensure connection close
- Slow queries without timeout
- Transactions left open
- Incorrect async method signature

#### Real-World Examples
- **.NET SqlClient**: "Timeout expired. The timeout period elapsed prior to obtaining a connection from the pool"
- **Python SQLAlchemy**: "QueuePool limit of size X overflow Y reached"
- **HikariCP**: "Connection is not available, request timed out after 30000ms"

#### Prevention Strategies
```python
# ALWAYS use context manager
async with engine.begin() as conn:
    result = await conn.execute(query)
    # Connection automatically released

# Set connection timeout
engine = create_async_engine(
    database_url,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,  # Wait 30s before giving up
    pool_recycle=3600  # Recycle connections after 1 hour
)
```

- Set appropriate `pool_size` (typically 10-20 per application instance)
- Use context managers for connection handling
- Set query timeout limits
- Monitor connection pool metrics
- Connection validation on checkout

#### Detection Methods
- Track pool utilization percentage
- Alert on waiting request queue depth
- Monitor connection acquisition timeout errors
- Log connection creation/destruction rate

#### Recovery Procedures
- Aggressively close idle connections
- Restart connection pool (drain and recreate)
- Scale up database to increase `max_connections`
- Kill long-running queries
- Implement request queuing with timeout

### 7.2 Missing Database Indexes

#### What Could Go Wrong
- **Full Table Scans**: Queries scanning millions of rows
- **API Endpoint Timeouts**: `/api/v1/usage?tenant_id=X` taking 30+ seconds
- **Database CPU Saturation**: 100% CPU from sequential scans
- **Lock Contention**: Table scans causing lock escalation

#### Why It Happens
- Indexes not added during initial development
- Query patterns not anticipated
- Composite index not matching query order
- Indexes dropped accidentally during migration

#### Real-World Examples
```sql
-- Missing index on tenant_id
SELECT * FROM usage_logs WHERE tenant_id = '123' ORDER BY created_at DESC;
-- Execution plan: Seq Scan on usage_logs (cost=0.00..54321.00)

-- After adding index
CREATE INDEX idx_usage_logs_tenant_created ON usage_logs(tenant_id, created_at DESC);
-- Execution plan: Index Scan using idx_usage_logs_tenant_created (cost=0.00..123.45)
```

#### Prevention Strategies
- Index all foreign keys
- Index columns in `WHERE`, `ORDER BY`, `GROUP BY`
- Composite indexes for multi-column queries
- Partial indexes for filtered queries
- Use `EXPLAIN ANALYZE` before deploying queries

```sql
-- Composite index for common query pattern
CREATE INDEX idx_api_keys_tenant_active ON api_keys(tenant_id, is_active) 
WHERE deleted_at IS NULL;

-- Covering index (includes extra columns)
CREATE INDEX idx_usage_logs_tenant_created_covering 
ON usage_logs(tenant_id, created_at DESC) 
INCLUDE (tokens_used, cost);
```

#### Detection Methods
- Monitor slow query log
- Track queries with high row scan counts
- Database performance monitoring (pg_stat_statements)
- Alert on query execution time > threshold

#### Recovery Procedures
- Add missing indexes with `CREATE INDEX CONCURRENTLY` (no downtime)
- Temporarily cache affected queries
- Scale up database resources during index creation
- Review all query patterns for missing indexes

### 7.3 Cache Stampede

#### What Could Go Wrong
- **Simultaneous Cache Miss**: 1000 requests all hit cold cache, all query database
- **Database Overload**: Sudden spike to 1000x normal queries
- **Cascading Failure**: Database slowdown causes more cache timeouts
- **Cache Eviction Timing**: Popular key expires during peak traffic

#### Why It Happens
- All cache keys expire at same time
- No lock to prevent duplicate queries
- No stale-cache fallback
- High traffic + cold cache

#### Real-World Examples
- **Reddit Outage**: Cache invalidation causing database overload
- **Twitter**: Trending topic cache expiry causing stampede

#### Prevention Strategies
```python
# Probabilistic early expiration
import random

def fetch_with_early_expiration(key, ttl=3600, beta=1.0):
    value, expiry = cache.get(key, with_expiry=True)
    
    if value is None:
        # Cache miss - acquire lock
        with cache_lock(f"lock:{key}"):
            value = cache.get(key)
            if value is None:
                value = expensive_db_query()
                cache.set(key, value, ttl)
    else:
        # Probabilistic early refresh
        now = time.time()
        delta = expiry - now
        if delta < 0 or random.random() < beta * (ttl / delta):
            # Refresh in background
            background_refresh(key, expensive_db_query)
    
    return value
```

- Stagger cache expiration times
- Implement cache locking (only one request refreshes)
- Serve stale cache during refresh
- Use probabilistic early expiration
- Pre-warm cache after deployment

#### Detection Methods
- Monitor cache miss rate
- Track sudden spikes in database queries
- Alert on cache refresh time
- Monitor database connection pool usage

#### Recovery Procedures
- Immediately scale up database
- Implement aggressive caching (serve stale)
- Throttle incoming requests temporarily
- Pre-populate cache from read replica

---

## 8. Authentication/Authorization Mistakes

### 8.1 Broken Object Level Authorization (BOLA)

#### What Could Go Wrong
- **Sequential ID Enumeration**: `/api/keys/123` to `/api/keys/124` accessing other tenant's key
- **UUID Still Guessable**: UUIDs leaked in logs, easily tested
- **No Ownership Check**: Querying by ID without checking `tenant_id`
- **Indirect Object References**: Internal IDs exposed in APIs

#### Why It Happens
- Using `Model.get(id)` without tenant filter
- Assuming UUIDs provide security (they don't)
- Not validating resource ownership
- Trusting client-provided IDs

#### Real-World Examples
- **Peloton API**: Access any user's data by changing user ID in URL
- **Coinbase**: BOLA allowed "selling" Bitcoin user didn't own
- **McDonald's/Paradox**: Sequential IDs allowed access to 64M applicant records

#### Prevention Strategies
```python
# BAD: No authorization check
@app.get("/api/keys/{key_id}")
async def get_api_key(key_id: UUID):
    key = await db.get(APIKey, key_id)  # No tenant check!
    return key

# GOOD: Always check ownership
@app.get("/api/keys/{key_id}")
async def get_api_key(key_id: UUID, current_user: User = Depends(get_current_user)):
    key = await db.execute(
        select(APIKey)
        .where(APIKey.id == key_id)
        .where(APIKey.tenant_id == current_user.tenant_id)
    ).scalar_one_or_none()
    
    if not key:
        raise HTTPException(404, "API key not found")
    
    return key
```

- ALWAYS filter by `tenant_id` AND resource ID
- Use indirect reference maps (random tokens → actual IDs)
- Implement access control middleware
- Automated testing for cross-tenant access

#### Detection Methods
- Automated BOLA testing (Postman, Burp)
- Monitor for 404 errors (failed access attempts)
- Log all resource access with tenant ID
- Alert on access pattern anomalies

#### Recovery Procedures
- Immediately patch all affected endpoints
- Audit logs for unauthorized access
- Notify affected tenants
- Implement API security testing in CI/CD

### 8.2 JWT Token Vulnerabilities

#### What Could Go Wrong
- **Algorithm Confusion**: Changing `alg` from RS256 to HS256
- **None Algorithm**: Server accepting `alg: "none"` tokens
- **Weak Secret Keys**: Using `"secret"` or short keys
- **No Signature Verification**: Using `decode()` without verification
- **Missing Expiration Validation**: Accepting expired tokens
- **Token Revocation Issues**: No blacklist for compromised tokens

#### Why It Happens
- Using JWT library incorrectly
- Not explicitly rejecting dangerous algorithms
- Weak key generation
- Misunderstanding JWT security model
- No token revocation strategy

#### Real-World Examples
- **Auth0 CVE-2018-0114**: JWK parameter allowed forged tokens
- **jwt-go Library**: Default allowed `alg: "none"` in older versions

#### Prevention Strategies
```python
from jose import jwt, JWTError
from datetime import datetime, timedelta

# Generate token
def create_access_token(data: dict, expires_delta: timedelta = timedelta(hours=1)):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    
    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,  # Strong, random key
        algorithm="HS256"
    )

# Verify token
def verify_token(token: str):
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"],  # Explicit algorithm
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
                "require_exp": True,
                "require_iat": True
            }
        )
        
        # Additional validation
        if payload.get("sub") is None:
            raise ValueError("Missing subject")
        
        # Check revocation list
        if is_token_revoked(payload["jti"]):
            raise ValueError("Token has been revoked")
        
        return payload
    except JWTError:
        raise ValueError("Invalid token")
```

- Always verify signature
- Explicitly specify allowed algorithms
- Use strong, random secret keys (32+ characters)
- Validate expiration, issuer, audience
- Implement token revocation (Redis blacklist)
- Rotate signing keys regularly
- Use short expiration times (1-2 hours)

#### Detection Methods
- Security testing tools (jwt_tool)
- Monitor for token validation failures
- Track token usage patterns
- Alert on unusual token patterns

#### Recovery Procedures
- Immediately fix JWT validation
- Revoke all existing tokens (force re-login)
- Issue security advisory
- Audit for unauthorized access
- Rotate signing keys

---

## 9. Payment Integration Pitfalls

### 9.1 Webhook Security Failures

#### What Could Go Wrong
- **Webhook Forgery**: Attacker sends fake payment success webhook
- **Missing Signature Verification**: Not validating Stripe signature
- **Replay Attacks**: Same webhook processed multiple times
- **IP Whitelist Bypass**: Not validating source IP
- **Webhook URL Discovery**: Predictable webhook URLs

#### Why It Happens
- Not reading payment provider documentation
- Assuming webhooks are authenticated by default
- No idempotency checks
- Webhook endpoint publicly accessible
- Using simple URLs like `/webhooks/stripe`

#### Real-World Examples
- **Payment Bypass**: Attacker sends fake `payment_intent.succeeded` webhook
- **Bubble.io Forum**: Discussion on Stripe webhook security concerns
- **Double Charging**: Webhook retries causing duplicate processing

#### Prevention Strategies
```python
from stripe import Webhook
import stripe

@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        # Verify webhook signature
        event = Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        # Invalid payload
        raise HTTPException(400, "Invalid payload")
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        raise HTTPException(400, "Invalid signature")
    
    # Check timestamp to prevent replay attacks
    timestamp = event.created
    if abs(time.time() - timestamp) > 300:  # 5 minutes
        raise HTTPException(400, "Timestamp too old")
    
    # Idempotency check
    event_id = event.id
    if await is_event_processed(event_id):
        return {"status": "already_processed"}
    
    # Process event
    if event.type == "payment_intent.succeeded":
        await handle_successful_payment(event.data.object)
    
    # Mark as processed
    await mark_event_processed(event_id)
    
    return {"status": "success"}
```

- ALWAYS verify webhook signatures
- Check timestamp to prevent replay attacks
- Implement idempotency (process each webhook once)
- Use random, unguessable webhook URLs
- Optional: IP whitelist for webhook source
- Return 200 quickly, process async

#### Detection Methods
- Monitor for unverified webhook attempts
- Track webhook processing time
- Alert on duplicate event IDs
- Log webhook signature failures

#### Recovery Procedures
- Immediately enable signature verification
- Review all payment transactions for fraud
- Suspend accounts with suspicious payments
- Implement webhook retry handling

### 9.2 Webhook Idempotency Failures

#### What Could Go Wrong
- **Duplicate Payment Processing**: Webhook retries causing double charges
- **Subscription Conflicts**: Multiple `customer.subscription.created` webhooks
- **Order Status Race Condition**: `FAILED` → `PENDING` → `SUCCESS` webhooks arriving out of order
- **Partial Payment Processing**: Webhook processed partially before failure

#### Why It Happens
- No tracking of processed webhook IDs
- Webhook retries from payment provider
- Network issues causing duplicate delivery
- No database unique constraint on webhook ID
- Processing non-final states (`PENDING`, `FAILED`)

#### Real-World Examples
- **Cashfree Webhook**: Same `order_id` but different `cf_payment_id` on retries
- **Stripe Retry**: Same webhook delivered 3 times after network timeout
- **Shopify**: `X-Shopify-Webhook-Id` duplicates causing inventory issues

#### Prevention Strategies
```python
from sqlalchemy import Column, String, DateTime, UniqueConstraint

class ProcessedWebhook(Base):
    __tablename__ = "processed_webhooks"
    
    id = Column(String, primary_key=True)
    provider = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    processed_at = Column(DateTime, nullable=False)
    
    __table_args__ = (
        UniqueConstraint('provider', 'id', name='uq_provider_webhook_id'),
    )

@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    event = verify_webhook(request)
    
    # Idempotency check with database unique constraint
    try:
        await session.execute(
            insert(ProcessedWebhook).values(
                id=event.id,
                provider="stripe",
                event_type=event.type,
                processed_at=datetime.utcnow()
            )
        )
        await session.commit()
    except IntegrityError:
        # Already processed
        return {"status": "already_processed"}
    
    # Only process final states
    if event.type == "payment_intent.succeeded":
        payment_intent = event.data.object
        
        # Verify payment_status = SUCCESS before processing
        if payment_intent.status == "succeeded":
            await process_successful_payment(payment_intent)
    
    return {"status": "success"}
```

- Store webhook IDs in database with unique constraint
- Check if webhook already processed before handling
- Only process final states (`succeeded`, not `processing`)
- Use payment ID (not order ID) for idempotency
- Return 200 quickly even if already processed
- Handle webhook retries gracefully

#### Detection Methods
- Monitor for duplicate webhook IDs
- Track payment status transitions
- Alert on unusual payment patterns
- Audit logs for duplicate processing

#### Recovery Procedures
- Identify duplicate charges
- Refund affected customers
- Implement webhook tracking table
- Add unique constraints to prevent future duplicates

### 9.3 Stripe Subscription State Mismatches

#### What Could Go Wrong
- **Active Subscription, No Payment**: Invoice marked `uncollectible` but subscription still `active`
- **Async Payment Delays**: ACH Direct Debit subscription `active` immediately, payment fails later
- **Refund Invoice Confusion**: Refund invoice as latest, subscription appears `active`
- **Webhook Race Conditions**: Subscription updated before user record created in database
- **Unpaid Subscriptions**: `subscription.status = active` but invoices not paid

#### Why It Happens
- Relying solely on `subscription.status`
- Not checking invoice payment status
- Webhook timing issues
- Asynchronous payment methods (ACH, SEPA)
- Stripe's lenient `active` status

#### Real-World Examples
- **Reddit Discussion**: "Stripe subscription state mismatch question" - common at scale
- **Flycode**: "Stripe doesn't always ensure latest invoice is paid when marking subscription active"
- **Webhooks Failing Silently**: User created in DB after webhook fires

#### Prevention Strategies
```python
def is_subscription_valid(subscription_id: str) -> bool:
    subscription = stripe.Subscription.retrieve(subscription_id)
    
    # Don't just check subscription.status
    if subscription.status not in ['active', 'trialing']:
        return False
    
    # Get latest invoice
    latest_invoice = stripe.Invoice.retrieve(subscription.latest_invoice)
    
    # Check if latest invoice is paid
    if latest_invoice.status != 'paid':
        return False
    
    # Check if invoice is a refund (negative amount)
    if latest_invoice.total < 0:
        # This is a refund, check previous invoice
        invoices = stripe.Invoice.list(subscription=subscription_id, limit=5)
        non_refund_invoices = [inv for inv in invoices if inv.total > 0]
        if not non_refund_invoices or non_refund_invoices[0].status != 'paid':
            return False
    
    # Check for uncollectible
    if latest_invoice.status == 'uncollectible':
        return False
    
    return True
```

- Check BOTH subscription status AND latest invoice status
- Handle uncollectible invoices
- Account for refund invoices
- Implement daily reconciliation job
- Use webhooks as notifications, not state transitions

```python
# Daily reconciliation job
async def reconcile_subscriptions():
    # Get all "active" subscriptions from database
    db_subscriptions = await get_all_active_subscriptions()
    
    for db_sub in db_subscriptions:
        # Query Stripe for actual status
        stripe_sub = stripe.Subscription.retrieve(db_sub.stripe_subscription_id)
        
        # Validate subscription is truly active
        is_valid = is_subscription_valid(stripe_sub.id)
        
        # Update database if mismatch
        if is_valid != db_sub.is_active:
            await update_subscription_status(db_sub.id, is_valid)
            logger.warning(f"Subscription mismatch: {db_sub.id}, fixed in reconciliation")
```

#### Detection Methods
- Daily reconciliation job comparing Stripe vs DB
- Monitor for `uncollectible` invoice events
- Alert on subscriptions active > 30 days without payment
- Track webhook processing failures

#### Recovery Procedures
- Run reconciliation job immediately
- Suspend access for unpaid subscriptions
- Contact affected customers
- Implement webhook retry logic with idempotency

---



## 13. OpenAI API Specific Issues

### 13.1 Rate Limiting Failures

#### What Could Go Wrong
- **429 Errors from Burst Traffic**: Sending many requests simultaneously
- **Token-Based Rate Limits**: Hitting TPM (tokens per minute) before RPM (requests per minute)
- **Insufficient Quota**: `insufficient_quota` error from unpaid usage
- **No Retry Logic**: Giving up immediately on 429 instead of backing off
- **Wrong Organization**: Requests going to wrong org with lower rate limits

#### Why It Happens
- Sending requests in tight loops without delays
- `max_completion_tokens` set too high
- New account without payment method
- Not implementing exponential backoff
- Multiple organizations in account

#### Prevention Strategies
```python
import openai
from tenacity import retry, wait_exponential, stop_after_attempt

@retry(
    wait=wait_exponential(multiplier=1, min=1, max=60),
    stop=stop_after_attempt(6)
)
async def call_openai_with_retry(prompt: str):
    try:
        response = await openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,  # Set reasonable limit
        )
        return response
    except openai.error.RateLimitError as e:
        # Check if it's quota or rate limit
        if "insufficient_quota" in str(e):
            raise  # Don't retry insufficient quota
        # Will retry for rate limits
        raise
```

- Implement exponential backoff with jitter
- Honor `Retry-After` header from 429 responses
- Reduce `max_completion_tokens` to actual needs
- Monitor rate limit headers: `x-ratelimit-remaining-requests`, `x-ratelimit-remaining-tokens`
- Batch non-urgent requests using Batch API
- Request higher usage tier if needed

#### Detection Methods
- Monitor 429 error rate
- Track rate limit header values
- Alert on quota exhaustion
- Monitor request latency for queueing

#### Recovery Procedures
- Implement immediate backoff
- Queue requests with rate limiting
- Upgrade usage tier
- Add payment method for quota
- Distribute load across time

### 13.2 Streaming Response Interruptions

#### What Could Go Wrong
- **Stream Stops Mid-Response**: Connection dropped before completion
- **Missing Token Count**: Final chunk with usage not received
- **Server-Side Errors**: `response.failed` event with `server_error`
- **Max Tokens Truncation**: `response.incomplete` with `reason: "max_tokens"`
- **Long Response Timeout**: Network timeout on lengthy generations

#### Why It Happens
- Network instability
- OpenAI server issues
- Client timeout too short
- Token limit reached
- No proper error handling for streams

#### Prevention Strategies
```python
async def stream_with_error_handling(prompt: str):
    total_tokens = 0
    accumulated_response = ""
    
    try:
        stream = await openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            stream=True,
            timeout=120  # 2 minute timeout
        )
        
        async for chunk in stream:
            if chunk.choices[0].finish_reason == "stop":
                # Stream completed successfully
                if chunk.usage:
                    total_tokens = chunk.usage.total_tokens
            elif chunk.choices[0].finish_reason == "length":
                # Hit max_tokens limit
                logger.warning("Stream truncated due to max_tokens")
            
            delta = chunk.choices[0].delta.get("content", "")
            accumulated_response += delta
            yield delta
    
    except (asyncio.TimeoutError, openai.error.APIConnectionError) as e:
        logger.error(f"Stream interrupted: {e}")
        # Estimate tokens for partial response
        total_tokens = estimate_tokens(accumulated_response)
        
        # Optionally retry with shorter prompt
        if len(accumulated_response) == 0:
            # Nothing received, safe to retry
            async for chunk in stream_with_error_handling(prompt):
                yield chunk
```

- Set appropriate timeout (60-120 seconds)
- Handle all finish reasons: `stop`, `length`, `content_filter`, `function_call`
- Track final chunk for token count
- Estimate tokens if stream fails
- Implement retry for connection errors

#### Detection Methods
- Monitor stream completion rate
- Track `finish_reason` distribution
- Alert on high `length` truncations
- Log connection errors

#### Recovery Procedures
- Retry interrupted streams
- Use longer timeout settings
- Increase `max_tokens` if consistently truncated
- Fall back to non-streaming if streaming unreliable

### 13.3 Model Deprecation Issues

#### What Could Go Wrong
- **Surprise Deprecation**: Using `gpt-4-0613`, suddenly deprecated
- **No Migration Plan**: Hardcoded model name, difficult to change
- **Performance Regression**: New model performs worse for specific use case
- **Cost Increase**: Replacement model more expensive
- **API Compatibility**: New model changes response format

#### Why It Happens
- Not monitoring OpenAI deprecation announcements
- Hardcoding model names throughout codebase
- No testing with newer models
- Assuming models are permanent
- No fallback model configuration

#### Prevention Strategies
```python
# Configuration-driven model selection
class ModelConfig:
    DEFAULT_MODEL = "gpt-4-turbo-preview"
    FALLBACK_MODELS = ["gpt-4-1106-preview", "gpt-4"]
    DEPRECATED_MODELS = {
        "gpt-4-0613": "gpt-4-turbo-preview",
        "gpt-3.5-turbo-0301": "gpt-3.5-turbo"
    }
    
async def call_openai(prompt: str, model: str = None):
    model = model or ModelConfig.DEFAULT_MODEL
    
    # Check if model is deprecated
    if model in ModelConfig.DEPRECATED_MODELS:
        logger.warning(f"Model {model} is deprecated, using {ModelConfig.DEPRECATED_MODELS[model]}")
        model = ModelConfig.DEPRECATED_MODELS[model]
    
    try:
        response = await openai.ChatCompletion.acreate(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        return response
    except openai.error.InvalidRequestError as e:
        if "model" in str(e).lower():
            # Model no longer available, try fallback
            for fallback in ModelConfig.FALLBACK_MODELS:
                try:
                    logger.warning(f"Model {model} failed, trying {fallback}")
                    response = await openai.ChatCompletion.acreate(
                        model=fallback,
                        messages=[{"role": "user", "content": prompt}]
                    )
                    return response
                except:
                    continue
        raise
```

- Centralize model configuration
- Monitor OpenAI deprecation announcements
- Test application with newer models regularly
- Implement model fallback chain
- Track model performance metrics per version

#### Detection Methods
- Monitor OpenAI platform docs for deprecations
- Subscribe to OpenAI developer newsletter
- Track API errors for invalid model names
- Alert on model-related errors

#### Recovery Procedures
- Update configuration to use replacement model
- Test thoroughly with new model
- Deploy configuration change (no code change needed)
- Monitor for performance/cost differences
- Communicate changes to users if affected

---

## 19. Critical Failure Scenarios (Top 10)

### Scenario 1: Multi-Tenant Data Breach

**Attack Vector**: Attacker discovers `/api/keys/` endpoint doesn't validate tenant ownership

**Exploitation**:
1. Create account, get API key ID: `123e4567-e89b-12d3-a456-426614174000`
2. Enumerate other keys: `123e4567-e89b-12d3-a456-426614174001`, `002`, `003`...
3. Access 10,000 other tenant API keys in 10 minutes
4. Exfiltrate all proxy traffic from compromised keys

**Impact**: Complete data breach, regulatory fines, business closure

**Prevention**:
```python
# ALWAYS check tenant_id in EVERY query
@app.get("/api/keys/{key_id}")
async def get_key(key_id: UUID, user: User = Depends(get_current_user)):
    key = await db.execute(
        select(APIKey)
        .where(APIKey.id == key_id)
        .where(APIKey.tenant_id == user.tenant_id)  # CRITICAL
    ).scalar_one_or_none()
    
    if not key:
        raise HTTPException(404)
    return key
```

### Scenario 2: Race Condition Budget Bypass

**Attack Vector**: Sending 100 concurrent requests to exhaust budget

**Exploitation**:
1. Budget limit: $10.00, current usage: $9.90
2. Send 100 concurrent requests, each costing $0.50
3. All 100 requests check budget simultaneously
4. All see $9.90 usage < $10.00 limit
5. All 100 requests proceed
6. Total cost: $50.00 (5x budget limit)

**Impact**: Massive overspending, billing disputes, financial loss

**Prevention**:
```sql
-- Atomic budget check and increment
UPDATE budgets 
SET usage = usage + :cost 
WHERE tenant_id = :tenant_id 
AND usage + :cost <= limit
RETURNING usage;

-- If 0 rows updated, budget exceeded
```

### Scenario 3: Payment Webhook Forgery

**Attack Vector**: Sending fake Stripe webhook to grant free access

**Exploitation**:
1. Create free account
2. Inspect Stripe webhook format from documentation
3. Send fake POST to `/webhooks/stripe` with `payment_intent.succeeded`
4. No signature verification - webhook processed
5. Account upgraded to paid tier for free

**Impact**: Revenue loss, fraudulent access, payment system compromise

**Prevention**:
```python
# ALWAYS verify webhook signature
event = stripe.Webhook.construct_event(
    payload, 
    sig_header, 
    WEBHOOK_SECRET  # CRITICAL
)

# Check timestamp
if abs(time.time() - event.created) > 300:
    raise HTTPException(400, "Timestamp too old")

# Idempotency
if await is_processed(event.id):
    return {"status": "already_processed"}
```

### Scenario 4: Token Counting Exploitation

**Attack Vector**: Exploiting token counting discrepancy for free usage

**Exploitation**:
1. Discover that embedding API has 50% token count inflation
2. Use `tiktoken` locally: estimates 1000 tokens
3. OpenAI API actually uses: 1500 tokens
4. Budget tracking uses `tiktoken` estimate
5. User gets 50% more usage than paid for

**Impact**: Revenue leakage, budget enforcement failure

**Prevention**:
- Use actual token count from OpenAI response
- Add 30% safety buffer to `tiktoken` estimates
- Track and monitor token count discrepancies
- Bill based on actual usage, not estimates

### Scenario 5: Database Connection Pool Exhaustion

**Attack Vector**: Slow queries combined with traffic spike

**Exploitation**:
1. Heavy traffic hits endpoint with missing index
2. Queries take 30 seconds each
3. Connections held for 30 seconds
4. Pool of 20 connections exhausted in seconds
5. New requests wait indefinitely
6. Complete service outage

**Impact**: Total downtime, revenue loss, reputation damage

**Prevention**:
- Add indexes on ALL foreign keys
- Set query timeout limits (10 seconds max)
- Configure appropriate pool size (20-30 per instance)
- Monitor connection pool utilization
- Implement circuit breaker for failing queries

### Scenario 6: JWT Algorithm Confusion

**Attack Vector**: Exploiting RS256→HS256 algorithm confusion

**Exploitation**:
1. Obtain valid JWT signed with RS256
2. Get public key from `/.well-known/jwks.json`
3. Create new JWT, change `alg` to `HS256`
4. Sign with public key (using it as HMAC secret)
5. Server validates using public key as HMAC secret
6. Forged token accepted as valid

**Impact**: Complete authentication bypass, account takeover

**Prevention**:
```python
# Explicitly specify allowed algorithms
payload = jwt.decode(
    token,
    PUBLIC_KEY,
    algorithms=['RS256'],  # NEVER allow HS256 for RS256 keys
    options={'verify_signature': True}
)
```

### Scenario 7: Stripe Subscription State Mismatch

**Attack Vector**: Exploiting ACH payment delay for free access

**Exploitation**:
1. Subscribe using ACH Direct Debit
2. Stripe immediately marks subscription as `active`
3. Access granted instantly
4. ACH payment fails 2 days later
5. Invoice voided, but subscription still `active`
6. Continue using service for free

**Impact**: Revenue loss, unpaid subscriptions

**Prevention**:
```python
def is_subscription_valid(sub_id):
    sub = stripe.Subscription.retrieve(sub_id)
    invoice = stripe.Invoice.retrieve(sub.latest_invoice)
    
    # Check BOTH subscription AND invoice
    return (
        sub.status == 'active' 
        and invoice.status == 'paid'
        and invoice.total > 0  # Not a refund
    )

# Daily reconciliation job
```

### Scenario 8: N+1 Query Cascade

**Attack Vector**: Exploiting inefficient endpoint for DoS

**Exploitation**:
1. Discover `/api/tenants` endpoint
2. Endpoint fetches 100 tenants
3. For each tenant, fetches API keys (100 queries)
4. For each API key, fetches usage logs (10,000 queries)
5. Single request = 10,100 database queries
6. 10 concurrent requests = 101,000 queries
7. Database CPU at 100%, complete outage

**Impact**: Self-inflicted DoS, service outage

**Prevention**:
```python
# Use eager loading
tenants = (
    await session.execute(
        select(Tenant)
        .options(
            selectinload(Tenant.api_keys)
            .selectinload(APIKey.usage_logs)
        )
    )
).scalars().all()  # Only 3 queries total
```

### Scenario 9: Cache Poisoning Attack

**Attack Vector**: Poisoning cache with attacker-controlled data

**Exploitation**:
1. Create account with tenant_id: `attacker-123`
2. Cache key uses: `api_keys:{api_key_id}` (no tenant prefix!)
3. Attacker creates API key: `xyz`
4. Victim has API key: `xyz` (same ID different tenant)
5. Attacker's key cached first
6. Victim gets attacker's key from cache
7. Requests routed to attacker's OpenAI account

**Impact**: Data leakage, cross-tenant contamination

**Prevention**:
```python
# ALWAYS include tenant_id in cache keys
cache_key = f"tenant:{tenant_id}:api_key:{key_id}"

# Or use tenant-scoped cache
```

### Scenario 10: Secrets in Git History

**Attack Vector**: Discovering leaked API keys in Git history

**Exploitation**:
1. Developer commits `.env` file with `OPENAI_API_KEY`
2. Realizes mistake, removes file in next commit
3. Attacker clones public repo
4. Runs: `git log --all --full-history --source --grep="API_KEY"`
5. Finds key in commit history
6. Uses key for free OpenAI access

**Impact**: API key compromise, unauthorized usage, billing fraud

**Prevention**:
- Never commit secrets (use `.gitignore`)
- Use secret scanning (TruffleHog, Gitleaks)
- Rotate keys immediately if exposed
- Pre-commit hooks to prevent secrets

---

## 20. Security Vulnerabilities Checklist

### Authentication & Authorization

- [ ] **JWT Verification**: Always verify signature, expiration, issuer
- [ ] **Algorithm Whitelist**: Explicitly specify allowed algorithms (`['HS256']` or `['RS256']`)
- [ ] **Strong Secret Keys**: 32+ character random keys, never `"secret"`
- [ ] **Token Expiration**: Short-lived tokens (1-2 hours), refresh token rotation
- [ ] **Token Revocation**: Redis blacklist for logout/compromise
- [ ] **Session Management**: Regenerate session ID after login
- [ ] **Cookie Security**: `HttpOnly`, `Secure`, `SameSite=strict` flags
- [ ] **BOLA Prevention**: ALWAYS filter by `tenant_id` AND resource ID
- [ ] **Indirect References**: Use random tokens, not sequential IDs
- [ ] **Cross-Tenant Testing**: Automated tests for unauthorized access

### Input Validation & Injection Prevention

- [ ] **SQL Injection**: Parameterized queries ALWAYS, never string concatenation
- [ ] **XSS Prevention**: Sanitize all user input, escape output
- [ ] **Command Injection**: Avoid `os.system()`, use safe APIs
- [ ] **Path Traversal**: Validate file paths, no `../` in user input
- [ ] **API Input Validation**: Pydantic models, type checking, range validation
- [ ] **Content-Type Validation**: Verify request `Content-Type` header
- [ ] **File Upload Security**: Validate file types, scan for malware

### Multi-Tenant Security

- [ ] **Row-Level Security**: Enable RLS in PostgreSQL
- [ ] **Tenant Isolation**: Every query filters by `tenant_id`
- [ ] **Cache Keys**: Prefix with tenant ID: `tenant:{id}:resource:{id}`
- [ ] **Connection Pool**: Reset `current_tenant_id` before returning connection
- [ ] **Async Context**: Use `ContextVar` for tenant context in async code
- [ ] **Cross-Tenant Tests**: Automated tests attempting to access other tenant data
- [ ] **Audit Logging**: Log all data access with tenant ID

### API Security

- [ ] **Rate Limiting**: Per-tenant, per-endpoint, per-IP
- [ ] **API Key Rotation**: Regular rotation, support multiple active keys
- [ ] **Key Scoping**: Separate keys for read vs write operations
- [ ] **IP Whitelisting**: Optional IP restrictions per key
- [ ] **Webhook Signature**: ALWAYS verify Stripe/payment webhooks
- [ ] **CORS Configuration**: Specific origins, no `*` in production
- [ ] **Request Size Limits**: Max body size (10MB), prevent DoS
- [ ] **TLS/HTTPS**: Force HTTPS, HSTS headers, valid certificates

### Secret Management

- [ ] **No Hardcoded Secrets**: Use environment variables or secret managers
- [ ] **Secret Scanning**: Pre-commit hooks, CI/CD integration
- [ ] **Secret Rotation**: 60-90 day rotation cycle
- [ ] **Encryption at Rest**: Use KMS, HashiCorp Vault, AWS Secrets Manager
- [ ] **Least Privilege**: Read-only keys where possible
- [ ] **Git History Clean**: No secrets in Git history (BFG Repo-Cleaner)
- [ ] **Logging Safety**: Never log secrets, mask in logs

### Payment Security

- [ ] **Webhook Verification**: Stripe signature validation
- [ ] **Idempotency**: Process each webhook exactly once
- [ ] **Timestamp Validation**: Reject old webhooks (>5 min)
- [ ] **State Reconciliation**: Daily job comparing Stripe vs DB
- [ ] **Invoice Validation**: Check BOTH subscription AND invoice status
- [ ] **Payment Intent**: Verify `payment_intent.status = succeeded`
- [ ] **Refund Handling**: Account for negative invoice amounts
- [ ] **PCI Compliance**: Never store credit card data, use Stripe tokens

---

## 21. Performance Pitfalls Checklist

### Database Performance

- [ ] **Indexes on Foreign Keys**: Index ALL foreign key columns
- [ ] **Composite Indexes**: Match query patterns (`WHERE` + `ORDER BY`)
- [ ] **Missing Indexes**: Use `EXPLAIN ANALYZE`, pg_stat_statements
- [ ] **N+1 Query Prevention**: Use `select_related()` / `prefetch_related()`
- [ ] **Query Timeouts**: Set max execution time (10 seconds)
- [ ] **Connection Pooling**: Appropriate `pool_size` (20-30 per instance)
- [ ] **Connection Leaks**: Use context managers (`with`, `async with`)
- [ ] **Long Transactions**: Commit frequently, avoid holding locks
- [ ] **Soft Delete Cleanup**: Archive old soft-deleted records
- [ ] **VACUUM Strategy**: Regular `VACUUM` on high-churn tables

### Caching Strategy

- [ ] **Cache Stampede**: Probabilistic early expiration, locking
- [ ] **Tenant-Scoped Keys**: Include `tenant_id` in all cache keys
- [ ] **TTL Configuration**: Appropriate expiration times
- [ ] **Stale-While-Revalidate**: Serve stale cache during refresh
- [ ] **Cache Warming**: Pre-populate after deployment
- [ ] **Eviction Policy**: LRU, size limits
- [ ] **Cache Miss Handling**: Graceful degradation
- [ ] **Distributed Cache**: Redis Cluster for multi-instance deployments

### API Performance

- [ ] **Response Pagination**: Limit result sets (max 100 items)
- [ ] **Field Selection**: Allow clients to specify desired fields
- [ ] **Compression**: Gzip responses > 1KB
- [ ] **CDN for Static Assets**: CloudFlare, CloudFront
- [ ] **Async Processing**: Queue heavy operations (email, reporting)
- [ ] **Background Jobs**: Celery, RQ for long-running tasks
- [ ] **Streaming Responses**: For large data transfers
- [ ] **Conditional Requests**: ETag, If-None-Match headers

### Resource Limits

- [ ] **Request Timeouts**: 30-60 second max per request
- [ ] **Memory Limits**: Container memory limits
- [ ] **CPU Limits**: Prevent single tenant monopolizing CPU
- [ ] **File Upload Limits**: Max 10MB per upload
- [ ] **Rate Limiting**: Per-tenant quotas (100 req/min)
- [ ] **Query Complexity**: Limit max `LIMIT` clause (1000 rows)
- [ ] **Concurrency Limits**: Max concurrent requests per tenant

### Monitoring & Alerting

- [ ] **APM Integration**: New Relic, Datadog, Sentry
- [ ] **Query Performance**: Track slow queries (>1 second)
- [ ] **Error Rates**: Alert on 5xx error spikes
- [ ] **Response Time**: P95, P99 latency tracking
- [ ] **Database Metrics**: Connection pool, query time, locks
- [ ] **Cache Hit Rate**: Monitor cache effectiveness
- [ ] **Resource Utilization**: CPU, memory, disk I/O
- [ ] **OpenAI API Metrics**: Rate limits, token usage, errors

---

## 22. Testing Strategy for Failure Modes

### Unit Tests

```python
# Test budget enforcement race conditions
@pytest.mark.asyncio
async def test_budget_enforcement_concurrent_requests():
    tenant = await create_tenant(budget_limit=10.0)
    
    # Send 10 concurrent requests, each costing $2
    # Expected: Only 5 requests succeed, 5 fail
    tasks = [
        make_request(tenant.id, cost=2.0)
        for _ in range(10)
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    successes = [r for r in results if not isinstance(r, BudgetExceeded)]
    failures = [r for r in results if isinstance(r, BudgetExceeded)]
    
    assert len(successes) == 5
    assert len(failures) == 5
    
    # Verify final usage
    budget = await get_budget(tenant.id)
    assert budget.usage == 10.0
```

### Integration Tests

```python
# Test multi-tenant isolation
@pytest.mark.asyncio
async def test_cross_tenant_access_prevention():
    tenant1 = await create_tenant()
    tenant2 = await create_tenant()
    
    key1 = await create_api_key(tenant1.id)
    key2 = await create_api_key(tenant2.id)
    
    # Tenant1 tries to access Tenant2's key
    with pytest.raises(HTTPException) as exc:
        await get_api_key(key2.id, current_user=tenant1.owner)
    
    assert exc.value.status_code == 404
```

### Security Tests

```python
# Test JWT algorithm confusion
def test_jwt_algorithm_confusion():
    # Valid RS256 token
    valid_token = create_jwt({"sub": "user123"}, algorithm="RS256", private_key=RS_PRIVATE_KEY)
    
    # Attacker changes algorithm to HS256, signs with public key
    malicious_token = create_jwt({"sub": "attacker"}, algorithm="HS256", secret=RS_PUBLIC_KEY)
    
    # Should reject malicious token
    with pytest.raises(ValueError):
        verify_token(malicious_token)
```

### Load Tests (Locust)

```python
from locust import HttpUser, task, between

class CostShieldLoadTest(HttpUser):
    wait_time = between(1, 3)
    
    @task(3)
    def proxy_request(self):
        self.client.post(
            "/v1/chat/completions",
            json={
                "model": "gpt-4",
                "messages": [{"role": "user", "content": "Hello"}]
            },
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
    
    @task(1)
    def check_usage(self):
        self.client.get("/api/v1/usage")
    
    def on_start(self):
        # Login and get API key
        response = self.client.post("/auth/login", json={
            "email": "load-test@example.com",
            "password": "test123"
        })
        self.api_key = response.json()["api_key"]
```

### Chaos Engineering

```python
# Simulate database connection failure
@pytest.mark.chaos
async def test_database_failure_resilience():
    # Start with healthy system
    response = await client.get("/health")
    assert response.status_code == 200
    
    # Inject chaos: Kill database connections
    await kill_database_connections()
    
    # System should gracefully degrade
    response = await client.get("/api/v1/usage")
    assert response.status_code == 503  # Service Unavailable
    assert "database unavailable" in response.json()["detail"].lower()
    
    # Restore database
    await restore_database()
    
    # System should recover
    await asyncio.sleep(5)  # Wait for connection pool recovery
    response = await client.get("/api/v1/usage")
    assert response.status_code == 200
```

### Penetration Tests

**BOLA Testing**:
```bash
#!/bin/bash
# Test for BOLA vulnerabilities

# Create two users
USER1_TOKEN=$(curl -X POST /auth/login -d '{"email":"user1@example.com","password":"pass"}' | jq -r .token)
USER2_TOKEN=$(curl -X POST /auth/login -d '{"email":"user2@example.com","password":"pass"}' | jq -r .token)

# Get User1's API key ID
USER1_KEY_ID=$(curl -H "Authorization: Bearer $USER1_TOKEN" /api/keys | jq -r .[0].id)

# Try to access User1's key with User2's token (should fail)
curl -H "Authorization: Bearer $USER2_TOKEN" /api/keys/$USER1_KEY_ID

# Expected: 404 Not Found
# Failure: 200 OK with User1's key (BOLA vulnerability!)
```

**SQL Injection Testing**:
```python
import requests

# Test SQL injection in search endpoint
payloads = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "admin'--",
    "1' UNION SELECT password FROM users--"
]

for payload in payloads:
    response = requests.get(
        "https://api.costshield.com/api/keys/search",
        params={"query": payload},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Should return 400 Bad Request for invalid input
    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()
```

---

## 23. Incident Response Plan

### Phase 1: Detection & Triage (15 minutes)

**Automated Alerting**:
- PagerDuty/Opsgenie alert triggered
- Alert includes: affected service, error rate, affected tenants
- On-call engineer notified immediately

**Initial Assessment**:
1. Check monitoring dashboard (Datadog/New Relic)
2. Identify scope: Single tenant or multi-tenant?
3. Determine impact: Data breach, service outage, or performance degradation?
4. Classify severity:
   - **P0 (Critical)**: Data breach, complete outage, security exploit
   - **P1 (High)**: Partial outage, major feature broken, payment issues
   - **P2 (Medium)**: Performance degradation, minor feature broken
   - **P3 (Low)**: Cosmetic issues, logging errors

### Phase 2: Containment (30 minutes)

**For Data Breach (P0)**:
```bash
# Immediate actions
1. Disable affected API keys
   psql -c "UPDATE api_keys SET is_active = false WHERE tenant_id = 'affected-tenant-id';"

2. Suspend affected tenant accounts
   psql -c "UPDATE tenants SET is_suspended = true, suspension_reason = 'Security incident' WHERE id IN (...);"

3. Rotate all secrets
   - Generate new database passwords
   - Rotate JWT signing keys
   - Regenerate API encryption keys

4. Enable enhanced logging
   - Log all API requests with full headers
   - Track all database queries with tenant_id
```

**For Service Outage (P0/P1)**:
```bash
# Immediate actions
1. Scale up infrastructure
   kubectl scale deployment costshield-api --replicas=10

2. Enable aggressive caching
   redis-cli CONFIG SET maxmemory-policy allkeys-lru

3. Enable read-only mode if database overloaded
   psql -c "SET default_transaction_read_only = on;"

4. Redirect traffic to backup region (if available)
   aws route53 change-resource-record-sets --hosted-zone-id Z123... --change-batch file://failover.json
```

### Phase 3: Investigation (2 hours)

**Data Collection**:
```python
# Automated investigation script
async def investigate_incident(incident_id: str):
    # Collect logs
    logs = await get_logs(
        start_time=incident_time - timedelta(hours=1),
        end_time=incident_time + timedelta(hours=1),
        filters={"level": ["ERROR", "CRITICAL"]}
    )
    
    # Identify affected tenants
    affected_tenants = await db.execute("""
        SELECT DISTINCT tenant_id, COUNT(*) as error_count
        FROM error_logs
        WHERE timestamp BETWEEN :start AND :end
        GROUP BY tenant_id
        ORDER BY error_count DESC
    """, {"start": incident_time - timedelta(hours=1), "end": incident_time})
    
    # Check for data access anomalies
    anomalies = await db.execute("""
        SELECT tenant_id, api_key_id, COUNT(*) as access_count,
               ARRAY_AGG(DISTINCT ip_address) as ip_addresses
        FROM audit_logs
        WHERE timestamp BETWEEN :start AND :end
        AND tenant_id != expected_tenant_id  -- Cross-tenant access!
        GROUP BY tenant_id, api_key_id
    """, {"start": incident_time - timedelta(hours=24), "end": incident_time})
    
    # Generate incident report
    report = {
        "incident_id": incident_id,
        "detected_at": incident_time,
        "affected_tenants": len(affected_tenants),
        "total_errors": sum(t.error_count for t in affected_tenants),
        "anomalies_detected": len(anomalies),
        "root_cause": await determine_root_cause(logs, anomalies)
    }
    
    return report
```

### Phase 4: Resolution (4 hours)

**Fix Development**:
1. Create hotfix branch: `hotfix/incident-{id}`
2. Implement fix with comprehensive tests
3. Code review (expedited, 2 reviewers minimum)
4. Deploy to staging, verify fix
5. Deploy to production with monitoring

**Deployment Checklist**:
```markdown
- [ ] Fix verified in staging environment
- [ ] Database migrations tested (if applicable)
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Incident commander approves deployment
- [ ] Deploy to production
- [ ] Monitor for 30 minutes post-deployment
- [ ] Verify fix with affected tenants
```

### Phase 5: Communication

**Internal Communication** (Slack incident channel):
```
[P0] Data Breach Detected - RESOLVED
Timeline:
- 14:23 UTC: Alert triggered - Cross-tenant data access detected
- 14:30 UTC: Affected tenants suspended (12 tenants)
- 14:45 UTC: Root cause identified - Missing tenant_id filter in /api/keys endpoint
- 15:10 UTC: Hotfix deployed
- 15:40 UTC: Fix verified, tenants re-enabled

Impact: 12 tenants, ~500 API keys potentially accessed
Next Steps: Post-mortem scheduled for tomorrow 10:00 UTC
```

**External Communication** (Status page):
```
RESOLVED - Service Disruption
We experienced a security incident affecting 12 customers between 14:23-15:40 UTC.
The issue has been resolved. Affected customers have been notified directly.

Timeline:
- 14:23 UTC: Issue detected
- 14:30 UTC: Service temporarily suspended for affected accounts
- 15:10 UTC: Fix deployed
- 15:40 UTC: Service fully restored

We take security extremely seriously and are conducting a thorough investigation.
Affected customers will receive detailed incident reports within 24 hours.
```

**Customer Notification** (Email to affected):
```
Subject: Security Incident Notification - Action Required

Dear [Customer],

We are writing to inform you of a security incident that may have affected your CostShield account.

What Happened:
Between 14:23-15:40 UTC on [Date], a vulnerability in our API allowed unauthorized access to API key metadata (name, creation date, rate limits). No API key values, usage data, or proxied OpenAI requests were exposed.

What We Did:
- Immediately suspended affected accounts
- Identified and fixed the vulnerability within 90 minutes
- Conducted a thorough security audit

What You Should Do:
1. Rotate your API keys (we can assist with this)
2. Review your API usage logs for any unusual activity
3. Contact us at security@costshield.com with any questions

We sincerely apologize for this incident and are implementing additional security measures to prevent future occurrences. A detailed incident report will be provided within 24 hours.

[CEO Name]
CEO, CostShield
```

### Phase 6: Post-Mortem (Within 48 hours)

**Post-Mortem Template**:
```markdown
# Incident Post-Mortem: [INCIDENT-ID]

## Summary
[Brief description of incident, impact, and resolution]

## Timeline
- 14:23 UTC: Alert triggered
- 14:30 UTC: Incident confirmed
- 14:45 UTC: Root cause identified
- 15:10 UTC: Fix deployed
- 15:40 UTC: Incident resolved

## Root Cause
**Primary**: Missing `tenant_id` filter in GET /api/keys/{key_id} endpoint
**Contributing Factors**:
1. No automated cross-tenant access tests
2. Code review missed the issue
3. No BOLA security scanner in CI/CD

## Impact
- 12 tenants affected
- ~500 API keys metadata exposed
- No sensitive data (key values, usage) exposed
- 77 minutes downtime for affected tenants

## Resolution
- Added `tenant_id` filter to endpoint
- Deployed hotfix in 90 minutes
- Verified fix with penetration testing

## Action Items
1. [P0] Add tenant_id check to ALL API endpoints (Owner: @dev-lead, Due: 2 days)
2. [P0] Implement automated cross-tenant access tests (Owner: @qa-lead, Due: 1 week)
3. [P1] Add BOLA scanner to CI/CD pipeline (Owner: @security, Due: 2 weeks)
4. [P1] Mandatory security training for all engineers (Owner: @cto, Due: 1 month)
5. [P2] Implement automated security audit (weekly) (Owner: @security, Due: 1 month)

## Lessons Learned
**What Went Well**:
- Fast detection (automated alerting)
- Clear incident response process
- Good communication with customers

**What Went Wrong**:
- Security vulnerability reached production
- No automated BOLA testing
- Code review process missed critical issue

**Improvements**:
- Implement security-focused code review checklist
- Add security champions to each team
- Regular penetration testing (monthly)
```

---

## Conclusion

This comprehensive document outlines 200+ failure modes, security vulnerabilities, and performance pitfalls that could affect CostShield Cloud. The key to preventing these failures is:

1. **Proactive Security**: Implement security checks at every layer
2. **Automated Testing**: Comprehensive test coverage for failure scenarios
3. **Monitoring & Alerting**: Real-time detection of anomalies
4. **Incident Response**: Clear, practiced procedures for rapid response
5. **Continuous Improvement**: Regular security audits and post-mortems

**Priority Implementation Order**:

### Week 1 (Critical Security)
- Implement tenant_id filtering in ALL queries
- Add JWT signature verification
- Enable Stripe webhook signature validation
- Add budget enforcement with atomic operations
- Deploy secret scanning in CI/CD

### Week 2 (Database & Performance)
- Add indexes on all foreign keys
- Implement connection pool monitoring
- Add query timeouts
- Enable N+1 query detection
- Setup APM monitoring

### Week 3 (Testing & Monitoring)
- Create cross-tenant access test suite
- Add concurrency stress tests
- Setup automated security scanning
- Implement comprehensive logging
- Configure alerting rules

### Week 4 (Documentation & Training)
- Document incident response procedures
- Conduct security training
- Create runbooks for common failures
- Setup on-call rotations
- Practice incident response drills

This document should be treated as a living document, updated regularly as new failure modes are discovered and mitigated.

**Document Version**: 1.0
**Last Updated**: February 4, 2026
**Next Review**: Monthly

---

*End of Document*

