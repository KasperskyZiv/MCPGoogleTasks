#!/usr/bin/env node
import { GoogleAuthManager } from '../auth';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost';
const TOKEN_PATH = process.env.TOKEN_PATH || './token.json';

/**
 * Guides an interactive Google Tasks OAuth setup flow for the CLI.
 *
 * Validates required environment variables, initializes the OAuth manager, and if no valid token exists:
 * prints an authorization URL and prompts the user to paste the authorization code from the browser redirect.
 * Exchanges the provided code for tokens and saves them to the configured token path.
 *
 * Side effects:
 * - Reads from stdin to obtain the authorization code.
 * - Writes the retrieved token to the configured TOKEN_PATH.
 * - Terminates the process with exit code 0 on no-op (already authenticated) or 1 on fatal errors.
 */
async function setupAuth() {
  console.log('🔐 Google Tasks OAuth Setup\n');

  // Validate environment variables
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing credentials!');
    console.log('\nPlease create a .env file with:');
    console.log('GOOGLE_CLIENT_ID=your-client-id');
    console.log('GOOGLE_CLIENT_SECRET=your-client-secret');
    console.log('GOOGLE_REDIRECT_URI=http://localhost');
    process.exit(1);
  }

  // Initialize auth manager
  const authManager = new GoogleAuthManager(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    TOKEN_PATH
  );

  // Check if already authenticated
  const hasToken = await authManager.hasValidToken();
  if (hasToken) {
    console.log('✅ You are already authenticated!');
    console.log(`Token file: ${TOKEN_PATH}\n`);
    console.log('Run "npm run test:auth" to test your connection.');
    process.exit(0);
  }

  // Generate auth URL
  const authUrl = authManager.getAuthUrl();

  console.log('Step 1: Visit this URL to authorize the application:\n');
  console.log(authUrl);
  console.log('\n');
  console.log('Step 2: After authorization, you will be redirected to a URL that looks like:');
  console.log('        http://localhost/?code=XXXXX&scope=...');
  console.log('\n');
  console.log('Step 3: Copy the CODE from the URL (the part after "code=")');
  console.log('        Note: The page may show an error - that\'s OK, just copy the code from the URL\n');

  // Prompt for authorization code
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Paste the authorization code here: ', async (code) => {
    rl.close();

    try {
      console.log('\n🔄 Exchanging code for tokens...');
      await authManager.authenticate(code.trim());
      console.log('✅ Authentication successful!');
      console.log(`Token saved to: ${TOKEN_PATH}\n`);
      console.log('You can now run "npm run test:auth" to test your connection.');
    } catch (error) {
      console.error('\n❌ Authentication failed:', error instanceof Error ? error.message : String(error));
      console.log('\nPlease try again by running: npm run setup:auth');
      process.exit(1);
    }
  });
}

setupAuth();