import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-a62b2010/health", (c) => {
  return c.json({ status: "ok" });
});

// Quiz questions data
const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: 2,
  },
  {
    id: 2,
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: 1,
  },
  {
    id: 3,
    question: "What is 7 × 8?",
    options: ["54", "56", "58", "64"],
    correctAnswer: 1,
  },
  {
    id: 4,
    question: "Who painted the Mona Lisa?",
    options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
    correctAnswer: 2,
  },
  {
    id: 5,
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
    correctAnswer: 3,
  },
];

// Generate a unique room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new game room
app.post("/make-server-a62b2010/rooms/create", async (c) => {
  try {
    const { hostNickname } = await c.req.json();
    
    if (!hostNickname || hostNickname.trim() === "") {
      return c.json({ error: "Host nickname is required" }, 400);
    }

    const roomCode = generateRoomCode();
    const playerId = crypto.randomUUID();
    
    // Create room
    const room = {
      code: roomCode,
      hostId: playerId,
      status: "waiting", // waiting, playing, finished
      currentQuestion: 0,
      createdAt: new Date().toISOString(),
    };
    
    await kv.set(`room:${roomCode}`, room);
    
    // Add host as first player
    const player = {
      id: playerId,
      nickname: hostNickname.trim(),
      isHost: true,
      score: 0,
      joinedAt: new Date().toISOString(),
    };
    
    await kv.set(`room:${roomCode}:player:${playerId}`, player);
    
    return c.json({ roomCode, playerId, player, room });
  } catch (error) {
    console.error("Error creating room:", error);
    return c.json({ error: "Failed to create room: " + error.message }, 500);
  }
});

// Join an existing room
app.post("/make-server-a62b2010/rooms/join", async (c) => {
  try {
    const { roomCode, nickname } = await c.req.json();
    
    if (!roomCode || !nickname) {
      return c.json({ error: "Room code and nickname are required" }, 400);
    }

    const room = await kv.get(`room:${roomCode.toUpperCase()}`);
    
    if (!room) {
      return c.json({ error: "Room not found" }, 404);
    }
    
    if (room.status !== "waiting") {
      return c.json({ error: "Game already started or finished" }, 400);
    }

    const playerId = crypto.randomUUID();
    const player = {
      id: playerId,
      nickname: nickname.trim(),
      isHost: false,
      score: 0,
      joinedAt: new Date().toISOString(),
    };
    
    await kv.set(`room:${roomCode.toUpperCase()}:player:${playerId}`, player);
    
    return c.json({ roomCode: roomCode.toUpperCase(), playerId, player, room });
  } catch (error) {
    console.error("Error joining room:", error);
    return c.json({ error: "Failed to join room: " + error.message }, 500);
  }
});

// Get room data
app.get("/make-server-a62b2010/rooms/:code", async (c) => {
  try {
    const roomCode = c.req.param("code").toUpperCase();
    const room = await kv.get(`room:${roomCode}`);
    
    if (!room) {
      return c.json({ error: "Room not found" }, 404);
    }
    
    return c.json({ room });
  } catch (error) {
    console.error("Error getting room:", error);
    return c.json({ error: "Failed to get room: " + error.message }, 500);
  }
});

// Get all players in a room
app.get("/make-server-a62b2010/rooms/:code/players", async (c) => {
  try {
    const roomCode = c.req.param("code").toUpperCase();
    const players = await kv.getByPrefix(`room:${roomCode}:player:`);
    
    return c.json({ players: players || [] });
  } catch (error) {
    console.error("Error getting players:", error);
    return c.json({ error: "Failed to get players: " + error.message }, 500);
  }
});

// Start the game
app.post("/make-server-a62b2010/rooms/:code/start", async (c) => {
  try {
    const roomCode = c.req.param("code").toUpperCase();
    const { playerId } = await c.req.json();
    
    const room = await kv.get(`room:${roomCode}`);
    
    if (!room) {
      return c.json({ error: "Room not found" }, 404);
    }
    
    if (room.hostId !== playerId) {
      return c.json({ error: "Only the host can start the game" }, 403);
    }
    
    if (room.status !== "waiting") {
      return c.json({ error: "Game already started or finished" }, 400);
    }

    room.status = "playing";
    room.currentQuestion = 0;
    room.startedAt = new Date().toISOString();
    
    await kv.set(`room:${roomCode}`, room);
    
    return c.json({ room });
  } catch (error) {
    console.error("Error starting game:", error);
    return c.json({ error: "Failed to start game: " + error.message }, 500);
  }
});

