#!/usr/bin/env node
import { GoogleAuthManager } from '../auth';
import { GoogleTasksClient } from '../tasks-client';
import { formatForTerminal } from '../utils';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost';
const TOKEN_PATH = process.env.TOKEN_PATH || './token.json';

async function viewTasks() {
  try {
    // Initialize auth manager
    const authManager = new GoogleAuthManager(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI,
      TOKEN_PATH
    );

    // Get authenticated client
    const authClient = await authManager.getAuthClient();
    const tasksClient = new GoogleTasksClient(authClient);

    // Get task list ID from command line or use first list
    const args = process.argv.slice(2);
    let taskListId = args[0];

    if (!taskListId) {
      console.log('📋 Fetching task lists...\n');
      const taskLists = await tasksClient.listTaskLists();

      if (taskLists.length === 0) {
        console.log('No task lists found.');
        process.exit(0);
      }

      console.log('Available task lists:');
      taskLists.forEach((list, index) => {
        console.log(`${index + 1}. ${formatForTerminal(list.title)} (${list.id})`);
      });

      taskListId = taskLists[0].id!;
      console.log(`\nShowing tasks from: ${formatForTerminal(taskLists[0].title)}\n`);
    }

    // List tasks
    const tasks = await tasksClient.listTasks(taskListId, {
      showCompleted: true,
      showHidden: true,
    });

    if (tasks.length === 0) {
      console.log('No tasks found in this list.');
      process.exit(0);
    }

    console.log(`Found ${tasks.length} task(s):\n`);

    tasks.forEach((task, index) => {
      const status = task.status === 'completed' ? '✅' : '⬜';
      console.log(`${status} ${index + 1}. ${formatForTerminal(task.title)}`);

      if (task.notes) {
        console.log(`   Notes: ${formatForTerminal(task.notes)}`);
      }

      if (task.due) {
        console.log(`   Due: ${task.due}`);
      }

      console.log(`   ID: ${task.id}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Updated: ${task.updated}`);
      console.log('');
    });

    console.log(`\nTo view tasks from a specific list, run:`);
    console.log(`npm run view:tasks <task-list-id>`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

viewTasks();
