import { useState, useEffect } from 'react';
import { NicknameEntry } from '@/app/components/NicknameEntry';
import { RoomSelection } from '@/app/components/RoomSelection';
import { Lobby } from '@/app/components/Lobby';
import { QuizGame } from '@/app/components/QuizGame';
import { Leaderboard } from '@/app/components/Leaderboard';
import { Toaster } from '@/app/components/ui/sonner';
import { api } from '@/app/utils/api';

type GameState = 'nickname' | 'room-selection' | 'lobby' | 'playing' | 'leaderboard';

interface GameData {
  nickname: string;
  roomCode: string;
  playerId: string;
  isHost: boolean;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('nickname');
  const [gameData, setGameData] = useState<GameData>({
    nickname: '',
    roomCode: '',
    playerId: '',
    isHost: false,
  });

  // Poll room status to detect game state changes
  useEffect(() => {
    if (!gameData.roomCode || gameState === 'nickname' || gameState === 'room-selection') {
      return;
    }

    const checkRoomStatus = async () => {
      try {
        const data = await api.getRoom(gameData.roomCode);
        const room = data.room;

        if (room.status === 'playing' && gameState === 'lobby') {
          setGameState('playing');
        } else if (room.status === 'finished' && gameState === 'playing') {
          setGameState('leaderboard');
        }
      } catch (error) {
        console.error('Failed to check room status:', error);
      }
    };

    const interval = setInterval(checkRoomStatus, 2000);
    return () => clearInterval(interval);
  }, [gameData.roomCode, gameState]);

  const handleNicknameSubmit = (nickname: string) => {
    setGameData((prev) => ({ ...prev, nickname }));
    setGameState('room-selection');
  };

  const handleRoomCreated = (data: any) => {
    setGameData((prev) => ({
      ...prev,
      roomCode: data.roomCode,
      playerId: data.playerId,
      isHost: true,
    }));
    setGameState('lobby');
  };

  const handleRoomJoined = (data: any) => {
    setGameData((prev) => ({
      ...prev,
      roomCode: data.roomCode,
      playerId: data.playerId,
      isHost: false,
    }));
    setGameState('lobby');
  };

  const handleGameStart = () => {
    setGameState('playing');
  };

  const handleGameFinish = () => {
    setGameState('leaderboard');
  };

  const handlePlayAgain = () => {
    setGameData({
      nickname: '',
      roomCode: '',
      playerId: '',
      isHost: false,
    });
    setGameState('nickname');
  };

  const handleBackToNickname = () => {
    setGameState('nickname');
  };

  return (
    <>
      {gameState === 'nickname' && (
        <NicknameEntry onSubmit={handleNicknameSubmit} />
      )}

      {gameState === 'room-selection' && (
        <RoomSelection
          nickname={gameData.nickname}
          onRoomCreated={handleRoomCreated}
          onRoomJoined={handleRoomJoined}
          onBack={handleBackToNickname}
        />
      )}

      {gameState === 'lobby' && (
        <Lobby
          roomCode={gameData.roomCode}
          playerId={gameData.playerId}
          isHost={gameData.isHost}
          onGameStart={handleGameStart}
        />
      )}

      {gameState === 'playing' && (
        <QuizGame
          roomCode={gameData.roomCode}
          playerId={gameData.playerId}
          isHost={gameData.isHost}
          onGameFinish={handleGameFinish}
        />
      )}

      {gameState === 'leaderboard' && (
        <Leaderboard
          roomCode={gameData.roomCode}
          playerId={gameData.playerId}
          onPlayAgain={handlePlayAgain}
        />
      )}

      <Toaster position="top-center" richColors />
    </>
  );
}
