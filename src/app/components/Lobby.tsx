import { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Users, Copy, Check, Crown, Play } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/app/utils/api';

interface LobbyProps {
  roomCode: string;
  playerId: string;
  isHost: boolean;
  onGameStart: () => void;
}

export function Lobby({ roomCode, playerId, isHost, onGameStart }: LobbyProps) {
  const [players, setPlayers] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const fetchPlayers = async () => {
    try {
      const data = await api.getPlayers(roomCode);
      setPlayers(data.players);
    } catch (error: any) {
      console.error('Failed to fetch players:', error);
    }
  };

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [roomCode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast.success('Room code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    if (players.length < 1) {
      toast.error('You need at least 1 player to start');
      return;
    }

    setIsStarting(true);
    try {
      await api.startGame(roomCode, playerId);
      toast.success('Game starting...');
      // Small delay to ensure state is saved
      setTimeout(() => {
        onGameStart();
      }, 500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to start game');
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold mb-2">Game Lobby</CardTitle>
          <CardDescription className="text-lg">
            Waiting for players to join...
          </CardDescription>
          
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Room Code</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-bold font-mono tracking-wider text-purple-600">
                {roomCode}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyCode}
                className="h-10 w-10"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Share this code with other players
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Players ({players.length})
            </h3>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {players.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No players yet...</p>
              </div>
            ) : (
              players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                      {player.nickname.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{player.nickname}</span>
                  </div>
                  {player.isHost && (
                    <Badge className="bg-yellow-500 hover:bg-yellow-600">
                      <Crown className="w-3 h-3 mr-1" />
                      Host
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>

          {isHost && (
            <Button
              onClick={handleStartGame}
              disabled={players.length < 1 || isStarting}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Play className="w-5 h-5 mr-2" />
              {isStarting ? 'Starting...' : 'Start Game'}
            </Button>
          )}

          {!isHost && (
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                Waiting for the host to start the game...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}