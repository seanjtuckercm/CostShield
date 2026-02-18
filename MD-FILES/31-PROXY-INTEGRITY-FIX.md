# Sprint 31: Proxy Integrity Fix

**Date:** 2026-02-05  
**Sprint:** Forensic Proxy Audit & Fix  
**Protocol:** TEST-AS-YOU-BUILD (Forensic Mode)  
**Reference:** MD-FILES/28-PRODUCTION-SMOKE-TEST.md

---

## PLANNING PHASE

### Context
Proxy endpoint (`/api/proxy`) returns "Invalid API key" despite the `cs_live` key being correctly displayed in the UI.

### Goal
Identify why the proxy returns "Invalid API key" and fix the authentication/decryption linkage.

### Scope
- **Unit 1:** Add forensic logging to proxy route
- **Unit 2:** Verify API key authentication logic
- **Unit 3:** Verify encryption/decryption linkage
- **Unit 4:** Fix identified issues
- **Unit 5:** Verify proxy connection works

---

## EXECUTION PHASE

### Unit 1: Add Forensic Logging

#### Step 1: Add Logging to API Key Authentication
**File:** `app/api/proxy/[...path]/route.ts` - `authenticateApiKey()`

**Logging Added:**
- ✅ API key format check (cs_live_ prefix)
- ✅ Key hash calculation (first 16 chars)
- ✅ Database query errors (code, message)
- ✅ Authentication result (key found/not found)
- ✅ Sample keys in database (for debugging)
- ✅ User ID when key is found

**Status:** ✅ **IMPLEMENTED**

---

#### Step 2: Add Logging to Credentials Retrieval
**File:** `app/api/proxy/[...path]/route.ts` - `checkBudgetAndGetCredentials()`

**Logging Added:**
- ✅ User ID for lookup
- ✅ Credentials query result
- ✅ Encrypted key length
- ✅ Encrypted key format check (IV:AuthTag:Data)
- ✅ Database errors (code, message)

**Status:** ✅ **IMPLEMENTED**

---

#### Step 3: Add Logging to Decryption Process
**File:** `app/api/proxy/[...path]/route.ts` - POST handler

**Logging Added:**
- ✅ Encryption service initialization
- ✅ ENCRYPTION_MASTER_KEY length and preview
- ✅ Decryption attempt
- ✅ Decryption success/failure
- ✅ Decrypted key preview (first 10 chars)
- ✅ Full error details if decryption fails

**Status:** ✅ **IMPLEMENTED**

---

#### Step 4: Add Logging to GET Handler
**File:** `app/api/proxy/[...path]/route.ts` - GET handler

**Logging Added:**
- ✅ API key extraction (GET)
- ✅ Key hash calculation (GET)
- ✅ Authentication result (GET)
- ✅ Credentials lookup (GET)
- ✅ Decryption process (GET)

**Status:** ✅ **IMPLEMENTED**

---

### Unit 2: Verify API Key Format

#### Step 1: Check Key Generation
**File:** `app/api/keys/route.ts`

**Key Format:**
- ✅ Format: `cs_live_<32 hex characters>`
- ✅ Total length: 40 characters (8 + 32)
- ✅ Hash: SHA-256 of full key including prefix

**Status:** ✅ **VERIFIED** - Key format is correct

---

#### Step 2: Verify Key Storage
**Analysis:**
- ✅ Key stored as SHA-256 hash in `api_keys.key_hash`
- ✅ Prefix stored in `api_keys.key_prefix` (first 20 chars + '...')
- ✅ Full key only returned once during creation

**Status:** ✅ **VERIFIED** - Storage format is correct

---

### Unit 3: Verify Encryption Linkage

#### Step 1: Check Encryption Key Consistency
**File:** `lib/encryption.ts`

**Analysis:**
- ✅ Encryption key loaded from `ENCRYPTION_MASTER_KEY`
- ✅ Key can be 32 chars (hashed to 32 bytes) or 64 hex chars (32 bytes)
- ✅ Current key in `.env.local`: 32 characters (will be hashed)

**Potential Issue:**
- ⚠️ If encryption key changed after onboarding, decryption will fail
- ⚠️ Need to verify key used for encryption matches current key

**Status:** ⚠️ **NEEDS VERIFICATION**

---

## POTENTIAL ISSUES IDENTIFIED

### Issue 1: Encryption Key Mismatch
**Symptom:** Decryption fails with "Invalid encrypted data format" or similar
**Cause:** `ENCRYPTION_MASTER_KEY` changed after onboarding
**Fix:** Re-encrypt OpenAI key with current master key, or restore original key

**Status:** ⚠️ **NEEDS VERIFICATION**

---

### Issue 2: API Key Not Found
**Symptom:** "Invalid API key" error
**Possible Causes:**
- Key hash mismatch (key format changed)
- Key not active (`is_active = false`)
- Key deleted from database

**Status:** ⚠️ **NEEDS VERIFICATION**

---

### Issue 3: Missing OpenAI Credentials
**Symptom:** "OpenAI credentials not found" error
**Possible Causes:**
- User hasn't completed onboarding
- Credentials deleted
- `user_id` mismatch between `api_keys` and `openai_credentials`

**Status:** ⚠️ **NEEDS VERIFICATION**

---

## NEXT STEPS

1. **Test Proxy Connection:**
   - Use the "Test Connection" button in the UI
   - Or manually call: `curl -X POST http://localhost:3000/api/proxy/v1/chat/completions -H "Authorization: Bearer cs_live_..." -H "Content-Type: application/json" -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"test"}]}'`
   
2. **Check Server Logs:**
   - Review all `[Proxy]`, `[Auth]`, and `[Credentials]` log messages
   - Identify the exact failure point

3. **Fix Identified Issue:**
   - Based on logs, apply the appropriate fix
   - Re-test until connection succeeds

4. **Cleanup:**
   - Remove sensitive log statements (key previews)
   - Keep error logging for production

---

**Sprint Status:** ✅ **FORENSIC LOGGING COMPLETE** - Ready for manual test to identify root cause.
