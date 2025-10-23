#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleAuthManager } from './auth.js';
import { GoogleTasksClient } from './tasks-client.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost';
const TOKEN_PATH = process.env.TOKEN_PATH || './token.json';

/**
 * MCP Server for Google Tasks
 */
class GoogleTasksMCPServer {
  private server: Server;
  private authManager: GoogleAuthManager;
  private tasksClient: GoogleTasksClient | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'google-tasks-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.authManager = new GoogleAuthManager(
      CLIENT_ID,
      CLIENT_SECRET,
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

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_task_lists',
          description: 'List all Google Tasks task lists',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'create_task_list',
          description: 'Create a new task list',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Title of the new task list',
              },
            },
            required: ['title'],
          },
        },
        {
          name: 'list_tasks',
          description: 'List tasks in a specific task list',
          inputSchema: {
            type: 'object',
            properties: {
              taskListId: {
                type: 'string',
                description: 'ID of the task list',
              },
              showCompleted: {
                type: 'boolean',
                description: 'Include completed tasks',
                default: false,
              },
            },
            required: ['taskListId'],
          },
        },
        {
          name: 'create_task',
          description: 'Create a new task in a task list',
          inputSchema: {
            type: 'object',
            properties: {
              taskListId: {
                type: 'string',
                description: 'ID of the task list',
              },
              title: {
                type: 'string',
                description: 'Title of the task',
              },
              notes: {
                type: 'string',
                description: 'Notes/description for the task',
              },
              due: {
                type: 'string',
                description: 'Due date in RFC 3339 format (e.g., 2024-12-31T23:59:59Z)',
              },
            },
            required: ['taskListId', 'title'],
          },
        },
        {
          name: 'update_task',
          description: 'Update an existing task',
          inputSchema: {
            type: 'object',
            properties: {
              taskListId: {
                type: 'string',
                description: 'ID of the task list',
              },
              taskId: {
                type: 'string',
                description: 'ID of the task to update',
              },
              title: {
                type: 'string',
                description: 'New title for the task',
              },
              notes: {
                type: 'string',
                description: 'New notes for the task',
              },
              status: {
                type: 'string',
                enum: ['needsAction', 'completed'],
                description: 'Task status',
              },
              due: {
                type: 'string',
                description: 'Due date in RFC 3339 format',
              },
            },
            required: ['taskListId', 'taskId'],
          },
        },
        {
          name: 'delete_task',
          description: 'Delete a task',
          inputSchema: {
            type: 'object',
            properties: {
              taskListId: {
                type: 'string',
                description: 'ID of the task list',
              },
              taskId: {
                type: 'string',
                description: 'ID of the task to delete',
              },
            },
            required: ['taskListId', 'taskId'],
          },
        },
        {
          name: 'get_auth_url',
          description: 'Get OAuth2 authorization URL for Google Tasks authentication',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args = {} } = request.params;

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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google Tasks MCP server running on stdio');
  }
}

const server = new GoogleTasksMCPServer();
server.run().catch(console.error);
