import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-a62b2010`;

async function apiRequest(endpoint: string, options: RequestInit = {}) {
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
