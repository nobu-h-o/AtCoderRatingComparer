import { fetchRatingData } from '../backend/datacall'; 
import puppeteer from 'puppeteer';


jest.mock('puppeteer', () => {
  const mockBrowser = {
    newPage: jest.fn(),
    close: jest.fn()
  };
  
  const mockPage = {
    goto: jest.fn(),
    evaluate: jest.fn()
  };
  
  return {
    launch: jest.fn().mockResolvedValue(mockBrowser),
    executablePath: jest.fn().mockReturnValue('/mock/chrome/path'),
    mockBrowser,
    mockPage
  };
});

describe('fetchRatingData', () => {
  let mockBrowser;
  let mockPage;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup mock responses
    mockBrowser = puppeteer.mockBrowser;
    mockPage = puppeteer.mockPage;
    mockBrowser.newPage.mockResolvedValue(mockPage);
  });
  
  test('should fetch rating data for two users successfully', async () => {
    // Mock data
    const mockRatingHistory1 = [
      { EndTime: 1600000000, NewRating: 1200, OldRating: 1000, Place: 10, ContestName: 'Contest 1' },
      { EndTime: 1610000000, NewRating: 1300, OldRating: 1200, Place: 5, ContestName: 'Contest 2' }
    ];
    
    const mockRatingHistory2 = [
      { EndTime: 1600000000, NewRating: 1500, OldRating: 1400, Place: 3, ContestName: 'Contest 1' },
      { EndTime: 1610000000, NewRating: 1600, OldRating: 1500, Place: 2, ContestName: 'Contest 2' }
    ];
    
    // Setup mock responses in sequence
    mockPage.evaluate
      .mockResolvedValueOnce(mockRatingHistory1)  // First call for user1
      .mockResolvedValueOnce(mockRatingHistory2); // Second call for user2
    
    const result = await fetchRatingData('user1', 'user2');
    
    // Verify browser was launched with correct options
    expect(puppeteer.launch).toHaveBeenCalledWith({
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--no-zygote'],
      executablePath: '/mock/chrome/path',
      headless: "new"
    });
    
    // Verify page navigation occurred correctly
    expect(mockPage.goto).toHaveBeenCalledTimes(2);
    expect(mockPage.goto).toHaveBeenNthCalledWith(1, 'https://atcoder.jp/users/user1?graph=rating', { waitUntil: 'networkidle0' });
    expect(mockPage.goto).toHaveBeenNthCalledWith(2, 'https://atcoder.jp/users/user2?graph=rating', { waitUntil: 'networkidle0' });
    
    // Verify evaluate was called twice (once for each user)
    expect(mockPage.evaluate).toHaveBeenCalledTimes(2);
    
    // Verify browser was closed
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    
    // Verify correct data was returned
    expect(result).toEqual({
      rating_history1: mockRatingHistory1,
      rating_history2: mockRatingHistory2
    });
  });
  
  test('should handle failed data retrieval for user1', async () => {
    // Mock evaluate to return null for user1 and valid data for user2
    mockPage.evaluate
      .mockResolvedValueOnce(null)  // Failed retrieval for user1
      .mockResolvedValueOnce([{ EndTime: 1600000000, NewRating: 1500 }]); // Valid data for user2
    
    const result = await fetchRatingData('nonexistent1', 'user2');
    
    expect(result).toEqual({
      rating_history1: [],
      rating_history2: [{ EndTime: 1600000000, NewRating: 1500 }]
    });
  });
  
  test('should handle failed data retrieval for user2', async () => {
    // Mock evaluate to return valid data for user1 and null for user2
    mockPage.evaluate
      .mockResolvedValueOnce([{ EndTime: 1600000000, NewRating: 1200 }])  // Valid data for user1
      .mockResolvedValueOnce(null); // Failed retrieval for user2
    
    const result = await fetchRatingData('user1', 'nonexistent2');
    
    expect(result).toEqual({
      rating_history1: [{ EndTime: 1600000000, NewRating: 1200 }],
      rating_history2: []
    });
  });
  
  test('should return empty arrays when an error occurs', async () => {
    // Simulate an error during browser launch
    puppeteer.launch.mockRejectedValueOnce(new Error('Browser launch failed'));
    
    const result = await fetchRatingData('user1', 'user2');
    
    // Verify error handling
    expect(result).toEqual({
      rating_history1: [],
      rating_history2: []
    });
  });
  
  test('should handle network errors when accessing pages', async () => {
    // Setup the browser mock
    mockPage.goto.mockRejectedValueOnce(new Error('Network error'));
    
    const result = await fetchRatingData('user1', 'user2');
    
    // Verify error handling works for navigation errors
    expect(result).toEqual({
      rating_history1: [],
      rating_history2: []
    });
  });
  
  test('should handle evaluation errors', async () => {
    // Setup the browser mock but make evaluate throw an error
    mockPage.evaluate.mockRejectedValueOnce(new Error('Evaluation error'));
    
    const result = await fetchRatingData('user1', 'user2');
    
    // Verify error handling works for evaluation errors
    expect(result).toEqual({
      rating_history1: [],
      rating_history2: []
    });
  });
  
  test('should use production executable path when in production', async () => {
    // Save original env
    const originalEnv = process.env.NODE_ENV;
    const originalPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    
    // Set production environment
    process.env.NODE_ENV = 'production';
    process.env.PUPPETEER_EXECUTABLE_PATH = '/production/chrome/path';
    
    try {
      await fetchRatingData('user1', 'user2');
      
      // Verify the production path was used
      expect(puppeteer.launch).toHaveBeenCalledWith(expect.objectContaining({
        executablePath: '/production/chrome/path'
      }));
    } finally {
      // Restore original env
      process.env.NODE_ENV = originalEnv;
      process.env.PUPPETEER_EXECUTABLE_PATH = originalPath;
    }
  });
});