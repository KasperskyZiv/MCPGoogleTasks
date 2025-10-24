import { GoogleAuthManager } from '../auth';
import * as fs from 'fs/promises';

// Mock fs/promises
jest.mock('fs/promises');

describe('GoogleAuthManager', () => {
  const mockClientId = 'test-client-id';
  const mockClientSecret = 'test-client-secret';
  const mockRedirectUri = 'http://localhost';
  const mockTokenPath = './test-token.json';

  let authManager: GoogleAuthManager;

  beforeEach(() => {
    authManager = new GoogleAuthManager(
      mockClientId,
      mockClientSecret,
      mockRedirectUri,
      mockTokenPath
    );
    jest.clearAllMocks();
  });

  describe('getAuthUrl', () => {
    it('should generate OAuth authorization URL', () => {
      const authUrl = authManager.getAuthUrl();

      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('client_id=' + mockClientId);
      expect(authUrl).toContain('redirect_uri=' + encodeURIComponent(mockRedirectUri));
      expect(authUrl).toContain('scope=' + encodeURIComponent('https://www.googleapis.com/auth/tasks'));
      expect(authUrl).toContain('access_type=offline');
    });
  });

  describe('hasValidToken', () => {
    it('should return true when token file exists', async () => {
      const mockToken = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockToken));

      const result = await authManager.hasValidToken();
      expect(result).toBe(true);
      expect(fs.readFile).toHaveBeenCalledWith(mockTokenPath, 'utf-8');
    });

    it('should return false when token file does not exist', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const result = await authManager.hasValidToken();
      expect(result).toBe(false);
    });
  });

  describe('authenticate', () => {
    it('should exchange code for tokens and save them', async () => {
      const mockCode = 'mock-auth-code';
      const mockTokens = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expiry_date: Date.now() + 3600000,
      };

      // Mock the OAuth2 client getToken method
      const mockGetToken = jest.fn().mockResolvedValue({ tokens: mockTokens });
      (authManager as any).oauth2Client.getToken = mockGetToken;

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      await authManager.authenticate(mockCode);

      expect(mockGetToken).toHaveBeenCalledWith(mockCode);
      // Check atomic write: writes to .tmp file first
      expect(fs.writeFile).toHaveBeenCalledWith(
        `${mockTokenPath}.tmp`,
        JSON.stringify(mockTokens, null, 2),
        { mode: 0o600 }
      );
      // Then renames to final path
      expect(fs.rename).toHaveBeenCalledWith(
        `${mockTokenPath}.tmp`,
        mockTokenPath
      );
    });
  });

  describe('getAuthClient', () => {
    it('should load token and return authenticated client', async () => {
      const mockToken = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockToken));

      const client = await authManager.getAuthClient();

      expect(client).toBeDefined();
      expect(fs.readFile).toHaveBeenCalledWith(mockTokenPath, 'utf-8');
    });

    it('should throw error when no token exists', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(authManager.getAuthClient()).rejects.toThrow(
        'No valid token found'
      );
    });
  });
});
