import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
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
  }

  /**
   * Get the OAuth2 client, loading existing token if available
   */
  async getAuthClient(): Promise<OAuth2Client> {
    try {
      const token = await this.loadToken();
      this.oauth2Client.setCredentials(token);
      return this.oauth2Client;
    } catch (error) {
      throw new Error(
        'No valid token found. Please authenticate first using getAuthUrl() and authenticate().'
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
    const tokenData = await fs.readFile(this.tokenPath, 'utf-8');
    return JSON.parse(tokenData);
  }

  /**
   * Save token to file
   */
  private async saveToken(tokens: any): Promise<void> {
    await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2));
  }

  /**
   * Check if we have a valid token
   */
  async hasValidToken(): Promise<boolean> {
    try {
      await this.loadToken();
      return true;
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
