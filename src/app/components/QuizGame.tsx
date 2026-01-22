import { useEffect, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { CheckCircle2, XCircle, Clock, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/app/utils/api';
import { motion } from 'motion/react';

interface QuizGameProps {
  roomCode: string;
  playerId: string;
  isHost: boolean;
  onGameFinish: () => void;
}

export function QuizGame({ roomCode, playerId, isHost, onGameFinish }: QuizGameProps) {
  const [question, setQuestion] = useState<any>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [result, setResult] = useState<{ isCorrect: boolean; points: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(15); // Changed to 15 seconds
  const [startTime, setStartTime] = useState(Date.now());
  const [score, setScore] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null);

  const fetchQuestion = async (retries = 3) => {
    try {
      const data = await api.getQuestion(roomCode);
      setQuestion(data.question);
      setTotalQuestions(data.totalQuestions);
      setSelectedAnswer(null);
      setHasAnswered(false);
      setResult(null);
      setTimeLeft(15); // Changed to 15 seconds
      setStartTime(Date.now());
      setCorrectAnswerIndex(null);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Failed to fetch question:', error);
      if (error.message.includes('No more questions')) {
        onGameFinish();
      } else if (error.message.includes('Game not started') && retries > 0) {
        // Retry after a delay if game just started
        console.log(`Retrying question fetch... (${retries} retries left)`);
        setTimeout(() => fetchQuestion(retries - 1), 1000);
      } else {
        toast.error('Failed to load question');
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchQuestion();
    
    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
      }
    };
  }, []);

  // Poll for question changes (for non-host players)
  useEffect(() => {
    if (isHost || !roomCode) return;

    const checkQuestionChange = async () => {
      try {
        const data = await api.getRoom(roomCode);
        const room = data.room;
        
        // If question number changed, fetch new question
        if (room.currentQuestion !== questionNumber - 1) {
          setQuestionNumber(room.currentQuestion + 1);
          await fetchQuestion();
        }
      } catch (error) {
        console.error('Failed to check question status:', error);
      }
    };

    const interval = setInterval(checkQuestionChange, 1500);
    return () => clearInterval(interval);
  }, [roomCode, isHost, questionNumber]);

  useEffect(() => {
    if (hasAnswered || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasAnswered, timeLeft]);

  const handleTimeout = async () => {
    if (hasAnswered) return;
    setHasAnswered(true);
    
    // Submit wrong answer on timeout
    try {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      const data = await api.submitAnswer(roomCode, playerId, -1, timeSpent);
      setResult({ isCorrect: false, points: 0 });
      setScore((prev) => prev + data.points);
      setCorrectAnswerIndex(data.correctAnswer); // Show correct answer
      
      // Auto-advance after 3 seconds for ALL players
      const timer = setTimeout(() => {
        if (isHost) {
          handleNextQuestion();
        } else {
          // Non-host players just advance locally after checking
          advanceToNextQuestion();
        }
      }, 3000);
      setAutoAdvanceTimer(timer);
    } catch (error: any) {
      console.error('Failed to submit timeout:', error);
    }
  };

  const handleAnswer = async (answerIndex: number) => {
    if (hasAnswered) return;

    setSelectedAnswer(answerIndex);
    setHasAnswered(true);

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    try {
      const data = await api.submitAnswer(roomCode, playerId, answerIndex, timeSpent);
      setResult({ isCorrect: data.isCorrect, points: data.points });
      setScore(data.updatedScore);
      
      // Show correct answer if user got it wrong
      if (!data.isCorrect) {
        setCorrectAnswerIndex(data.correctAnswer);
      }

      if (data.isCorrect) {
        toast.success(`Correct! +${data.points} points`);
      } else {
        toast.error('Incorrect answer');
      }
      
      // Auto-advance after 3 seconds for ALL players
      const timer = setTimeout(() => {
        if (isHost) {
          handleNextQuestion();
        } else {
          // Non-host players just advance locally after checking
          advanceToNextQuestion();
        }
      }, 3000);
      setAutoAdvanceTimer(timer);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit answer');
    }
  };

  const handleNextQuestion = async () => {
    // Clear any existing auto-advance timer
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
    
    setIsLoadingNext(true);
    try {
      await api.nextQuestion(roomCode, playerId);
      setQuestionNumber((prev) => prev + 1);
      await fetchQuestion();
    } catch (error: any) {
      toast.error(error.message || 'Failed to move to next question');
    } finally {
      setIsLoadingNext(false);
    }
  };

  const advanceToNextQuestion = async () => {
    // For non-host players, just fetch the next question
    setQuestionNumber((prev) => prev + 1);
    await fetchQuestion();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500">
        <p className="text-white text-xl">Loading question...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500">
        <p className="text-white text-xl">Loading question...</p>
      </div>
    );
  }

  const progressPercent = (timeLeft / 15) * 100; // Changed to 15 seconds

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4">
      <div className="w-full max-w-3xl space-y-4">
        {/* Score and Timer Header */}
        <div className="flex justify-between items-center">
          <Card className="flex-1 mr-2 shadow-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-600">Your Score</p>
                <p className="text-2xl font-bold text-purple-600">{score}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 ml-2 shadow-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className={`w-8 h-8 ${timeLeft <= 5 ? 'text-red-500' : 'text-blue-500'}`} />
              <div>
                <p className="text-sm text-gray-600">Time Left</p>
                <p className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-blue-600'}`}>
                  {timeLeft}s
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Question Card */}
        <Card className="shadow-2xl">
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-600">
                Question {questionNumber} of {totalQuestions}
              </span>
              <Progress value={progressPercent} className="w-32 h-2" />
            </div>
            <CardTitle className="text-2xl">{question.question}</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {question.options.map((option: string, index: number) => {
              const isSelected = selectedAnswer === index;
              const isCorrectAnswer = correctAnswerIndex === index;
              const showResult = hasAnswered && isSelected;
              
              return (
                <motion.div
                  key={index}
                  whileHover={{ scale: hasAnswered ? 1 : 1.02 }}
                  whileTap={{ scale: hasAnswered ? 1 : 0.98 }}
                >
                  <Button
                    onClick={() => handleAnswer(index)}
                    disabled={hasAnswered}
                    className={`w-full h-auto min-h-[60px] text-left justify-start text-lg p-4 ${
                      isSelected && result?.isCorrect
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : isSelected && !result?.isCorrect
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : isCorrectAnswer && hasAnswered
                        ? 'bg-green-500 hover:bg-green-600 text-white border-4 border-green-700'
                        : 'bg-white hover:bg-gray-50 text-gray-900 border-2'
                    }`}
                    variant={isSelected || isCorrectAnswer ? 'default' : 'outline'}
                  >
                    <span className="flex items-center gap-3 w-full">
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        isSelected || isCorrectAnswer ? 'bg-white bg-opacity-30' : 'bg-gray-200'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {showResult && result?.isCorrect && (
                        <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                      )}
                      {showResult && !result?.isCorrect && (
                        <XCircle className="w-6 h-6 flex-shrink-0" />
                      )}
                      {isCorrectAnswer && hasAnswered && !isSelected && (
                        <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                      )}
                    </span>
                  </Button>
                </motion.div>
              );
            })}

            {hasAnswered && result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border-2 ${
                  result.isCorrect
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <p className={`font-semibold ${result.isCorrect ? 'text-green-800' : 'text-red-800'}`}>
                  {result.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  You earned <strong>{result.points}</strong> points
                </p>
              </motion.div>
            )}

            {hasAnswered && isHost && (
              <Button
                onClick={handleNextQuestion}
                disabled={isLoadingNext}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isLoadingNext
                  ? 'Loading...'
                  : questionNumber >= totalQuestions
                  ? 'Show Results'
                  : 'Next Question'}
              </Button>
            )}

            {hasAnswered && !isHost && (
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  Waiting for the host to continue...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}