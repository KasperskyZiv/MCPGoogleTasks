# MCP Google Tasks

A Model Context Protocol (MCP) server that provides integration with Google Tasks API, allowing AI assistants to manage tasks and task lists through OAuth 2.0 authenticated access.

## Features

- **OAuth 2.0 Authentication**: Secure Google account authentication
- **Task Management**: Create, read, update, and delete tasks
- **Task List Management**: Manage multiple task lists
- **MCP Protocol**: Standard MCP server implementation for AI assistant integration

## Prerequisites

- Node.js 18 or higher
- A Google Cloud Project with Tasks API enabled
- OAuth 2.0 credentials (Client ID and Client Secret)

## Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Tasks API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Tasks API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop app" as application type
   - Download the credentials JSON or note the Client ID and Client Secret

### 2. Project Installation

```bash
# Clone the repository
git clone <repository-url>
cd MCPGoogleTasks

# Install dependencies
npm install

# Build the project
npm run build
```

### 3. Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Google OAuth credentials:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
TOKEN_PATH=./token.json
```

### 4. Authentication

Before using the MCP server, you need to authenticate:

1. The server provides a `get_auth_url` tool that returns an OAuth URL
2. Visit the URL in your browser and authorize the application
3. After authorization, you'll receive a code
4. Use the code to complete authentication (this will save a token.json file)

Note: The first time you use the server, you'll need to go through this OAuth flow.

## Available MCP Tools

The server provides the following tools:

### Authentication
- `get_auth_url` - Get the OAuth 2.0 authorization URL

### Task Lists
- `list_task_lists` - List all task lists
- `create_task_list` - Create a new task list
  - Parameters: `title`

### Tasks
- `list_tasks` - List tasks in a task list
  - Parameters: `taskListId`, `showCompleted` (optional)
- `create_task` - Create a new task
  - Parameters: `taskListId`, `title`, `notes` (optional), `due` (optional)
- `update_task` - Update an existing task
  - Parameters: `taskListId`, `taskId`, `title` (optional), `notes` (optional), `status` (optional), `due` (optional)
- `delete_task` - Delete a task
  - Parameters: `taskListId`, `taskId`

## Development

```bash
# Build TypeScript
npm run build

# Watch mode (rebuild on changes)
npm run watch

# Run in development mode
npm run dev
```

## Testing

The project includes comprehensive unit tests using Jest with mocks (no real credentials needed):

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

**Test Coverage:**
- ✅ **utils.ts** - RTL text formatting utilities
- ✅ **auth.ts** - OAuth authentication manager (mocked)
- ✅ **tasks-client.ts** - Google Tasks API client (mocked)

All tests use mocks and don't require real Google credentials or tokens.

## Usage Options

### Option 1: Stdio Transport (Local MCP Clients)

For local MCP clients like Claude Desktop:

```json
{
  "mcpServers": {
    "google-tasks": {
      "command": "node",
      "args": ["/path/to/MCPGoogleTasks/dist/index.js"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id",
        "GOOGLE_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

### Option 2: HTTP/SSE Transport (OpenAI Integration via ngrok)

For OpenAI ChatGPT or Custom GPTs:

1. **Start the HTTP server:**
   ```bash
   npm run dev:http
   ```

2. **Expose via ngrok:**
   ```bash
   ngrok http 3000 --domain=your-domain.ngrok-free.app
   ```

3. **Configure OpenAI:**
   - Endpoint: `https://your-domain.ngrok-free.app/mcp/sse`
   - Authentication: Bearer Token
   - Token: Your `MCP_TOKEN` from `.env`

**See [NGROK_SETUP.md](./NGROK_SETUP.md) for complete security setup guide.**

### Security Features (HTTP Mode)

- ✅ **Bearer Token Authentication** - Secure token-based access
- ✅ **Read-Only Mode by Default** - Only list/get operations (safer)
- ✅ **Rate Limiting** - 100 requests per 15 minutes
- ✅ **CORS Restrictions** - Limited to your ngrok domain
- ✅ **Security Headers** - Helmet.js protection
- ✅ **HTTPS via ngrok** - Encrypted traffic
- ✅ **Local Binding** - Not exposed to LAN

## Architecture

- **src/index.ts** - MCP server (stdio transport) for local clients
- **src/http-server.ts** - MCP server (HTTP/SSE transport) for OpenAI
- **src/auth.ts** - OAuth 2.0 authentication management
- **src/tasks-client.ts** - Google Tasks API client wrapper
- **src/utils.ts** - RTL text formatting utilities
- **src/scripts/** - Helper scripts for auth and viewing tasks

## Security Notes

- Never commit your `.env` file or `token.json` to version control
- Keep your OAuth credentials secure
- The `token.json` file contains your access and refresh tokens - protect it carefully
- Tokens are stored locally and refreshed automatically when needed

## License

MIT
