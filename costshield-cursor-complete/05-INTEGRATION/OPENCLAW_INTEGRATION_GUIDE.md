# OpenClaw Integration Guide for CostShield Cloud

**Version:** 1.0  
**Last Updated:** February 4, 2026  
**Purpose:** Enable seamless integration between OpenClaw AI agents and CostShield Cloud proxy

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technical Overview](#technical-overview)
3. [Configuration Guide](#configuration-guide)
4. [User Setup Instructions](#user-setup-instructions)
5. [Request/Response Format Specifications](#requestresponse-format-specifications)
6. [Troubleshooting](#troubleshooting)
7. [Testing & Verification](#testing--verification)
8. [Security Considerations](#security-considerations)
9. [Edge Cases & Advanced Scenarios](#edge-cases--advanced-scenarios)
10. [FAQ](#faq)

---

## Executive Summary

### What is OpenClaw?

OpenClaw (formerly Clawdbot/Moltbot) is an open-source, self-hosted personal AI assistant that:
- Runs locally on user devices (macOS, Linux, Windows via WSL2)
- Integrates with messaging platforms (WhatsApp, Telegram, Discord, Slack, etc.)
- Connects to various LLM providers (OpenAI, Anthropic, Google, etc.)
- Operates through a Gateway on port 18789 (default)

### Integration Strategy

CostShield Cloud will act as a **transparent API proxy** between OpenClaw and OpenAI's API. Users configure OpenClaw to point to CostShield's proxy URL instead of `api.openai.com`, enabling cost tracking, monitoring, and optimization.

### Key Integration Points

1. **Configuration File:** `~/.openclaw/openclaw.json`
2. **Custom Provider Section:** `models.providers`
3. **API Endpoint:** OpenAI-compatible `/v1/chat/completions`
4. **Authentication:** Bearer token in `Authorization` header
5. **Streaming:** Server-Sent Events (SSE) support

---

## Technical Overview

### How OpenClaw Connects to APIs

#### Architecture Flow

```
User → Messaging Platform → OpenClaw Gateway → Model Provider API → LLM
                                    ↓
                            Configuration File
                         (~/.openclaw/openclaw.json)
```

#### Configuration Mechanisms

OpenClaw supports multiple configuration methods (in order of precedence):

1. **Command-line flags** (highest priority)
2. **Environment variables** (`~/.openclaw/.env` or system env)
3. **Configuration file** (`~/.openclaw/openclaw.json`)
4. **System defaults** (lowest priority)

### Authentication Flow

```
┌─────────────┐
│  OpenClaw   │
│   Gateway   │
└──────┬──────┘
       │
       │ 1. Reads API key from config/env
       │
       ▼
┌─────────────────────────────┐
│  HTTP POST Request          │
│  Authorization: Bearer KEY  │
└──────────┬──────────────────┘
           │
           │ 2. Sends to configured baseUrl
           │
           ▼
    ┌──────────────┐
    │  Proxy/API   │
    │  Endpoint    │
    └──────────────┘
```

**Key Points:**
- OpenClaw uses **Bearer token** authentication
- API key is sent in `Authorization: Bearer <API_KEY>` header
- Keys can be stored in config file or environment variables
- For security, environment variable substitution is recommended: `"${API_KEY_VAR}"`

### Request Endpoint Structure

OpenClaw expects **OpenAI-compatible API format**:

- **Primary endpoint:** `/v1/chat/completions`
- **Base URL format:** `https://your-proxy.com` (no trailing slash)
- **Full URL:** `{baseUrl}/v1/chat/completions`

### Model Provider Configuration

OpenClaw references models using the format: `provider/model`

**Examples:**
- `openai/gpt-4`
- `costshield/gpt-4` (custom provider)
- `openrouter/anthropic/claude-sonnet-4.5`

---

## Configuration Guide

### Configuration File Location

**Default path:** `~/.openclaw/openclaw.json`

**Alternative paths:**
- Custom path via `OPENCLAW_CONFIG_PATH` environment variable
- Profile-specific: `--profile <name>` CLI flag

### File Format

- **JSON5 format** (supports comments and trailing commas)
- **Strict validation** (unknown keys cause Gateway startup failure)
- **Environment variable substitution** using `${VAR_NAME}` syntax

### Basic Structure for Custom Provider

```json5
{
  // Agent configuration
  "agents": {
    "defaults": {
      "model": {
        "primary": "costshield/gpt-4",  // Use custom provider
        "fallbacks": ["costshield/gpt-3.5-turbo"]  // Optional fallback
      },
      "models": {
        // Define model aliases
        "costshield/gpt-4": {
          "alias": "GPT-4 via CostShield"
        },
        "costshield/gpt-3.5-turbo": {
          "alias": "GPT-3.5 via CostShield"
        }
      }
    }
  },

  // Custom provider configuration
  "models": {
    "mode": "merge",  // Merge with built-in providers
    "providers": {
      "costshield": {
        "baseUrl": "https://proxy.costshield.dev",  // CostShield proxy URL
        "apiKey": "${COSTSHIELD_API_KEY}",  // Reference to env variable
        "api": "openai-completions",  // API type
        "models": [
          {
            "id": "gpt-4",
            "name": "GPT-4",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": {
              "input": 0.01,
              "output": 0.03,
              "cacheRead": 0.001,
              "cacheWrite": 0.0125
            },
            "contextWindow": 128000,
            "maxTokens": 4096
          },
          {
            "id": "gpt-3.5-turbo",
            "name": "GPT-3.5 Turbo",
            "reasoning": false,
            "input": ["text"],
            "cost": {
              "input": 0.0015,
              "output": 0.002
            },
            "contextWindow": 16385,
            "maxTokens": 4096
          }
        ]
      }
    }
  }
}
```

### Model Properties Explained

| Property | Required | Description | Example |
|----------|----------|-------------|---------|
| `id` | Yes | Model identifier (used in API calls) | `"gpt-4"` |
| `name` | Yes | Display name | `"GPT-4"` |
| `reasoning` | No | Supports chain-of-thought reasoning | `true` |
| `input` | No | Supported input types | `["text", "image"]` |
| `cost.input` | No | Cost per 1K input tokens (USD) | `0.01` |
| `cost.output` | No | Cost per 1K output tokens (USD) | `0.03` |
| `cost.cacheRead` | No | Cost per 1K cached tokens read | `0.001` |
| `cost.cacheWrite` | No | Cost per 1K tokens written to cache | `0.0125` |
| `contextWindow` | No | Maximum context size in tokens | `128000` |
| `maxTokens` | No | Maximum output tokens | `4096` |

### Environment Variable Setup

**Recommended approach for API key storage:**

1. Create or edit `~/.openclaw/.env`:
```bash
COSTSHIELD_API_KEY=your_actual_api_key_here
```

2. Alternative: Set in shell profile (`~/.bashrc`, `~/.zshrc`, etc.):
```bash
export COSTSHIELD_API_KEY="your_actual_api_key_here"
```

3. **Never commit API keys to version control!**

### Configuration Modes

The `models.mode` setting controls how custom providers are merged:

- **`"merge"`** (recommended): Merges custom providers with built-in ones
- **`"replace"`**: Replaces all built-in providers (not recommended)

### Authentication Profiles (Advanced)

For enhanced security, use auth profiles to store credentials in system keychain:

```json5
{
  "auth": {
    "profiles": {
      "costshield:default": {
        "provider": "costshield",
        "mode": "api_key"
      }
    }
  }
}
```

Then set the key securely:
```bash
openclaw auth set costshield:default --api-key
```

---

## User Setup Instructions

### Prerequisites

- OpenClaw installed (version 2026.1.29 or later recommended)
- Node.js 22+ (required by OpenClaw)
- CostShield Cloud account with API key
- Text editor or CLI access

### Step-by-Step Setup

#### Method 1: Manual Configuration (Recommended)

**Step 1: Backup Existing Configuration**

```bash
# Create backup
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup

# Verify location
ls -la ~/.openclaw/
```

**Step 2: Set Environment Variable**

```bash
# Add to ~/.openclaw/.env
echo "COSTSHIELD_API_KEY=your_api_key_here" >> ~/.openclaw/.env

# Or add to shell profile
echo 'export COSTSHIELD_API_KEY="your_api_key_here"' >> ~/.bashrc
source ~/.bashrc
```

**Step 3: Edit Configuration File**

Open `~/.openclaw/openclaw.json` and add the CostShield provider:

```bash
# Using nano
nano ~/.openclaw/openclaw.json

# Using vim
vim ~/.openclaw/openclaw.json

# Using VS Code
code ~/.openclaw/openclaw.json
```

**Step 4: Add CostShield Configuration**

Insert this configuration block (adapt to your existing structure):

```json5
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "costshield/gpt-4"
      }
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "costshield": {
        "baseUrl": "https://proxy.costshield.dev",
        "apiKey": "${COSTSHIELD_API_KEY}",
        "api": "openai-completions",
        "models": [
          {
            "id": "gpt-4",
            "name": "GPT-4 via CostShield"
          },
          {
            "id": "gpt-3.5-turbo",
            "name": "GPT-3.5 Turbo via CostShield"
          }
        ]
      }
    }
  }
}
```

**Step 5: Validate Configuration**

```bash
# Check for syntax errors
openclaw doctor

# Verify configuration is valid
openclaw status --all
```

**Step 6: Restart Gateway**

```bash
# If running as daemon
openclaw gateway restart

# If running manually, stop and start
openclaw gateway stop
openclaw gateway run
```

**Step 7: Verify Model Availability**

```bash
# List all configured models
openclaw models list

# Check model status (tests API connection)
openclaw models status --probe
```

Expected output should show `costshield/gpt-4` and `costshield/gpt-3.5-turbo` as available.

#### Method 2: CLI Configuration (Alternative)

**Step 1: Use Interactive Setup**

```bash
openclaw configure
```

Navigate to `Models → Providers` and add CostShield manually through the UI.

**Step 2: Set Model via CLI**

```bash
openclaw models set costshield/gpt-4
```

### Verification Steps

**1. Check Configuration Applied**

```bash
openclaw status --all
```

Look for:
- ✅ Gateway running
- ✅ Model `costshield/gpt-4` configured
- ✅ API key present (will show as `[REDACTED]`)

**2. Test API Connection**

```bash
# Probe the provider
openclaw models status --probe

# Expected output:
# ✓ costshield/gpt-4 - OK (authenticated)
```

**3. Send Test Message**

Via CLI:
```bash
openclaw chat "Hello, are you working?"
```

Or through your configured messaging channel (Telegram, Discord, etc.).

**4. Check Logs**

```bash
# Live logs
openclaw logs --follow

# Look for successful API calls to your proxy URL
```

---

## Request/Response Format Specifications

### HTTP Request Format

OpenClaw sends standard OpenAI-compatible requests:

#### Headers

```http
POST /v1/chat/completions HTTP/1.1
Host: proxy.costshield.dev
Content-Type: application/json
Authorization: Bearer <COSTSHIELD_API_KEY>
User-Agent: openclaw/<version>
```

#### Request Body (Non-Streaming)

```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1000,
  "top_p": 1.0,
  "frequency_penalty": 0.0,
  "presence_penalty": 0.0
}
```

#### Request Body (Streaming)

```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "user",
      "content": "Tell me a story."
    }
  ],
  "stream": true
}
```

### Response Format

#### Non-Streaming Response

```json
{
  "id": "chatcmpl-123456",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well, thank you for asking."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 15,
    "total_tokens": 35
  }
}
```

#### Streaming Response (SSE Format)

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-4","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**Streaming Requirements:**
- Content-Type: `text/event-stream`
- Each event line: `data: <json>\n`
- Stream terminator: `data: [DONE]\n`
- Chunks sent immediately (no buffering)

### Error Response Format

```json
{
  "error": {
    "message": "Invalid API key provided",
    "type": "invalid_request_error",
    "param": null,
    "code": "invalid_api_key"
  }
}
```

**Common HTTP Status Codes:**

| Code | Meaning | OpenClaw Behavior |
|------|---------|-------------------|
| 200 | Success | Processes response normally |
| 400 | Bad Request | Logs error, may retry with adjusted params |
| 401 | Unauthorized | Reports auth failure, stops requests |
| 403 | Forbidden | Reports permission error |
| 404 | Not Found | Triggers model fallback (if configured) |
| 429 | Rate Limited | Implements exponential backoff, retries |
| 500 | Server Error | Retries with exponential backoff |
| 502/503 | Bad Gateway/Service Unavailable | Retries, may switch to fallback model |

### Custom Headers (Optional)

CostShield can read additional headers for tracking:

```http
X-OpenClaw-Agent-ID: main
X-OpenClaw-Session-ID: session-abc123
X-User-ID: user-openclaw-12345
```

These are **not required** for basic functionality but can enhance tracking.

---

## Troubleshooting

### Common Issues & Solutions

#### Issue 1: "No API key found for provider 'costshield'"

**Symptoms:**
- Error message in logs: `No API key found`
- Model status shows ❌ for costshield models

**Diagnosis:**
```bash
# Check if env variable is set
echo $COSTSHIELD_API_KEY

# Check OpenClaw can see it
openclaw status --all | grep -i costshield
```

**Solutions:**

1. **Env variable not set:**
```bash
# Add to .env file
echo "COSTSHIELD_API_KEY=your_key" >> ~/.openclaw/.env

# Restart gateway
openclaw gateway restart
```

2. **Typo in variable name:**
```bash
# Check openclaw.json uses correct variable name
grep -i "costshield" ~/.openclaw/openclaw.json

# Should show: "apiKey": "${COSTSHIELD_API_KEY}"
```

3. **Not using environment variable (hardcoded):**
```json5
// Instead of using ${VAR}, directly set key (not recommended)
"apiKey": "your_actual_key_here"
```

---

#### Issue 2: "Connection failed" or "fetch failed"

**Symptoms:**
- API requests timeout
- Logs show network errors
- Gateway may crash (on older versions)

**Diagnosis:**
```bash
# Test connectivity to proxy
curl -I https://proxy.costshield.dev/v1/chat/completions

# Check OpenClaw logs
openclaw logs --follow | grep -i error
```

**Solutions:**

1. **Check baseUrl format:**
```json5
// ❌ Wrong - has trailing slash
"baseUrl": "https://proxy.costshield.dev/"

// ✅ Correct - no trailing slash
"baseUrl": "https://proxy.costshield.dev"
```

2. **Verify SSL/TLS certificate:**
```bash
# Test SSL connection
openssl s_client -connect proxy.costshield.dev:443 -servername proxy.costshield.dev
```

3. **Check firewall/network:**
```bash
# Test if port 443 is accessible
nc -zv proxy.costshield.dev 443
```

4. **Proxy/VPN interference:**
- Temporarily disable system proxy
- Try from different network

---

#### Issue 3: "Model not found" (404 error)

**Symptoms:**
- Error: `Model 'gpt-4' not found`
- OpenClaw hangs indefinitely

**Diagnosis:**
```bash
# Check configured model IDs
openclaw models list | grep costshield
```

**Solutions:**

1. **Model ID mismatch:**
```json5
// Ensure model ID in config matches what you use
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "costshield/gpt-4"  // Must match ID below
      }
    }
  },
  "models": {
    "providers": {
      "costshield": {
        "models": [
          {
            "id": "gpt-4",  // ID here (without provider prefix)
            "name": "GPT-4"
          }
        ]
      }
    }
  }
}
```

2. **Configure fallback model:**
```json5
{
  "model": {
    "primary": "costshield/gpt-4",
    "fallbacks": ["costshield/gpt-3.5-turbo"]
  }
}
```

3. **Upgrade OpenClaw** (404 handling improved in newer versions):
```bash
npm update -g openclaw
openclaw gateway restart
```

---

#### Issue 4: Gateway crashes on API failures

**Symptoms:**
- Gateway process terminates unexpectedly
- Need to manually restart multiple times
- "Unhandled promise rejection" in logs

**Diagnosis:**
```bash
# Check OpenClaw version
openclaw --version

# Check for crash logs
journalctl -u openclaw-gateway --since "1 hour ago"
```

**Solutions:**

1. **Upgrade to stable version:**
```bash
npm install -g openclaw@latest
```

2. **Run gateway in supervised mode:**
```bash
# Using systemd (auto-restart)
openclaw onboard --install-daemon

# Or use process manager like PM2
npm install -g pm2
pm2 start "openclaw gateway run" --name openclaw
pm2 save
```

---

#### Issue 5: Streaming not working

**Symptoms:**
- Responses appear all at once (not incrementally)
- Long delays before seeing any output
- Streaming toggle has no effect

**Diagnosis:**
```bash
# Test streaming directly
curl -N https://proxy.costshield.dev/v1/chat/completions \
  -H "Authorization: Bearer $COSTSHIELD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Count to 10"}],
    "stream": true
  }'
```

**Solutions:**

1. **Proxy buffering issue:**
If using Nginx/Caddy in front of CostShield:
```nginx
# Nginx config
location /v1/ {
    proxy_pass https://upstream;
    proxy_buffering off;  # Critical for SSE
    proxy_cache off;
    chunked_transfer_encoding off;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
}
```

2. **Client-side issue:**
OpenClaw should handle streaming automatically. Verify in logs:
```bash
openclaw logs --follow | grep -i stream
```

3. **CostShield proxy configuration:**
Ensure CostShield proxy supports streaming and forwards SSE correctly.

---

#### Issue 6: Unauthorized (401) errors

**Symptoms:**
- API key rejected
- 401 Unauthorized in logs

**Diagnosis:**
```bash
# Test API key directly
curl https://proxy.costshield.dev/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"test"}]}'
```

**Solutions:**

1. **API key has leading/trailing spaces:**
```bash
# Check for whitespace
echo "$COSTSHIELD_API_KEY" | cat -A

# Clean it
export COSTSHIELD_API_KEY=$(echo "$COSTSHIELD_API_KEY" | xargs)
```

2. **Wrong API key:**
- Verify key in CostShield dashboard
- Regenerate if necessary
- Update in `~/.openclaw/.env`

3. **API key expired:**
- Check CostShield account status
- Renew subscription if needed

---

### Diagnostic Commands Reference

```bash
# Comprehensive system check
openclaw status --all

# Test model connection with live probe
openclaw models status --probe

# Validate and repair configuration
openclaw doctor

# View live logs
openclaw logs --follow

# Check specific channel logs
openclaw channels logs --channel telegram

# View recent conversations
openclaw sessions list

# Test gateway connectivity
openclaw gateway status

# Security audit (check for common misconfigurations)
openclaw security audit --deep
```

---

## Testing & Verification

### Pre-Flight Checklist

Before considering the integration complete, verify:

- [ ] Configuration file valid (`openclaw doctor` passes)
- [ ] Environment variable set correctly
- [ ] Gateway running (`openclaw gateway status`)
- [ ] Model listed (`openclaw models list` shows costshield models)
- [ ] API connection successful (`openclaw models status --probe`)
- [ ] Test message sent and received
- [ ] Logs show successful API calls to CostShield proxy
- [ ] Streaming works (if applicable)
- [ ] Fallback model works (if configured)

### Manual Testing Procedure

#### Test 1: Basic Connectivity

```bash
# Start with simple ping test
curl -I https://proxy.costshield.dev

# Expected: HTTP 200 or 404 (endpoint exists)
```

#### Test 2: API Key Validation

```bash
# Test authentication
curl https://proxy.costshield.dev/v1/chat/completions \
  -H "Authorization: Bearer $COSTSHIELD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hi"}],
    "max_tokens": 10
  }'

# Expected: Valid JSON response with completion
```

#### Test 3: OpenClaw CLI Test

```bash
# Send test message via OpenClaw CLI
openclaw chat "Say 'OpenClaw is working correctly' if you can read this."

# Expected: Response with confirmation message
```

#### Test 4: Streaming Test

```bash
# Test streaming response
curl -N https://proxy.costshield.dev/v1/chat/completions \
  -H "Authorization: Bearer $COSTSHIELD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Count to 5 slowly"}],
    "stream": true
  }'

# Expected: Incremental SSE chunks, ending with [DONE]
```

#### Test 5: Error Handling

```bash
# Test with invalid API key
curl https://proxy.costshield.dev/v1/chat/completions \
  -H "Authorization: Bearer invalid_key" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"test"}]}'

# Expected: 401 error with proper JSON error response
```

#### Test 6: Fallback Model

```bash
# Temporarily make primary model unavailable (e.g., wrong model ID)
# Edit config to use non-existent model ID
# Send message, verify fallback is used

openclaw chat "Testing fallback"

# Check logs to verify fallback model was invoked
openclaw logs --follow | grep -i fallback
```

### Monitoring for Production

**Key Metrics to Track:**

1. **Request Success Rate**
   - Monitor 2xx vs 4xx/5xx responses
   - Track failed API calls

2. **Response Latency**
   - Time from request to first byte
   - Time to complete response

3. **Token Usage**
   - Track via OpenClaw logs or CostShield dashboard
   - Monitor costs

4. **Model Availability**
   - Uptime of primary model
   - Frequency of fallback usage

**Logging for Production:**

Enable detailed diagnostics:

```json5
{
  "logging": {
    "level": "info",  // or "debug" for verbose
    "consoleLevel": "info",
    "consoleStyle": "json",  // Structured logs for parsing
    "redactSensitive": "tools"  // Redact API keys in console
  },
  "diagnostics": {
    "enabled": true,
    "flags": ["model.usage", "webhook.received"]
  }
}
```

**OpenTelemetry Integration (Optional):**

For advanced monitoring:

```json5
{
  "diagnostics": {
    "enabled": true,
    "otel": {
      "endpoint": "https://otel-collector.yourcompany.com/v1/traces",
      "headers": {
        "Authorization": "Bearer YOUR_OTEL_TOKEN"
      },
      "metrics": true,
      "traces": true,
      "logs": false  // High volume, enable only if needed
    }
  }
}
```

---

## Security Considerations

### API Key Management

**Best Practices:**

1. **Never hardcode API keys in config files**
   ```json5
   // ❌ Bad
   "apiKey": "sk-actual-key-here"
   
   // ✅ Good
   "apiKey": "${COSTSHIELD_API_KEY}"
   ```

2. **Use environment files with restricted permissions**
   ```bash
   chmod 600 ~/.openclaw/.env
   ```

3. **Rotate API keys regularly**
   - Set up key rotation schedule (e.g., every 90 days)
   - Update in CostShield dashboard
   - Update in OpenClaw config
   - Restart gateway

4. **Use separate keys for dev/prod**
   ```bash
   # Development
   export COSTSHIELD_API_KEY="sk-dev-..."
   
   # Production
   export COSTSHIELD_API_KEY="sk-prod-..."
   ```

### Network Security

**Recommendations:**

1. **Run OpenClaw on loopback only**
   ```json5
   {
     "gateway": {
       "bind": "loopback",  // Only accessible from localhost
       "port": 18789
     }
   }
   ```

2. **Use secure access methods for remote access**
   - Tailscale (VPN)
   - SSH tunneling
   - WireGuard
   - **Never expose port 18789 to public internet**

3. **Configure trusted proxies if using reverse proxy**
   ```json5
   {
     "gateway": {
       "trustedProxies": ["127.0.0.1"],
       "auth": {
         "mode": "password",
         "password": "${OPENCLAW_GATEWAY_PASSWORD}"
       }
     }
   }
   ```

### User Identification

**How to Identify Users:**

CostShield needs to track which OpenClaw user is making requests. Options:

1. **Option A: Unique API Key per User**
   - Each user gets their own CostShield API key
   - Simplest approach
   - Best for tracking and billing

2. **Option B: Custom Header**
   OpenClaw can send custom headers:
   ```json5
   {
     "models": {
       "providers": {
         "costshield": {
           "baseUrl": "https://proxy.costshield.dev",
           "apiKey": "${COSTSHIELD_API_KEY}",
           "headers": {
             "X-User-ID": "user-openclaw-12345"
           }
         }
       }
     }
   }
   ```

3. **Option C: API Key Metadata**
   - Store user ID in CostShield dashboard metadata for each API key
   - No OpenClaw config changes needed

### Preventing Unauthorized Access

**CostShield Proxy Side:**

1. **Validate API keys against your database**
2. **Implement rate limiting per API key**
3. **Log all requests with timestamps and user IDs**
4. **Set up alerts for suspicious activity:**
   - Unusual spike in requests
   - Requests from unexpected IPs (if tracking)
   - High token usage

**OpenClaw Side:**

1. **Enable gateway authentication**
   ```json5
   {
     "gateway": {
       "auth": {
         "mode": "password",
         "password": "${OPENCLAW_GATEWAY_PASSWORD}"
       }
     }
   }
   ```

2. **Run security audit regularly**
   ```bash
   openclaw security audit --deep
   ```

3. **Review and limit tool policies**
   ```json5
   {
     "tools": {
       "profile": "minimal",  // Restrict capabilities
       "exec": {
         "security": "strict"
       }
     }
   }
   ```

### Data Privacy

**Considerations:**

1. **Logging:** Be mindful of what gets logged
   - Redact sensitive user messages if logging to external services
   - Use `redactSensitive: "tools"` in logging config

2. **Transmission:** All communication should use HTTPS
   - Enforce TLS 1.2+ on CostShield proxy
   - Validate certificates

3. **Storage:** 
   - OpenClaw stores conversation history locally
   - CostShield should not persist sensitive message content unless required

---

## Edge Cases & Advanced Scenarios

### Multiple OpenClaw Instances

**Scenario:** User runs multiple OpenClaw gateways (e.g., personal and work).

**Solutions:**

1. **Separate API Keys:**
   ```bash
   # Instance 1 (personal)
   export COSTSHIELD_API_KEY="sk-personal-..."
   
   # Instance 2 (work)
   export COSTSHIELD_API_KEY="sk-work-..."
   ```

2. **Different Profiles:**
   ```bash
   # Start with different profiles
   openclaw gateway run --profile personal
   openclaw gateway run --profile work
   ```

3. **Different Ports:**
   ```json5
   // Personal instance
   { "gateway": { "port": 18789 } }
   
   // Work instance
   { "gateway": { "port": 18790 } }
   ```

### Different OpenClaw Versions

**Compatibility Matrix:**

| OpenClaw Version | CostShield Compatibility | Notes |
|------------------|-------------------------|-------|
| < 2026.1.24 | ⚠️ Not Recommended | Security vulnerabilities (CVE-2026-25253) |
| 2026.1.24 - 2026.1.28 | ✅ Compatible | Security patch applied |
| 2026.1.29+ | ✅ Fully Compatible | Latest stable |
| 2026.2.0+ | ✅ Fully Compatible | Latest with enhancements |

**Recommendation:** Always use version 2026.1.29 or later.

### Different AI Providers (Not Just OpenAI)

**Scenario:** User wants to use CostShield for other providers (Anthropic, Google, etc.).

**Challenge:** OpenClaw's provider configuration is model-specific.

**Solutions:**

1. **OpenAI API Compatibility Mode:**
   If CostShield can translate OpenAI format to other providers:
   ```json5
   {
     "models": {
       "providers": {
         "costshield-anthropic": {
           "baseUrl": "https://proxy.costshield.dev/anthropic",
           "apiKey": "${COSTSHIELD_API_KEY}",
           "api": "anthropic-messages",  // Note: different API type
           "models": [{"id": "claude-opus-4-5", "name": "Claude Opus"}]
         }
       }
     }
   }
   ```

2. **Multiple Providers:**
   Users can configure multiple providers, mixing proxied and direct:
   ```json5
   {
     "models": {
       "providers": {
         "costshield-openai": { /* OpenAI via CostShield */ },
         "costshield-anthropic": { /* Anthropic via CostShield */ },
         "direct-google": { /* Google direct */ }
       }
     }
   }
   ```

### Fallback Behavior

**Scenario:** CostShield proxy is temporarily unavailable.

**Default Behavior:**
- OpenClaw will retry with exponential backoff
- After multiple failures, attempts fallback model (if configured)
- If no fallback, reports error to user

**Recommended Configuration:**

```json5
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "costshield/gpt-4",
        "fallbacks": [
          "costshield/gpt-3.5-turbo",  // Cheaper model via same proxy
          "openai/gpt-3.5-turbo"  // Direct to OpenAI as last resort
        ]
      }
    }
  }
}
```

**Note:** Ensure user has direct OpenAI API key set if using direct fallback.

### High-Volume Users

**Considerations:**

1. **Rate Limiting:**
   - Implement per-API-key rate limits on CostShield side
   - Return `429 Too Many Requests` when exceeded
   - OpenClaw will automatically back off

2. **Connection Pooling:**
   - CostShield proxy should use connection pooling to upstream APIs
   - Handle concurrent requests efficiently

3. **Caching:**
   - Consider caching identical requests (with short TTL)
   - Respect OpenAI's caching for efficiency

---

## FAQ

### General Questions

**Q: Does this work with all OpenClaw versions?**
A: Best compatibility with version 2026.1.29+. Older versions have security issues and are not recommended.

**Q: Can I use CostShield with other AI apps besides OpenClaw?**
A: Yes, any app that supports OpenAI-compatible API can use CostShield proxy.

**Q: Is streaming supported?**
A: Yes, CostShield must support Server-Sent Events (SSE) for streaming to work.

### Configuration Questions

**Q: Where exactly is the config file?**
A: Default location is `~/.openclaw/openclaw.json`. Use `openclaw status --all` to verify path.

**Q: Do I need to restart OpenClaw after config changes?**
A: Yes, always restart the gateway: `openclaw gateway restart`

**Q: Can I use multiple proxies simultaneously?**
A: Yes, configure different providers for different proxies:
```json5
{
  "models": {
    "providers": {
      "proxy1": { "baseUrl": "https://proxy1.com" },
      "proxy2": { "baseUrl": "https://proxy2.com" }
    }
  }
}
```

**Q: How do I switch back to direct OpenAI?**
A: Change the primary model:
```bash
openclaw models set openai/gpt-4
```

### Troubleshooting Questions

**Q: Gateway keeps crashing on API failures. Why?**
A: Update to OpenClaw 2026.1.29+. Older versions have unhandled promise rejection issues.

**Q: API key not being recognized. What's wrong?**
A: Common causes:
- Typo in environment variable name
- Variable not exported
- Gateway not restarted after setting variable
- Leading/trailing spaces in key

**Q: Streaming isn't working. How do I fix it?**
A: Check:
- CostShield proxy supports SSE
- No buffering proxies (Nginx) between OpenClaw and CostShield
- Test streaming directly with curl

**Q: How do I know if OpenClaw is actually using CostShield?**
A: Check logs:
```bash
openclaw logs --follow | grep -i "costshield\|proxy.costshield"
```
You should see API calls to your proxy URL.

### Security Questions

**Q: Is it safe to put my API key in the config file?**
A: Use environment variable substitution (`${VAR_NAME}`) instead of hardcoding. Store actual key in `~/.openclaw/.env` with restricted permissions.

**Q: Can others see my API key?**
A: If your OpenClaw instance is exposed to the internet, yes (security risk). Always bind to loopback and use secure access methods (VPN, SSH).

**Q: How do I rotate my API key?**
A:
1. Generate new key in CostShield dashboard
2. Update `~/.openclaw/.env`
3. Restart gateway: `openclaw gateway restart`
4. Revoke old key in CostShield dashboard

**Q: What happens if my API key is compromised?**
A:
1. Immediately revoke key in CostShield dashboard
2. Generate new key
3. Update OpenClaw config
4. Review CostShield logs for unauthorized usage

### Usage Questions

**Q: Will this increase latency?**
A: Minimal increase (typically <50ms) due to proxy hop. If CostShield implements caching, may actually be faster for repeated queries.

**Q: Can I track my usage?**
A: Yes, through CostShield dashboard. OpenClaw also logs token usage locally.

**Q: Does this work with OpenClaw's messaging channels (WhatsApp, Telegram)?**
A: Yes, it's transparent to all messaging channels. OpenClaw routes all LLM requests through the configured provider.

**Q: What if I want to use different models for different channels?**
A: Configure per-channel models:
```json5
{
  "channels": {
    "telegram": {
      "model": { "primary": "costshield/gpt-3.5-turbo" }
    },
    "discord": {
      "model": { "primary": "costshield/gpt-4" }
    }
  }
}
```

---

## Appendix A: Complete Configuration Example

**File: `~/.openclaw/openclaw.json`**

```json5
{
  // Agent defaults
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      
      // Model configuration
      "model": {
        "primary": "costshield/gpt-4",
        "fallbacks": [
          "costshield/gpt-3.5-turbo",
          "openai/gpt-3.5-turbo"  // Emergency fallback
        ]
      },
      
      // Model aliases (display names)
      "models": {
        "costshield/gpt-4": {
          "alias": "GPT-4 via CostShield"
        },
        "costshield/gpt-3.5-turbo": {
          "alias": "GPT-3.5 via CostShield"
        }
      }
    },
    
    // Define agents (optional)
    "list": [
      {
        "id": "main",
        "default": true
      }
    ]
  },
  
  // Gateway settings
  "gateway": {
    "mode": "local",
    "port": 18789,
    "bind": "loopback",  // Security: only localhost access
    "auth": {
      "mode": "password",
      "password": "${OPENCLAW_GATEWAY_PASSWORD}"
    }
  },
  
  // Model provider configuration
  "models": {
    "mode": "merge",  // Merge with built-in providers
    "providers": {
      "costshield": {
        "baseUrl": "https://proxy.costshield.dev",
        "apiKey": "${COSTSHIELD_API_KEY}",
        "api": "openai-completions",
        "models": [
          {
            "id": "gpt-4",
            "name": "GPT-4",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": {
              "input": 0.01,
              "output": 0.03,
              "cacheRead": 0.001,
              "cacheWrite": 0.0125
            },
            "contextWindow": 128000,
            "maxTokens": 4096
          },
          {
            "id": "gpt-3.5-turbo",
            "name": "GPT-3.5 Turbo",
            "reasoning": false,
            "input": ["text"],
            "cost": {
              "input": 0.0015,
              "output": 0.002
            },
            "contextWindow": 16385,
            "maxTokens": 4096
          },
          {
            "id": "gpt-4-turbo",
            "name": "GPT-4 Turbo",
            "reasoning": true,
            "input": ["text", "image"],
            "cost": {
              "input": 0.01,
              "output": 0.03
            },
            "contextWindow": 128000,
            "maxTokens": 4096
          }
        ]
      }
    }
  },
  
  // Logging configuration
  "logging": {
    "level": "info",
    "consoleLevel": "info",
    "consoleStyle": "pretty",
    "redactSensitive": "tools"
  },
  
  // Diagnostics (optional)
  "diagnostics": {
    "enabled": true,
    "flags": ["model.usage"]
  },
  
  // Messaging channels (example)
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "${TELEGRAM_BOT_TOKEN}",
      "dmPolicy": "pairing",  // Require approval for DMs
      "sendReadReceipts": true
    }
  },
  
  // Tool security
  "tools": {
    "profile": "coding",  // Or "minimal", "messaging", "full"
    "exec": {
      "security": "strict",
      "host": "docker"  // Run in container, not on host
    }
  }
}
```

**File: `~/.openclaw/.env`**

```bash
# CostShield API Key
COSTSHIELD_API_KEY=your_costshield_api_key_here

# Gateway Password
OPENCLAW_GATEWAY_PASSWORD=your_secure_gateway_password

# Telegram Bot Token (if using)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Optional: Direct OpenAI key for fallback
OPENAI_API_KEY=your_openai_key_for_emergency_fallback
```

---

## Appendix B: Quick Command Reference

```bash
# Installation & Setup
npm install -g openclaw@latest        # Install/update OpenClaw
openclaw onboard                      # Interactive setup wizard
openclaw onboard --install-daemon     # Install as background service

# Configuration Management
openclaw setup                        # Initialize minimal config
openclaw configure                    # Interactive config editor
openclaw doctor                       # Validate and repair config
openclaw reset                        # Remove all config/data

# Gateway Control
openclaw gateway run                  # Start gateway (foreground)
openclaw gateway start                # Start daemon (background)
openclaw gateway stop                 # Stop daemon
openclaw gateway restart              # Restart daemon
openclaw gateway status               # Check daemon status

# Model Management
openclaw models list                  # List all configured models
openclaw models set <provider/model>  # Set primary model
openclaw models status                # Check model config
openclaw models status --probe        # Test API connections
openclaw models fallbacks add <model> # Add fallback model
openclaw models fallbacks clear       # Remove all fallbacks

# Authentication
openclaw auth set <profile> --api-key # Set API key securely
openclaw models auth add              # Add auth credentials

# Diagnostics & Troubleshooting
openclaw status --all                 # Comprehensive system status
openclaw logs --follow                # Live log tailing
openclaw logs --json                  # Structured JSON logs
openclaw security audit               # Security configuration check
openclaw security audit --deep        # Deep security scan with network probe

# Channel Management
openclaw channels list                # List configured channels
openclaw channels logs --channel <name> # View channel-specific logs

# Session Management
openclaw sessions list                # List active sessions
openclaw sessions clear               # Clear all sessions

# Testing
openclaw chat "test message"          # Send test message via CLI

# Utility
openclaw --version                    # Check version
openclaw --help                       # Show help
```

---

## Appendix C: Useful Resources

### Official Documentation
- **OpenClaw Docs:** https://docs.openclaw.ai/
- **GitHub Repository:** https://github.com/openclaw/openclaw
- **OpenClaw Website:** https://openclaw.ai/

### Community Resources
- **Discord:** OpenClaw community Discord server
- **Reddit:** r/OpenClaw, r/LocalLLM
- **GitHub Discussions:** https://github.com/openclaw/openclaw/discussions

### Related Projects
- **OpenRouter:** API aggregator for multiple LLM providers
- **Lynkr:** Local LLM proxy for OpenClaw
- **Composio:** Secure credential management for AI agents

### Security Resources
- **CVE-2026-25253:** OpenClaw RCE vulnerability details
- **Security Checklist:** https://www.toxsec.com/p/openclaw-security-checklist

---

## Changelog

### Version 1.0 (February 4, 2026)
- Initial release
- Comprehensive OpenClaw integration guide
- Configuration examples for CostShield Cloud
- Troubleshooting and FAQ sections
- Security best practices
- Testing and verification procedures

---

## Support

**For CostShield-specific issues:**
- CostShield Support: support@costshield.dev
- CostShield Dashboard: https://dashboard.costshield.dev

**For OpenClaw issues:**
- GitHub Issues: https://github.com/openclaw/openclaw/issues
- Community Discord
- Documentation: https://docs.openclaw.ai/

**For integration questions:**
- Check this guide first (especially FAQ and Troubleshooting sections)
- Verify configuration with `openclaw doctor`
- Check logs with `openclaw logs --follow`
- Contact CostShield support with relevant logs

---

**End of Guide**