// Get current question
app.get("/make-server-a62b2010/rooms/:code/question", async (c) => {
  try {
    const roomCode = c.req.param("code").toUpperCase();
    const room = await kv.get(`room:${roomCode}`);
    
    if (!room) {
      return c.json({ error: "Room not found" }, 404);
    }
    
    if (room.status !== "playing") {
      return c.json({ error: "Game not started" }, 400);
    }

    const question = QUIZ_QUESTIONS[room.currentQuestion];
    
    if (!question) {
      return c.json({ error: "No more questions" }, 404);
    }
    
    // Don't send the correct answer to the client
    const { correctAnswer, ...questionWithoutAnswer } = question;
    
    return c.json({ question: questionWithoutAnswer, totalQuestions: QUIZ_QUESTIONS.length });
  } catch (error) {
    console.error("Error getting question:", error);
    return c.json({ error: "Failed to get question: " + error.message }, 500);
  }
});

// Submit an answer
app.post("/make-server-a62b2010/rooms/:code/answer", async (c) => {
  try {
    const roomCode = c.req.param("code").toUpperCase();
    const { playerId, answer, timeSpent } = await c.req.json();
    
    const room = await kv.get(`room:${roomCode}`);
    
    if (!room) {
      return c.json({ error: "Room not found" }, 404);
    }
    
    const player = await kv.get(`room:${roomCode}:player:${playerId}`);
    
    if (!player) {
      return c.json({ error: "Player not found" }, 404);
    }

    const question = QUIZ_QUESTIONS[room.currentQuestion];
    const isCorrect = answer === question.correctAnswer;
    
    // Calculate points based on correctness and speed (max 1000 points per question)
    // Correct answer: 500 base points + up to 500 bonus points for speed
    let points = 0;
    if (isCorrect) {
      const basePoints = 500;
      const speedBonus = Math.max(0, 500 - (timeSpent * 25)); // Less time = more points
      points = Math.round(basePoints + speedBonus);
    }
    
    player.score += points;
    await kv.set(`room:${roomCode}:player:${playerId}`, player);
    
    // Save answer
    const answerData = {
      playerId,
      questionIndex: room.currentQuestion,
      answer,
      isCorrect,
      points,
      timeSpent,
      submittedAt: new Date().toISOString(),
    };
    
    await kv.set(`room:${roomCode}:answer:${room.currentQuestion}:${playerId}`, answerData);
    
    return c.json({ isCorrect, points, updatedScore: player.score });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return c.json({ error: "Failed to submit answer: " + error.message }, 500);
  }
});

// Move to next question
app.post("/make-server-a62b2010/rooms/:code/next-question", async (c) => {
  try {
    const roomCode = c.req.param("code").toUpperCase();
    const { playerId } = await c.req.json();
    
    const room = await kv.get(`room:${roomCode}`);
    
    if (!room) {
      return c.json({ error: "Room not found" }, 404);
    }
    
    if (room.hostId !== playerId) {
      return c.json({ error: "Only the host can advance questions" }, 403);
    }

    if (room.currentQuestion + 1 >= QUIZ_QUESTIONS.length) {
      // Game finished
      room.status = "finished";
      room.finishedAt = new Date().toISOString();
    } else {
      room.currentQuestion += 1;
    }
    
    await kv.set(`room:${roomCode}`, room);
    
    return c.json({ room });
  } catch (error) {
    console.error("Error moving to next question:", error);
    return c.json({ error: "Failed to move to next question: " + error.message }, 500);
  }
});

// Get leaderboard
app.get("/make-server-a62b2010/rooms/:code/leaderboard", async (c) => {
  try {
    const roomCode = c.req.param("code").toUpperCase();
    const players = await kv.getByPrefix(`room:${roomCode}:player:`);
    
    // Sort by score descending
    const leaderboard = (players || []).sort((a, b) => b.score - a.score);
    
    return c.json({ leaderboard });
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return c.json({ error: "Failed to get leaderboard: " + error.message }, 500);
  }
});

Deno.serve(app.fetch);