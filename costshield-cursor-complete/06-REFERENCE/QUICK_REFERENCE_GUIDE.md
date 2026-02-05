# CostShield Cloud - Quick Reference Guide

## Document Overview

The main document `COSTSHIELD_FAILURE_MODES.md` contains **200+ failure modes** across **23 major sections** with:
- ✅ Real-world examples from actual breaches
- ✅ Prevention strategies with code examples
- ✅ Detection methods
- ✅ Recovery procedures
- ✅ Security & performance checklists
- ✅ Testing strategies
- ✅ Incident response playbook

---

## 🔴 Top 10 Critical Vulnerabilities (Fix Immediately)

### 1. **Multi-Tenant Data Leakage** (Section 2.1)
**Risk**: Cross-tenant database queries exposing ALL tenant data
```python
# BAD - No tenant check
key = await db.get(APIKey, key_id)

# GOOD - Always check tenant_id
key = await db.execute(
    select(APIKey)
    .where(APIKey.id == key_id)
    .where(APIKey.tenant_id == user.tenant_id)
).scalar_one_or_none()
```

### 2. **Budget Race Conditions** (Section 5.1)
**Risk**: Concurrent requests bypassing budget limits (5x overspending)
```sql
-- Use atomic operations
UPDATE budgets 
SET usage = usage + :cost 
WHERE tenant_id = :tenant_id 
AND usage + :cost <= limit
RETURNING usage;
```

### 3. **Stripe Webhook Forgery** (Section 9.1)
**Risk**: Fake payment webhooks granting free access
```python
# ALWAYS verify signature
event = stripe.Webhook.construct_event(
    payload, sig_header, WEBHOOK_SECRET
)
```

### 4. **JWT Algorithm Confusion** (Section 8.2)
**Risk**: RS256→HS256 attack allowing forged tokens
```python
# Explicitly specify allowed algorithms
jwt.decode(token, key, algorithms=['RS256'])
```

