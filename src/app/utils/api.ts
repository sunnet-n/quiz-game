import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a62b2010`;

// Retry utility with exponential backoff for frontend
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 500
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 400-level errors (client errors)
      if (error.message && !error.message.includes('Failed to fetch') && !error.message.includes('network')) {
        throw error;
      }
      
      // If it's the last retry, throw the error
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Wait with exponential backoff
      const delay = initialDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms due to error:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  return retryWithBackoff(async () => {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        ...options.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }
    
    return data;
  });
}

export const api = {
  // Room operations
  createRoom: (hostNickname: string) =>
    apiRequest('/rooms/create', {
      method: 'POST',
      body: JSON.stringify({ hostNickname }),
    }),

  joinRoom: (roomCode: string, nickname: string) =>
    apiRequest('/rooms/join', {
      method: 'POST',
      body: JSON.stringify({ roomCode, nickname }),
    }),

  getRoom: (roomCode: string) =>
    apiRequest(`/rooms/${roomCode}`),

  getPlayers: (roomCode: string) =>
    apiRequest(`/rooms/${roomCode}/players`),

  startGame: (roomCode: string, playerId: string) =>
    apiRequest(`/rooms/${roomCode}/start`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    }),

  getQuestion: (roomCode: string) =>
    apiRequest(`/rooms/${roomCode}/question`),

  submitAnswer: (roomCode: string, playerId: string, answer: number, timeSpent: number) =>
    apiRequest(`/rooms/${roomCode}/answer`, {
      method: 'POST',
      body: JSON.stringify({ playerId, answer, timeSpent }),
    }),

  nextQuestion: (roomCode: string, playerId: string) =>
    apiRequest(`/rooms/${roomCode}/next-question`, {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    }),

  getLeaderboard: (roomCode: string) =>
    apiRequest(`/rooms/${roomCode}/leaderboard`),
};