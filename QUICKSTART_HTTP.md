# Quick Start: HTTP Server for OpenAI

Get your MCP Google Tasks server running with OpenAI in 5 minutes.

## 1. Generate Security Token

```bash
openssl rand -hex 32
```

Copy the output token.

## 2. Update .env File

Add to your `.env` file:

```bash
# Required: Your secure token (paste from step 1)
MCP_TOKEN=paste-your-generated-token-here

# Optional: Your ngrok domain (you'll get this in step 4)
NGROK_DOMAIN=your-domain.ngrok-free.app

# Optional: Port (default 3000)
PORT=3000

# Security: true = read-only mode (recommended)
READ_ONLY=true
```

## 3. Start HTTP Server

```bash
npm run dev:http
```

You should see:
```
🚀 Google Tasks MCP HTTP Server
📍 Server running on: http://127.0.0.1:3000
🔒 Mode: READ-ONLY ✓
```

## 4. Start ngrok (in new terminal)

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

**If you have a static domain:**
```bash
ngrok http 3000 --domain=your-domain.ngrok-free.app
```

## 5. Update NGROK_DOMAIN (Optional but Recommended)

Add to `.env`:
```bash
NGROK_DOMAIN=abc123.ngrok-free.app
```

Restart the HTTP server (Ctrl+C and run `npm run dev:http` again).

## 6. Test Connection

```bash
# Test health endpoint
curl https://abc123.ngrok-free.app/health

# Test with authentication
curl https://abc123.ngrok-free.app/mcp/sse \
  -H "Authorization: Bearer your-mcp-token-here"
```

## 7. Configure OpenAI

### Custom GPT:
1. Go to https://chat.openai.com/gpts/editor
2. Click "Configure" → "Add Action"
3. Paste this URL: `https://abc123.ngrok-free.app/mcp/sse`
4. Set Authentication: "Bearer"
5. Token: Your `MCP_TOKEN` value
6. Save

### ChatGPT Connector:
1. Settings → Integrations
2. Add Custom Connector
3. URL: `https://abc123.ngrok-free.app/mcp/sse`
4. Auth: Bearer Token
5. Token: Your `MCP_TOKEN`

## 8. Test in ChatGPT

Try asking:
- "List my Google Tasks task lists"
- "Show me tasks from my main task list"

## Available Tools (Read-Only Mode)

✅ list_task_lists - See all your task lists
✅ list_tasks - View tasks in a specific list
✅ get_auth_url - Get OAuth URL (for setup)

## Enable Write Access

To allow creating/updating/deleting tasks:

1. Update `.env`:
   ```bash
   READ_ONLY=false
   ```

2. Restart server

⚠️ **Warning**: This allows ChatGPT to modify your tasks!

## Troubleshooting

**"Unauthorized" error:**
- Check `MCP_TOKEN` matches in `.env` and OpenAI
- No extra spaces or quotes around token

**CORS error:**
- Update `NGROK_DOMAIN` in `.env`
- Restart HTTP server

**ngrok connection refused:**
- Verify HTTP server is running
- Check port matches (default 3000)

**Rate limit error:**
- Wait 15 minutes, or
- Increase `RATE_LIMIT_MAX` in `.env`

## Security Checklist

✅ Generated secure token (32+ characters)
✅ Token stored in `.env` only
✅ `.env` in `.gitignore`
✅ READ_ONLY=true (unless you need writes)
✅ NGROK_DOMAIN set (for CORS protection)
✅ Monitor server logs for suspicious activity

## Next Steps

- Read [NGROK_SETUP.md](./NGROK_SETUP.md) for advanced security
- Set up token rotation schedule
- Configure rate limits for your usage
- Consider static ngrok domain (paid feature)

## Shutting Down

1. Stop ngrok: `Ctrl+C` in ngrok terminal
2. Stop server: `Ctrl+C` in server terminal

Your server is not exposed when stopped.
