import { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { PlusCircle, Users, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/app/utils/api';

interface RoomSelectionProps {
  nickname: string;
  onRoomCreated: (data: any) => void;
  onRoomJoined: (data: any) => void;
  onBack: () => void;
}

export function RoomSelection({ nickname, onRoomCreated, onRoomJoined, onBack }: RoomSelectionProps) {
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const data = await api.createRoom(nickname);
      onRoomCreated(data);
      toast.success('Room created successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    setIsJoining(true);
    try {
      const data = await api.joinRoom(roomCode.toUpperCase(), nickname);
      onRoomJoined(data);
      toast.success('Joined room successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="w-fit -ml-2 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <CardTitle className="text-2xl">Welcome, {nickname}!</CardTitle>
          <CardDescription>Create a new room or join an existing one</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Room</TabsTrigger>
              <TabsTrigger value="join">Join Room</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-4 mt-4">
              <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                <PlusCircle className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                <h3 className="font-semibold text-lg mb-2">Create a New Game</h3>
                <p className="text-sm text-gray-600 mb-4">
                  You'll be the host and can start the game when ready
                </p>
                <Button
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isCreating ? 'Creating...' : 'Create Room'}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="join" className="space-y-4 mt-4">
              <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                <Users className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <h3 className="font-semibold text-lg mb-2">Join Existing Game</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter the room code shared by the host
                </p>
                <form onSubmit={handleJoinRoom} className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Enter room code..."
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="text-center text-lg font-mono tracking-wider"
                    maxLength={6}
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={!roomCode.trim() || isJoining}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                  >
                    {isJoining ? 'Joining...' : 'Join Room'}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
