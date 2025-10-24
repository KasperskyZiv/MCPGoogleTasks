import { GoogleTasksClient } from '../tasks-client';
import { OAuth2Client } from 'google-auth-library';
import { tasks_v1 } from 'googleapis';

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    tasks: jest.fn(),
  },
  tasks_v1: {},
}));

describe('GoogleTasksClient', () => {
  let mockAuthClient: OAuth2Client;
  let mockTasksApi: any;
  let tasksClient: GoogleTasksClient;

  beforeEach(() => {
    mockAuthClient = {} as OAuth2Client;

    // Create mock tasks API
    mockTasksApi = {
      tasklists: {
        list: jest.fn(),
        get: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      tasks: {
        list: jest.fn(),
        get: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        move: jest.fn(),
        clear: jest.fn(),
      },
    };

    // Mock google.tasks to return our mock API
    const { google } = require('googleapis');
    google.tasks.mockReturnValue(mockTasksApi);

    tasksClient = new GoogleTasksClient(mockAuthClient);
    jest.clearAllMocks();
  });

  describe('listTaskLists', () => {
    it('should return list of task lists', async () => {
      const mockTaskLists = [
        { id: '1', title: 'My Tasks', updated: '2024-01-01T00:00:00.000Z' },
        { id: '2', title: 'Work Tasks', updated: '2024-01-02T00:00:00.000Z' },
      ];

      mockTasksApi.tasklists.list.mockResolvedValue({
        data: { items: mockTaskLists },
      });

      const result = await tasksClient.listTaskLists();

      expect(result).toEqual(mockTaskLists);
      expect(mockTasksApi.tasklists.list).toHaveBeenCalledWith({
        maxResults: 100,
      });
    });

    it('should return empty array when no task lists', async () => {
      mockTasksApi.tasklists.list.mockResolvedValue({
        data: {},
      });

      const result = await tasksClient.listTaskLists();

      expect(result).toEqual([]);
    });
  });

  describe('createTaskList', () => {
    it('should create a new task list', async () => {
      const mockTaskList = {
        id: '123',
        title: 'New Task List',
        updated: '2024-01-01T00:00:00.000Z',
      };

      mockTasksApi.tasklists.insert.mockResolvedValue({
        data: mockTaskList,
      });

      const result = await tasksClient.createTaskList('New Task List');

      expect(result).toEqual(mockTaskList);
      expect(mockTasksApi.tasklists.insert).toHaveBeenCalledWith({
        requestBody: {
          title: 'New Task List',
        },
      });
    });
  });

  describe('listTasks', () => {
    it('should return list of tasks', async () => {
      const mockTasks = [
        {
          id: 'task1',
          title: 'Buy groceries',
          status: 'needsAction',
          updated: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'task2',
          title: 'Call dentist',
          status: 'completed',
          updated: '2024-01-02T00:00:00.000Z',
        },
      ];

      mockTasksApi.tasks.list.mockResolvedValue({
        data: { items: mockTasks },
      });

      const result = await tasksClient.listTasks('tasklist123');

      expect(result).toEqual(mockTasks);
      expect(mockTasksApi.tasks.list).toHaveBeenCalledWith({
        tasklist: 'tasklist123',
        showCompleted: false,
        showHidden: false,
        maxResults: 100,
      });
    });

    it('should include completed tasks when specified', async () => {
      mockTasksApi.tasks.list.mockResolvedValue({
        data: { items: [] },
      });

      await tasksClient.listTasks('tasklist123', { showCompleted: true });

      expect(mockTasksApi.tasks.list).toHaveBeenCalledWith({
        tasklist: 'tasklist123',
        showCompleted: true,
        showHidden: false,
        maxResults: 100,
      });
    });
  });

  describe('createTask', () => {
    it('should create a new task', async () => {
      const mockTask = {
        id: 'task123',
        title: 'New Task',
        notes: 'Task description',
        status: 'needsAction',
      };

      mockTasksApi.tasks.insert.mockResolvedValue({
        data: mockTask,
      });

      const result = await tasksClient.createTask('tasklist123', {
        title: 'New Task',
        notes: 'Task description',
      });

      expect(result).toEqual(mockTask);
      expect(mockTasksApi.tasks.insert).toHaveBeenCalledWith({
        tasklist: 'tasklist123',
        requestBody: {
          title: 'New Task',
          notes: 'Task description',
          due: undefined,
        },
        parent: undefined,
      });
    });

    it('should create task with due date', async () => {
      const dueDate = '2024-12-31T23:59:59Z';
      mockTasksApi.tasks.insert.mockResolvedValue({
        data: { id: 'task123', title: 'Task with due date' },
      });

      await tasksClient.createTask('tasklist123', {
        title: 'Task with due date',
        due: dueDate,
      });

      expect(mockTasksApi.tasks.insert).toHaveBeenCalledWith({
        tasklist: 'tasklist123',
        requestBody: {
          title: 'Task with due date',
          notes: undefined,
          due: dueDate,
        },
        parent: undefined,
      });
    });
  });

  describe('updateTask', () => {
    it('should update a task', async () => {
      const mockUpdatedTask = {
        id: 'task123',
        title: 'Updated Task',
        status: 'completed',
      };

      mockTasksApi.tasks.update.mockResolvedValue({
        data: mockUpdatedTask,
      });

      const result = await tasksClient.updateTask('tasklist123', 'task123', {
        title: 'Updated Task',
        status: 'completed',
      });

      expect(result).toEqual(mockUpdatedTask);
      expect(mockTasksApi.tasks.update).toHaveBeenCalledWith({
        tasklist: 'tasklist123',
        task: 'task123',
        requestBody: {
          id: 'task123',
          title: 'Updated Task',
          status: 'completed',
        },
      });
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      mockTasksApi.tasks.delete.mockResolvedValue({});

      await tasksClient.deleteTask('tasklist123', 'task123');

      expect(mockTasksApi.tasks.delete).toHaveBeenCalledWith({
        tasklist: 'tasklist123',
        task: 'task123',
      });
    });
  });

  describe('moveTask', () => {
    it('should move a task', async () => {
      const mockMovedTask = {
        id: 'task123',
        title: 'Moved Task',
      };

      mockTasksApi.tasks.move.mockResolvedValue({
        data: mockMovedTask,
      });

      const result = await tasksClient.moveTask('tasklist123', 'task123', {
        parent: 'parent123',
      });

      expect(result).toEqual(mockMovedTask);
      expect(mockTasksApi.tasks.move).toHaveBeenCalledWith({
        tasklist: 'tasklist123',
        task: 'task123',
        parent: 'parent123',
        previous: undefined,
      });
    });
  });

  describe('clearCompletedTasks', () => {
    it('should clear completed tasks from a list', async () => {
      mockTasksApi.tasks.clear.mockResolvedValue({});

      await tasksClient.clearCompletedTasks('tasklist123');

      expect(mockTasksApi.tasks.clear).toHaveBeenCalledWith({
        tasklist: 'tasklist123',
      });
    });
  });
});
