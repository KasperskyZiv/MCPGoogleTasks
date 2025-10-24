import { google, tasks_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * Google Tasks API client wrapper
 */
export class GoogleTasksClient {
  private tasksApi: tasks_v1.Tasks;

  constructor(authClient: OAuth2Client) {
    this.tasksApi = google.tasks({ version: 'v1', auth: authClient });
  }

  /**
   * List all task lists
   */
  async listTaskLists(): Promise<tasks_v1.Schema$TaskList[]> {
    const response = await this.tasksApi.tasklists.list({
      maxResults: 100,
    });
    return response.data.items || [];
  }

  /**
   * Get a specific task list
   */
  async getTaskList(taskListId: string): Promise<tasks_v1.Schema$TaskList> {
    const response = await this.tasksApi.tasklists.get({
      tasklist: taskListId,
    });
    return response.data;
  }

  /**
   * Create a new task list
   */
  async createTaskList(title: string): Promise<tasks_v1.Schema$TaskList> {
    const response = await this.tasksApi.tasklists.insert({
      requestBody: {
        title,
      },
    });
    return response.data;
  }

  /**
   * Update a task list
   */
  async updateTaskList(
    taskListId: string,
    title: string
  ): Promise<tasks_v1.Schema$TaskList> {
    const response = await this.tasksApi.tasklists.update({
      tasklist: taskListId,
      requestBody: {
        id: taskListId,
        title,
      },
    });
    return response.data;
  }

  /**
   * Delete a task list
   */
  async deleteTaskList(taskListId: string): Promise<void> {
    await this.tasksApi.tasklists.delete({
      tasklist: taskListId,
    });
  }

  /**
   * List tasks in a task list
   */
  async listTasks(
    taskListId: string,
    options?: {
      showCompleted?: boolean;
      showHidden?: boolean;
      maxResults?: number;
    }
  ): Promise<tasks_v1.Schema$Task[]> {
    const response = await this.tasksApi.tasks.list({
      tasklist: taskListId,
      showCompleted: options?.showCompleted ?? false,
      showHidden: options?.showHidden ?? false,
      maxResults: options?.maxResults ?? 100,
    });
    return response.data.items || [];
  }

  /**
   * Get a specific task
   */
  async getTask(taskListId: string, taskId: string): Promise<tasks_v1.Schema$Task> {
    const response = await this.tasksApi.tasks.get({
      tasklist: taskListId,
      task: taskId,
    });
    return response.data;
  }

  /**
   * Create a new task
   */
  async createTask(
    taskListId: string,
    task: {
      title: string;
      notes?: string;
      due?: string;
      parent?: string;
    }
  ): Promise<tasks_v1.Schema$Task> {
    const response = await this.tasksApi.tasks.insert({
      tasklist: taskListId,
      requestBody: {
        title: task.title,
        notes: task.notes,
        due: task.due,
      },
      parent: task.parent,
    });
    return response.data;
  }

  /**
   * Update a task (partial update - only modifies specified fields)
   */
  async updateTask(
    taskListId: string,
    taskId: string,
    updates: {
      title?: string;
      notes?: string;
      due?: string;
      status?: 'needsAction' | 'completed';
    }
  ): Promise<tasks_v1.Schema$Task> {
    // Build requestBody with only defined fields to avoid clearing unspecified ones
    const requestBody: any = { id: taskId };
    if (updates.title !== undefined) requestBody.title = updates.title;
    if (updates.notes !== undefined) requestBody.notes = updates.notes;
    if (updates.due !== undefined) requestBody.due = updates.due;
    if (updates.status !== undefined) requestBody.status = updates.status;

    // Use patch for partial updates
    const response = await this.tasksApi.tasks.patch({
      tasklist: taskListId,
      task: taskId,
      requestBody,
    });
    return response.data;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskListId: string, taskId: string): Promise<void> {
    await this.tasksApi.tasks.delete({
      tasklist: taskListId,
      task: taskId,
    });
  }

  /**
   * Move a task to a different parent or position
   */
  async moveTask(
    taskListId: string,
    taskId: string,
    options?: {
      parent?: string;
      previous?: string;
    }
  ): Promise<tasks_v1.Schema$Task> {
    const response = await this.tasksApi.tasks.move({
      tasklist: taskListId,
      task: taskId,
      parent: options?.parent,
      previous: options?.previous,
    });
    return response.data;
  }

  /**
   * Clear completed tasks from a task list
   */
  async clearCompletedTasks(taskListId: string): Promise<void> {
    await this.tasksApi.tasks.clear({
      tasklist: taskListId,
    });
  }
}
