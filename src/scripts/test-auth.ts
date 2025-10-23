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

async function testAuth() {
  try {
    console.log('🔐 Testing Google Tasks API authentication...\n');

    // Initialize auth manager
    const authManager = new GoogleAuthManager(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI,
      TOKEN_PATH
    );

    // Check if we have a valid token
    const hasToken = await authManager.hasValidToken();
    if (!hasToken) {
      console.error('❌ No valid token found!');
      console.log('\nTo authenticate:');
      console.log('1. Get the auth URL by running the MCP server and calling get_auth_url tool');
      console.log('2. Or manually get it by running this in the console:');
      console.log(`   const authUrl = authManager.getAuthUrl();`);
      console.log('3. Visit the URL, authorize, and save the token\n');
      process.exit(1);
    }

    console.log('✅ Token found, authenticating...');

    // Get authenticated client
    const authClient = await authManager.getAuthClient();
    console.log('✅ Authentication successful!\n');

    // Initialize Tasks client
    const tasksClient = new GoogleTasksClient(authClient);

    // List all task lists
    console.log('📋 Fetching your task lists...\n');
    const taskLists = await tasksClient.listTaskLists();

    if (taskLists.length === 0) {
      console.log('No task lists found.');
    } else {
      console.log(`Found ${taskLists.length} task list(s):\n`);
      taskLists.forEach((list, index) => {
        console.log(`${index + 1}. ${formatForTerminal(list.title)}`);
        console.log(`   ID: ${list.id}`);
        console.log(`   Updated: ${list.updated}`);
        console.log('');
      });
    }

    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testAuth();
