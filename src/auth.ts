import { google } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * OAuth2 configuration and token management for Google Tasks API
 */
export class GoogleAuthManager {
  private oauth2Client: OAuth2Client;
  private tokenPath: string;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    tokenPath: string = './token.json'
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
    this.tokenPath = tokenPath;

    // Persist refreshed tokens automatically
    this.oauth2Client.on('tokens', async (tokens: Credentials) => {
      // Merge with existing to avoid dropping fields like refresh_token
      const merged: Credentials = { ...(this.oauth2Client.credentials || {}), ...tokens };
      try {
        await this.saveToken(merged);
      } catch (e) {
        // Non-fatal: log and continue
        console.error('[Auth] Failed to save refreshed token:', e);
      }
    });
  }

  /**
   * Get the OAuth2 client, loading existing token if available
   */
  async getAuthClient(): Promise<OAuth2Client> {
    try {
      const token = await this.loadToken();
      this.oauth2Client.setCredentials(token);
      // Ensure fresh access token (auto-refreshes if refresh_token present)
      await this.oauth2Client.getAccessToken();
      return this.oauth2Client;
    } catch (error) {
      throw new Error(
        'No valid token found. Please authenticate first using getAuthUrl() and authenticate().',
        { cause: error instanceof Error ? error : undefined }
      );
    }
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  getAuthUrl(): string {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/tasks'],
      prompt: 'consent',
    });
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async authenticate(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    await this.saveToken(tokens);
  }

  /**
   * Load token from file
   */
  private async loadToken(): Promise<any> {
    console.error(`[DEBUG] Attempting to load token from: ${this.tokenPath}`);
    const tokenData = await fs.readFile(this.tokenPath, 'utf-8');
    console.error(`[DEBUG] Token loaded successfully`);
    return JSON.parse(tokenData);
  }

  /**
   * Save token to file (atomic write with secure permissions)
   */
  private async saveToken(tokens: Credentials): Promise<void> {
    const dir = path.dirname(this.tokenPath);
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${this.tokenPath}.tmp`;
    const data = JSON.stringify(tokens, null, 2);
    await fs.writeFile(tmp, data, { mode: 0o600 });
    await fs.rename(tmp, this.tokenPath);
  }

  /**
   * Check if we have a valid token (checks expiry and attempts silent refresh)
   */
  async hasValidToken(): Promise<boolean> {
    try {
      const token = await this.loadToken() as Credentials;
      const exp = token.expiry_date ? Number(token.expiry_date) : 0;
      // 60s clock skew tolerance
      const fresh = exp && exp - 60_000 > Date.now();
      if (fresh) return true;
      // Try a silent refresh if we have a refresh_token
      this.oauth2Client.setCredentials(token);
      await this.oauth2Client.getAccessToken();
      return !!this.oauth2Client.credentials.access_token;
    } catch {
      return false;
    }
  }

  /**
   * Refresh the access token if needed
   */
  async refreshToken(): Promise<void> {
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    this.oauth2Client.setCredentials(credentials);
    await this.saveToken(credentials);
  }
}