### 5. **SQL Injection** (Section 3.2)
**Risk**: Database compromise, data theft
```python
# Use parameterized queries ALWAYS
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

### 6. **Missing Database Indexes** (Section 6.1, 7.2)
**Risk**: API timeouts, database CPU 100%, outages
```sql
-- Index ALL foreign keys
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_usage_logs_api_key_id ON usage_logs(api_key_id);
```

### 7. **API Key Exposure** (Section 3.1)
**Risk**: Leaked keys in Git, logs, client-side code
- ✅ Use secret scanning (TruffleHog, Gitleaks)
- ✅ Never commit `.env` files
- ✅ Rotate keys regularly (60-90 days)

### 8. **Token Counting Errors** (Section 4)
**Risk**: 30-50% token underestimation, revenue loss
```python
# Add 30% safety buffer
safe_estimate = int(tiktoken_count * 1.3)
```

### 9. **Connection Pool Exhaustion** (Section 7.1)
**Risk**: Complete service outage
- ✅ Set `pool_size=20-30` per instance
- ✅ Use context managers (`async with`)
- ✅ Set query timeouts (10 seconds)

### 10. **N+1 Query Problems** (Section 6.3)
**Risk**: 10,000+ queries per request, database overload
```python
# Use eager loading
users = User.objects.prefetch_related('api_keys')
```

---

## 📋 Security Checklist (10-Minute Audit)

### Authentication (Section 20)
- [ ] JWT signature verification enabled
- [ ] Algorithm whitelist: `['HS256']` or `['RS256']`
- [ ] Token expiration: 1-2 hours
- [ ] Strong secret keys (32+ characters)
- [ ] Session ID regenerated after login

### Multi-Tenant Isolation (Section 20)
- [ ] EVERY query filters by `tenant_id`
- [ ] Cache keys include tenant prefix
- [ ] Row-Level Security enabled (PostgreSQL)
- [ ] Cross-tenant access tests automated

### API Security (Section 20)
- [ ] Rate limiting per-tenant
- [ ] Webhook signature verification
- [ ] HTTPS enforced (HSTS headers)
- [ ] Request size limits (10MB max)
- [ ] Input validation (Pydantic models)

### Payment Security (Section 20)
- [ ] Stripe signature validation
- [ ] Webhook idempotency (unique constraints)
- [ ] Daily reconciliation job
- [ ] Invoice + subscription status checked

### Secrets Management (Section 20)
- [ ] No hardcoded secrets
- [ ] Secret scanning in CI/CD
- [ ] 60-90 day rotation cycle
- [ ] Never log secrets

---

## 🚀 Performance Checklist (5-Minute Audit)

### Database (Section 21)
- [ ] Indexes on ALL foreign keys
- [ ] Query timeout limits (10 seconds)
- [ ] Connection pool size: 20-30 per instance
- [ ] N+1 query detection enabled

### Caching (Section 21)
- [ ] Cache stampede prevention
- [ ] Tenant-scoped cache keys
- [ ] Stale-while-revalidate strategy
- [ ] Cache hit rate monitoring

### API (Section 21)
- [ ] Response pagination (max 100 items)
- [ ] Gzip compression (>1KB)
- [ ] Async processing for heavy ops
- [ ] Request timeout: 30-60 seconds

---

## 🧪 Testing Quick Start (Section 22)

### Unit Test: Budget Race Condition
```python
@pytest.mark.asyncio
async def test_budget_concurrent():
    tasks = [make_request(cost=2.0) for _ in range(10)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    successes = [r for r in results if not isinstance(r, BudgetExceeded)]
    assert len(successes) == 5  # Only 5 should succeed
```

### Security Test: Cross-Tenant Access
```python
def test_cross_tenant_access():
    tenant1_key = create_api_key(tenant1)
    # Tenant2 tries to access tenant1's key
    with pytest.raises(HTTPException) as exc:
        get_api_key(tenant1_key.id, current_user=tenant2_user)
    assert exc.value.status_code == 404
```

### Load Test: OpenAI Proxy
```python
# Locust
@task
def proxy_request(self):
    self.client.post("/v1/chat/completions", json={
        "model": "gpt-4",
        "messages": [{"role": "user", "content": "Hello"}]
    })
```

---

## 🚨 Incident Response (Section 23)

### P0: Data Breach (15 min response)
1. ✅ Disable affected API keys
2. ✅ Suspend affected tenants
3. ✅ Rotate all secrets
4. ✅ Enable enhanced logging
5. ✅ Notify security team

### P0: Service Outage (15 min response)
1. ✅ Scale up infrastructure (10x replicas)
2. ✅ Enable aggressive caching
3. ✅ Enable read-only mode if DB overloaded
4. ✅ Redirect to backup region

### Communication Template
```
RESOLVED - Security Incident
We experienced a security incident affecting X customers.
Timeline:
- 14:23 UTC: Issue detected
- 14:30 UTC: Service suspended for affected accounts
- 15:10 UTC: Fix deployed
- 15:40 UTC: Service fully restored
```

---

## 📚 Document Structure

### Part 1: Technical Failures (Sections 1-13)
1. API Proxy Service Anti-Patterns
2. Multi-Tenant SaaS Security Failures
3. Security Vulnerabilities
4. Token Counting Errors
5. Budget Enforcement Failures
6. Database Design Mistakes
7. Performance Pitfalls
8. Authentication/Authorization Mistakes
9. Payment Integration Pitfalls
10-13. OpenAI API Specific Issues

### Part 2: Real-World Examples (Section 14)
- Microsoft Midnight Blizzard
- Cloudflare Atlassian Breach
- Snowflake Customer Breaches
- Capital One Breach
- McDonald's/Paradox Data Leak

### Part 3: Deployment & Operations (Sections 11-12, 16)
- Secrets in deployment
- Environment configuration errors
- Zero-downtime deployment failures
- Horizontal scaling pitfalls
- Monitoring blind spots

### Part 4: Actionable Tools (Sections 19-23)
- **Section 19**: Top 10 Critical Scenarios with Attack Vectors
- **Section 20**: Security Vulnerabilities Checklist
- **Section 21**: Performance Pitfalls Checklist
- **Section 22**: Testing Strategy (Unit, Integration, Load, Chaos)
- **Section 23**: Incident Response Playbook

---

## 🎯 4-Week Implementation Plan

### Week 1: Critical Security (Section 23)
- [ ] Add `tenant_id` to ALL queries
- [ ] Enable JWT signature verification
- [ ] Stripe webhook signature validation
- [ ] Atomic budget operations
- [ ] Secret scanning in CI/CD

### Week 2: Database & Performance
- [ ] Index all foreign keys
- [ ] Connection pool monitoring
- [ ] Query timeouts (10s)
- [ ] N+1 query detection
- [ ] APM monitoring (Datadog/New Relic)

### Week 3: Testing & Monitoring
- [ ] Cross-tenant access tests
- [ ] Concurrency stress tests
- [ ] Security scanning (Snyk, Semgrep)
- [ ] Comprehensive logging
- [ ] Alerting rules (PagerDuty)

### Week 4: Documentation & Training
- [ ] Incident response procedures
- [ ] Security training for team
- [ ] Runbooks for common failures
- [ ] On-call rotations
- [ ] Incident response drills

---

## 🔍 Quick Search Guide

**Multi-Tenant Issues**: Sections 2, 19.1, 19.9, 20 (Multi-Tenant Security)
**Payment/Billing**: Sections 9, 19.3, 19.7, 20 (Payment Security)
**Performance**: Sections 6, 7, 21
**OpenAI API**: Sections 4, 13
**Security**: Sections 3, 8, 20
**Testing**: Section 22
**Incident Response**: Section 23

---

## 📞 Emergency Contacts

**Data Breach**: security@costshield.com
**Service Outage**: ops@costshield.com
**PagerDuty**: https://costshield.pagerduty.com

---

**Document Version**: 1.0
**Last Updated**: February 4, 2026
**Main Document**: `COSTSHIELD_FAILURE_MODES.md` (2,642 lines)
