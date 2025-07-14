// Vitest setup file

// Mock browser APIs
global.fetch = vi.fn();
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Mock environment variables
process.env.VITE_SALESFORCE_CLIENT_ID = 'test-client-id';
process.env.VITE_SALESFORCE_CLIENT_SECRET = 'test-client-secret';
process.env.VITE_SALESFORCE_REDIRECT_URI = 'http://localhost:5173/auth/callback';

// Reset mocks before each test
beforeEach(() => {
  vi.resetAllMocks();
});

// Clean up after tests
afterEach(() => {
  vi.restoreAllMocks();
});