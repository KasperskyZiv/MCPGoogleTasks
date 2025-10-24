# ngrok Setup Guide for OpenAI Integration

This guide explains how to securely expose your MCP Google Tasks server to OpenAI using ngrok.

## Prerequisites

- ngrok installed and configured on your machine
- OpenAI account with access to Custom GPTs or ChatGPT connector
- MCP Google Tasks server set up with valid Google OAuth credentials

## Security Overview

The HTTP server includes multiple security layers:

1. **Bearer Token Authentication** - Only requests with valid `MCP_TOKEN` are accepted
2. **Read-Only Mode** - By default, only list/get operations are allowed
3. **Rate Limiting** - Prevents abuse (100 requests per 15 minutes by default)
4. **CORS Restrictions** - Only your ngrok domain can make requests
5. **Security Headers** - Helmet.js provides additional security headers
6. **HTTPS via ngrok** - All traffic is encrypted
7. **Local Binding** - Server only listens on 127.0.0.1 (not exposed to LAN)

## Step 1: Generate Secure Token

Generate a secure MCP token (32+ characters):

```bash
openssl rand -hex 32
```

This will output something like:
```
a1b2c3d4e5f6789... (64 characters)
```

## Step 2: Configure Environment Variables

Add these to your `.env` file:

```bash
# Generate with: openssl rand -hex 32
MCP_TOKEN=your-generated-token-here

# Your ngrok domain (get this from ngrok dashboard)
NGROK_DOMAIN=your-domain.ngrok-free.app

# Port for local server
PORT=3000

# Security: true = read-only (safer), false = full access
READ_ONLY=true

# Rate limiting (requests per window)
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
```

## Step 3: Start the HTTP Server

```bash
# Development mode
npm run dev:http

# Production mode
npm run build
npm run start:http
```

You should see:
```
🚀 Google Tasks MCP HTTP Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Server running on: http://127.0.0.1:3000
🔒 Mode: READ-ONLY ✓
🛡️  Rate limit: 100 requests per 15 minutes
🌐 CORS: Restricted to your-domain.ngrok-free.app
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  Health check: http://127.0.0.1:3000/health
ℹ️  MCP endpoint: http://127.0.0.1:3000/mcp/sse

📖 Ready to accept connections with bearer token authentication
```

## Step 4: Start ngrok Tunnel

### Option A: Using Static Domain (Recommended)

If you have a static ngrok domain:

```bash
ngrok http 3000 --domain=your-domain.ngrok-free.app
```

### Option B: Using Random Domain

```bash
ngrok http 3000
```

Copy the generated URL (e.g., `https://abc123.ngrok-free.app`) and update your `.env`:

```bash
NGROK_DOMAIN=abc123.ngrok-free.app
```

Then restart your HTTP server.

## Step 5: Test the Connection

Test the health endpoint:

```bash
curl https://your-domain.ngrok-free.app/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "0.1.0",
  "readOnly": true,
  "timestamp": "2025-10-21T12:00:00.000Z"
}
```

Test with bearer token:

```bash
curl https://your-domain.ngrok-free.app/mcp/sse \
  -H "Authorization: Bearer your-mcp-token-here"
```

## Step 6: Configure OpenAI

### For Custom GPT:

1. Go to ChatGPT → Create GPT → Configure
2. Under "Actions", add new action
3. Use the SSE endpoint: `https://your-domain.ngrok-free.app/mcp/sse`
4. Set authentication to "Bearer"
5. Add your `MCP_TOKEN` value

### For ChatGPT Connector (if available):

1. Settings → Integrations → Add Connector
2. URL: `https://your-domain.ngrok-free.app/mcp/sse`
3. Authentication: Bearer Token
4. Token: `your-mcp-token-here`

## Available Tools (Read-Only Mode)

When `READ_ONLY=true`, only these tools are available:

- ✅ `list_task_lists` - List all task lists
- ✅ `list_tasks` - List tasks in a task list
- ✅ `get_auth_url` - Get OAuth URL (for initial setup)

Disabled in read-only mode:
- ❌ `create_task_list`
- ❌ `create_task`
- ❌ `update_task`
- ❌ `delete_task`

To enable write operations, set `READ_ONLY=false` in `.env` and restart.

## Security Best Practices

### 1. Token Management

- **Never commit tokens** to git
- **Rotate tokens regularly** (monthly recommended)
- **Use long tokens** (32+ characters minimum)
- **Store in environment variables** only

### 2. Monitor Usage

Watch server logs for:
- Unauthorized access attempts
- Rate limit hits
- Unusual traffic patterns

### 3. ngrok Security

- Use **static domains** when possible
- Enable **ngrok IP restrictions** (paid feature)
- Monitor ngrok dashboard for traffic
- Consider ngrok's **IP whitelisting** (enterprise)

### 4. Limit Exposure

- Keep `READ_ONLY=true` unless you specifically need writes
- Use strictest rate limits that work for your use case
- Only expose when actively using
- Shut down when not needed

### 5. Firewall Rules

The server binds to `127.0.0.1` only, so it's not exposed to your LAN. Don't change this to `0.0.0.0`.

## Rotating Tokens

When you need to rotate your MCP token:

1. Generate new token: `openssl rand -hex 32`
2. Update `.env` with new `MCP_TOKEN`
3. Restart HTTP server
4. Update token in OpenAI configuration
5. Old token is immediately invalid

## Troubleshooting

### "Unauthorized" errors

- Check `MCP_TOKEN` matches in both .env and OpenAI
- Verify `Authorization: Bearer TOKEN` header is sent
- Check for extra whitespace in token

### CORS errors

- Ensure `NGROK_DOMAIN` matches your actual ngrok URL (without https://)
- Restart server after updating `NGROK_DOMAIN`

### Rate limit errors

- Increase `RATE_LIMIT_MAX` if needed
- Increase `RATE_LIMIT_WINDOW_MS` (in milliseconds)
- Rate limits reset after the window expires

### Connection refused

- Verify server is running on correct port
- Check ngrok is tunneling to correct port
- Test health endpoint first

## Advanced: Multiple Environments

For production and development:

**.env.development**
```bash
PORT=3000
READ_ONLY=true
RATE_LIMIT_MAX=50
NGROK_DOMAIN=dev-domain.ngrok-free.app
MCP_TOKEN=dev-token-here
```

**.env.production**
```bash
PORT=3000
READ_ONLY=true
RATE_LIMIT_MAX=200
NGROK_DOMAIN=prod-domain.ngrok-free.app
MCP_TOKEN=prod-token-here
```

Load specific config:
```bash
cp .env.production .env
npm run start:http
```

## Monitoring

Monitor your server:

```bash
# Watch logs in real-time
npm run dev:http

# Check health
watch -n 5 'curl -s https://your-domain.ngrok-free.app/health | jq'
```

## Shutting Down

Always shut down gracefully:

1. Stop ngrok (Ctrl+C)
2. Stop HTTP server (Ctrl+C)

The server handles `SIGINT` and `SIGTERM` for clean shutdown.

## Support

For issues:
- Check server logs
- Test health endpoint
- Verify token authentication
- Check ngrok dashboard for traffic
- Review rate limits

Remember: Security first! Keep tokens secret, rotate regularly, and use read-only mode when possible.
