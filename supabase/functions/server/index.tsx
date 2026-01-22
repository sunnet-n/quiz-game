import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Retry utility function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 500
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
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
// To modify: Change the question text, options array, and correctAnswer index (0-3)
const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "Forebears",
    options: ["Atalar", "Takipçiler", "Komşular", "Rakipler"],
    correctAnswer: 0,
  },
  {
    id: 2,
    question: "Merge",
    options: ["Ayırmak", "Birleştirmek", "Ertelemek", "Azaltmak"],
    correctAnswer: 1,
  },
  {
    id: 3,
    question: "Mitigate",
    options: ["Şiddetlendirmek", "Gizlemek", "Hafifletmek", "Yok etmek"],
    correctAnswer: 2,
  },
  {
    id: 4,
    question: "Detrimental",
    options: ["Yararlı", "Zararlı", "Geçici", "Önemsiz"],
    correctAnswer: 1,
  },
  {
    id: 5,
    question: "Cease",
    options: ["Başlamak", "Devam etmek", "Durdurmak", "Değiştirmek"],
    correctAnswer: 2,
  },
  {
    id: 6,
    question: "Deceive",
    options: ["İkna etmek", "Aldatmak", "Koruma altına almak", "Açıklamak"],
    correctAnswer: 1,
  },
  {
    id: 7,
    question: "Falsify",
    options: ["Doğrulamak", "Tahrif etmek", "Gizlemek", "Yayınlamak"],
    correctAnswer: 1,
  },
  {
    id: 8,
    question: "Embody",
    options: ["Temsil etmek", "Gizlemek", "Ortadan kaldırmak", "Reddetmek"],
    correctAnswer: 0,
  },
  {
    id: 9,
    question: "Condemn",
    options: ["Övmek", "Kabul etmek", "Kınamak", "Savunmak"],
    correctAnswer: 2,
  },
  {
    id: 10,
    question: "Hazards",
    options: ["Avantajlar", "Tehlikeler", "Kurallar", "Kaynaklar"],
    correctAnswer: 1,
  },
  {
    id: 11,
    question: "Subsidy",
    options: ["Vergi", "Bağış", "Teşvik", "Sübvansiyon"],
    correctAnswer: 3,
  },
  {
    id: 12,
    question: "Administer",
    options: ["Yönetmek", "İptal etmek", "Engellemek", "Taklit etmek"],
    correctAnswer: 0,
  },
  {
    id: 13,
    question: "Implications",
    options: ["Varsayımlar", "Sonuçlar", "Talimatlar", "Nedenler"],
    correctAnswer: 1,
  },
  {
    id: 14,
    question: "Brain drain",
    options: ["Zihin yorgunluğu", "Beyin göçü", "Hafıza kaybı", "Zeka gelişimi"],
    correctAnswer: 1,
  },
  {
    id: 15,
    question: "Practitioner",
    options: ["Öğrenci", "Uygulayıcı", "Araştırmacı", "Hasta"],
    correctAnswer: 1,
  },
  {
    id: 16,
    question: "Clinicians",
    options: ["Eczacılar", "Araştırmacılar", "Klinisyenler", "Teknisyenler"],
    correctAnswer: 2,
  },
  {
    id: 17,
    question: "Landfill",
    options: ["Geri dönüşüm", "Çöp sahası", "Tarım alanı", "Ormanlık alan"],
    correctAnswer: 1,
  },
  {
    id: 18,
    question: "Decompose",
    options: ["Birleştirmek", "Ayrışmak", "Dondurmak", "Sıkıştırmak"],
    correctAnswer: 1,
  },
  {
    id: 19,
    question: "Compost",
    options: ["Gübre", "Plastik atık", "Kimyasal madde", "Yakıt"],
    correctAnswer: 0,
  },
  {
    id: 20,
    question: "Dispose",
    options: ["Saklamak", "Satın almak", "Ortadan kaldırmak", "Onarmak"],
    correctAnswer: 2,
  },
  {
    id: 21,
    question: "Assertions",
    options: ["Sorular", "İddialar", "Cevaplar", "İtirazlar"],
    correctAnswer: 1,
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
    const room = await retryWithBackoff(() => kv.get(`room:${roomCode}`));
    
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
    const players = await retryWithBackoff(() => kv.getByPrefix(`room:${roomCode}:player:`));
    
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
    
    return c.json({ 
      isCorrect, 
      points, 
      updatedScore: player.score,
      correctAnswer: question.correctAnswer // Return correct answer index
    });
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