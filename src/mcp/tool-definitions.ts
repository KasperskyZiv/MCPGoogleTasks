/**
 * MCP Tool Definitions for Google Tasks
 * Shared between stdio and HTTP transports
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * All available MCP tools for Google Tasks
 */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
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
];

/**
 * Read-only tools that are always allowed
 */
export const READ_ONLY_TOOLS = new Set([
  'list_task_lists',
  'list_tasks',
  'get_auth_url',
]);

/**
 * Mutating tools that require READ_ONLY=false
 */
export const MUTATING_TOOLS = new Set([
  'create_task_list',
  'create_task',
  'update_task',
  'delete_task',
]);
