#!/usr/bin/env node
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleAuthManager } from './auth.js';
import { GoogleTasksClient } from './tasks-client.js';
import { TOOL_DEFINITIONS, READ_ONLY_TOOLS, MUTATING_TOOLS } from './mcp/tool-definitions.js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: join(__dirname, '..', '.env') });

const PORT = parseInt(process.env.PORT || '3000');
const MCP_TOKEN = process.env.MCP_TOKEN;
const NGROK_DOMAIN = process.env.NGROK_DOMAIN; // e.g., "your-domain.ngrok-free.app"
const READ_ONLY = process.env.READ_ONLY !== 'false'; // Default to true (read-only)
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100');
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes

// Validate required environment variables
if (!MCP_TOKEN) {
  console.error('❌ ERROR: MCP_TOKEN environment variable is required for HTTP mode');
  console.error('Please set MCP_TOKEN in your .env file');
  process.exit(1);
}

if (MCP_TOKEN.length < 32) {
  console.error('❌ ERROR: MCP_TOKEN must be at least 32 characters for security');
  console.error(`Current length: ${MCP_TOKEN.length} characters`);
  console.error('Generate a secure token with: openssl rand -hex 32');
  process.exit(1);
}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ ERROR: Missing required Google OAuth credentials');
  if (!CLIENT_ID) console.error('  - GOOGLE_CLIENT_ID is not set');
  if (!CLIENT_SECRET) console.error('  - GOOGLE_CLIENT_SECRET is not set');
  console.error('\nPlease set these in your .env file');
  process.exit(1);
}

const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost';
const TOKEN_PATH = process.env.TOKEN_PATH
  ? resolve(process.env.TOKEN_PATH)
  : resolve(process.cwd(), 'token.json');

/**
 * MCP Server for Google Tasks over HTTP
 */
class GoogleTasksHTTPServer {
  private server: Server;
  private authManager: GoogleAuthManager;
  private tasksClient: GoogleTasksClient | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'google-tasks-mcp-http',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.authManager = new GoogleAuthManager(
      CLIENT_ID as string,
      CLIENT_SECRET as string,
      REDIRECT_URI,
      TOKEN_PATH
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private async initializeClient(): Promise<GoogleTasksClient> {
    if (!this.tasksClient) {
      const authClient = await this.authManager.getAuthClient();
      this.tasksClient = new GoogleTasksClient(authClient);
    }
    return this.tasksClient;
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };
  }

  private getAvailableTools() {
    // Filter tools based on READ_ONLY mode
    if (READ_ONLY) {
      return TOOL_DEFINITIONS.filter(tool => READ_ONLY_TOOLS.has(tool.name));
    }
    return TOOL_DEFINITIONS;
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getAvailableTools(),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args = {} } = request.params;

        // Check if tool is allowed in read-only mode
        if (READ_ONLY && MUTATING_TOOLS.has(name)) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Tool '${name}' is not available in read-only mode. Set READ_ONLY=false to enable write operations.`
          );
        }

        // Special case for auth URL (doesn't require authenticated client)
        if (name === 'get_auth_url') {
          const authUrl = this.authManager.getAuthUrl();
          return {
            content: [
              {
                type: 'text',
                text: `Please visit this URL to authorize the application:\n\n${authUrl}`,
              },
            ],
          };
        }

        // Initialize client for all other operations
        const client = await this.initializeClient();

        switch (name) {
          case 'list_task_lists': {
            const taskLists = await client.listTaskLists();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(taskLists, null, 2),
                },
              ],
            };
          }

          case 'list_tasks': {
            const tasks = await client.listTasks(args.taskListId as string, {
              showCompleted: args.showCompleted as boolean,
            });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(tasks, null, 2),
                },
              ],
            };
          }

          case 'create_task_list': {
            const taskList = await client.createTaskList(args.title as string);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(taskList, null, 2),
                },
              ],
            };
          }

          case 'create_task': {
            const task = await client.createTask(args.taskListId as string, {
              title: args.title as string,
              notes: args.notes as string | undefined,
              due: args.due as string | undefined,
            });
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(task, null, 2),
                },
              ],
            };
          }

          case 'update_task': {
            const task = await client.updateTask(
              args.taskListId as string,
              args.taskId as string,
              {
                title: args.title as string | undefined,
                notes: args.notes as string | undefined,
                status: args.status as 'needsAction' | 'completed' | undefined,
                due: args.due as string | undefined,
              }
            );
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(task, null, 2),
                },
              ],
            };
          }

          case 'delete_task': {
            await client.deleteTask(
              args.taskListId as string,
              args.taskId as string
            );
            return {
              content: [
                {
                  type: 'text',
                  text: 'Task deleted successfully',
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  getMCPServer(): Server {
    return this.server;
  }
}

// Create Express app
const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // If NGROK_DOMAIN is set, only allow that domain
    if (NGROK_DOMAIN) {
      const allowedOrigins = [
        `https://${NGROK_DOMAIN}`,
        `http://${NGROK_DOMAIN}`,
      ];

      // Exact match or match with path (but not subdomain)
      const isAllowed = allowedOrigins.some(allowed => {
        return origin === allowed || origin.startsWith(allowed + '/');
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // In development without ngrok, allow all origins
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/mcp', limiter);

// Body parser
app.use(express.json({ limit: '1mb' }));

// Bearer token authentication middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');

  if (!token || token !== MCP_TOKEN) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing bearer token',
    });
  }

  next();
};

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    readOnly: READ_ONLY,
    timestamp: new Date().toISOString(),
  });
});

// MCP endpoint with authentication
const mcpServer = new GoogleTasksHTTPServer();
app.use('/mcp', authMiddleware);

// SSE transport for MCP
app.get('/mcp/sse', async (req, res) => {
  console.log('New SSE connection established');

  const transport = new SSEServerTransport('/mcp/message', res);
  await mcpServer.getMCPServer().connect(transport);

  req.on('close', () => {
    console.log('SSE connection closed');
  });
});

app.post('/mcp/message', async (req, res) => {
  // Message handling is done by the SSE transport
  res.status(200).end();
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 Google Tasks MCP HTTP Server`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Server running on: http://127.0.0.1:${PORT}`);
  console.log(`🔒 Mode: ${READ_ONLY ? 'READ-ONLY ✓' : 'FULL ACCESS ⚠️'}`);
  console.log(`🛡️  Rate limit: ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW_MS / 60000} minutes`);
  if (NGROK_DOMAIN) {
    console.log(`🌐 CORS: Restricted to ${NGROK_DOMAIN}`);
  } else {
    console.log(`🌐 CORS: Open (development mode)`);
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`ℹ️  Health check: http://127.0.0.1:${PORT}/health`);
  console.log(`ℹ️  MCP endpoint: http://127.0.0.1:${PORT}/mcp/sse\n`);

  if (!NGROK_DOMAIN) {
    console.log(`⚠️  WARNING: NGROK_DOMAIN not set - CORS is unrestricted`);
  }

  console.log(`\n📖 Ready to accept connections with bearer token authentication\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down gracefully...');
  process.exit(0);
});
