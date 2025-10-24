# Connecting Claude Desktop to Google Tasks MCP

This guide explains how to integrate the Google Tasks MCP server with Claude Desktop.

## Prerequisites

1. Claude Desktop installed on your Mac
2. Google OAuth credentials configured in `.env`
3. Project built with `npm run build`
4. Valid `token.json` file (generated via `npm run setup:auth`)

## Configuration Steps

### 1. Locate Claude Desktop Config

The configuration file is located at:
```text
~/Library/Application Support/Claude/claude_desktop_config.json
```

### 2. Add MCP Server Configuration

Edit `claude_desktop_config.json` and add the Google Tasks server:

```json
{
  "mcpServers": {
    "google-tasks": {
      "command": "node",
      "args": [
        "<PROJECT_ROOT>/dist/index.js"
      ]
    }
  }
}
```

**Important:** Replace `<PROJECT_ROOT>` with your actual project directory path. Use absolute paths, not relative paths.

**Example:**
```json
"/Users/yourusername/path/to/MCPGoogleTasks/dist/index.js"
```

To get your project root path, run this in your project directory:
```bash
pwd
# Output: /Users/yourusername/path/to/MCPGoogleTasks
# Use: /Users/yourusername/path/to/MCPGoogleTasks/dist/index.js
```

### 3. Configure Environment Variables

Your `.env` file must be in the project root with these required variables:

```bash
# Google OAuth credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost

# Token storage path (use absolute path)
TOKEN_PATH=<PROJECT_ROOT>/token.json
```

**Critical:** Use an absolute path for `TOKEN_PATH`, not a relative path like `./token.json`. The server runs from Claude Desktop's working directory, so relative paths won't resolve correctly.

### 4. Generate OAuth Token

Before connecting Claude Desktop, you must authenticate with Google:

```bash
npm run setup:auth
```

This will:
1. Display an authorization URL
2. Open your browser for Google authentication
3. Save the OAuth token to `token.json`

Verify the token exists:
```bash
ls -la token.json
```

### 5. Build the Project

Ensure TypeScript is compiled to JavaScript:

```bash
npm run build
```

Verify the output exists:
```bash
ls -la dist/index.js
```

### 6. Restart Claude Desktop

Completely quit and restart Claude Desktop for the configuration to take effect:

1. Quit Claude Desktop (Cmd+Q)
2. Reopen Claude Desktop
3. Look for the hammer icon (🔨) in the input area

## Verification

### Check MCP Connection

1. Open Claude Desktop
2. Look for the hammer icon (🔨) near the message input
3. Click the hammer to see available tools
4. You should see Google Tasks tools:
   - `list_task_lists`
   - `list_tasks`
   - `create_task_list`
   - `create_task`
   - `update_task`
   - `delete_task`
   - `get_auth_url`

### Test the Connection

Ask Claude:

> Can you list my Google Tasks task lists?

Claude should use the `list_task_lists` tool and return your task lists.

## Troubleshooting

### Error: "Tool execution failed"

**Symptom:** Generic tool execution error in Claude Desktop

**Common causes:**

1. **Token file not found**
   - Check `TOKEN_PATH` uses absolute path
   - Verify `token.json` exists at that path
   - Run `npm run setup:auth` to regenerate token

2. **Environment variables not loaded**
   - Ensure `.env` is in project root
   - Verify all required variables are set
   - Check for typos in variable names

3. **Build outdated**
   - Run `npm run build` to recompile
   - Verify `dist/index.js` exists and is recent

4. **Invalid OAuth credentials**
   - Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - Ensure credentials match Google Cloud Console

### Error: "No valid token found"

**Debug steps:**

1. Check if token file exists:
   ```bash
   cat <PROJECT_ROOT>/token.json
   ```

2. Verify token path in `.env`:
   ```bash
   grep TOKEN_PATH .env
   ```

3. Regenerate token:
   ```bash
   npm run setup:auth
   ```

4. Check token file permissions:
   ```bash
   ls -la token.json
   # Should show: -rw------- (600 permissions)
   ```

### Error: "Missing required Google OAuth credentials"

**Fix:**

1. Ensure `.env` exists in project root
2. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
3. Check for extra spaces or quotes around values
4. Restart Claude Desktop after fixing

### Hammer icon not appearing

**Possible causes:**

1. Configuration file syntax error
   - Validate JSON with: `cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python -m json.tool`
   - Fix any JSON syntax errors

2. Incorrect path in config
   - Verify absolute path points to `dist/index.js`
   - Check file exists at that path

3. Claude Desktop not restarted
   - Completely quit (Cmd+Q) and reopen

### Token expires or becomes invalid

The server automatically refreshes tokens when they expire. If you see authentication errors:

1. Token may have been revoked in Google account settings
2. Regenerate token with `npm run setup:auth`
3. Check token file wasn't corrupted (should be valid JSON)

## Architecture Notes

### Transport: stdio (Standard Input/Output)

Claude Desktop uses stdio transport to communicate with MCP servers:
- Commands are sent via stdin
- Responses are received via stdout
- This is different from the HTTP/SSE transport used for OpenAI integration

### Path Resolution

The server uses ES modules with proper path resolution:

```typescript
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });
```

This ensures `.env` and `token.json` are found regardless of working directory.

### Security

Claude Desktop integration:
- Runs locally on your machine
- No bearer token required (unlike HTTP mode)
- Token file has secure 0o600 permissions
- No network exposure

## Available Tools

### Read-only Tools

- `list_task_lists` - List all task lists
- `list_tasks` - List tasks in a specific list
- `get_auth_url` - Get OAuth authorization URL

### Write Tools

- `create_task_list` - Create a new task list
- `create_task` - Create a new task
- `update_task` - Update task (partial update with PATCH)
- `delete_task` - Delete a task

## Example Usage

### List all task lists

> Show me all my Google Tasks lists

### Create a task

> Create a task in my "Work" list called "Review pull requests" with a due date of tomorrow

### Update a task

> Mark the task "Review pull requests" as completed

### View tasks with Hebrew/RTL support

> Show me all tasks in my Hebrew task list

The server automatically formats RTL text correctly for terminal display.

## Logs and Debugging

View server logs:
```bash
# macOS: View Claude logs
~/Library/Logs/Claude/
```

The server logs to stderr, which Claude Desktop captures. Look for:
- `[DEBUG]` messages showing token path resolution
- `[Auth]` messages about token refresh
- Error messages with stack traces

Enable verbose logging by checking Claude Desktop logs after an operation.

## Updating the Server

After making code changes:

1. Rebuild the project:
   ```bash
   npm run build
   ```

2. Restart Claude Desktop:
   - Quit completely (Cmd+Q)
   - Reopen

No need to modify `claude_desktop_config.json` unless paths change.

## Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Google Tasks API](https://developers.google.com/tasks)
- Project README: `README.md`
- HTTP setup guide: `QUICKSTART_HTTP.md`
- ngrok setup: `NGROK_SETUP.md`
