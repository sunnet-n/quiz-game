import { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Trophy, Medal, Award, Home } from 'lucide-react';
import { api } from '@/app/utils/api';
import { motion } from 'motion/react';

interface LeaderboardProps {
  roomCode: string;
  playerId: string;
  onPlayAgain: () => void;
}

export function Leaderboard({ roomCode, playerId, onPlayAgain }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const fetchLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard(roomCode);
      setLeaderboard(data.leaderboard);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [roomCode]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-8 h-8 text-yellow-500" />;
      case 2:
        return <Medal className="w-8 h-8 text-gray-400" />;
      case 3:
        return <Award className="w-8 h-8 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-yellow-600';
      case 2:
        return 'from-gray-300 to-gray-500';
      case 3:
        return 'from-amber-500 to-amber-700';
      default:
        return 'from-blue-400 to-blue-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="flex justify-center mb-4"
          >
            <Trophy className="w-16 h-16 text-yellow-500" />
          </motion.div>
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            Final Results
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {leaderboard.map((player, index) => {
              const rank = index + 1;
              const isCurrentPlayer = player.id === playerId;
              
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative overflow-hidden rounded-lg ${
                    isCurrentPlayer ? 'ring-4 ring-purple-500' : ''
                  }`}
                >
                  <div
                    className={`p-4 bg-gradient-to-r ${getRankColor(rank)} text-white`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          {rank <= 3 ? (
                            getRankIcon(rank)
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                              {rank}
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-lg">{player.nickname}</p>
                            {isCurrentPlayer && (
                              <Badge variant="secondary" className="bg-white/20 text-white">
                                You
                              </Badge>
                            )}
                            {player.isHost && (
                              <Badge variant="secondary" className="bg-white/20 text-white">
                                Host
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm opacity-90">
                            {rank === 1 ? '🏆 Winner!' : rank === 2 ? '🥈 Runner-up' : rank === 3 ? '🥉 Third Place' : ''}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-3xl font-bold">{player.score}</p>
                        <p className="text-sm opacity-90">points</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {leaderboard.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Loading results...</p>
            </div>
          )}

          <div className="pt-4 space-y-2">
            <Button
              onClick={onPlayAgain}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Home className="w-5 h-5 mr-2" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
