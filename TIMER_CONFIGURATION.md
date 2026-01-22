# Timer Configuration Guide

## How to Change the Quiz Timer Duration

The quiz timer is currently set to **15 seconds** per question. To modify this, update the following locations:

### 1. Frontend Component (`/src/app/components/QuizGame.tsx`)

Find and change these **3 occurrences** of the timer value:

```typescript
// Line ~26: Initial state
const [timeLeft, setTimeLeft] = useState(15); // Change 15 to your desired seconds

// Line ~42: When fetching a new question
setTimeLeft(15); // Change 15 to your desired seconds

// Line ~214: Progress bar calculation
const progressPercent = (timeLeft / 15) * 100; // Change 15 to your desired seconds
```

### Example: Change to 20 seconds

```typescript
const [timeLeft, setTimeLeft] = useState(20);
setTimeLeft(20);
const progressPercent = (timeLeft / 20) * 100;
```

### Example: Change to 10 seconds

```typescript
const [timeLeft, setTimeLeft] = useState(10);
setTimeLeft(10);
const progressPercent = (timeLeft / 10) * 100;
```

## Important Notes

1. **All three values must match** - otherwise the timer and progress bar will be out of sync
2. The timer only needs to be changed in the **frontend** - no backend changes required
3. After changing, refresh the page and create a new game room to test
4. Recommended range: **10-30 seconds** for vocabulary questions

## Current Settings

- ⏱️ **Timer Duration**: 15 seconds
- 🔄 **Auto-advance Delay**: 3 seconds (after answering or timeout)
- 📊 **Points System**: 
  - Base points for correct answer: 500
  - Speed bonus: up to 500 points (faster = more points)
  - Wrong answer: 0 points
