// Enhanced Memory Item Types with Rich Content
export type ContentType = 'text' | 'code' | 'image' | 'document' | 'mixed';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ItemStatus = 'learning' | 'reviewing' | 'mastered' | 'archived';
export type ReviewPerformance = 'again' | 'hard' | 'medium' | 'easy';

// 1-4-7-30-90 Review Stages
export const REVIEW_INTERVALS = [1, 4, 7, 30, 90] as const;

export interface Category {
    id: string;
    name: string;
    color: string;
    icon: string;
    orderIndex: number;
    isDefault: boolean;
    createdAt: Date;
}

// Rich content block types
export interface ContentBlock {
    id: string;
    type: 'text' | 'heading' | 'bullet' | 'code' | 'flowchart' | 'image' | 'note' | 'divider';
    content: string;
    language?: string; // For code blocks
    level?: number; // For headings (1-3)
    color?: string; // For notes
}

export interface MemoryItem {
    id: string;
    categoryId: string;
    title: string;
    content: string; // Legacy simple content
    contentBlocks: ContentBlock[]; // Rich content blocks
    contentType: ContentType;
    difficulty: Difficulty;
    status: ItemStatus;
    nextReviewDate: Date;
    reviewStage: number; // 0-4 representing intervals
    reviewHistory: ReviewRecord[];
    personalNotes: string; // User's personal notes
    aiSummary?: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface ReviewRecord {
    date: Date;
    performance: ReviewPerformance;
    timeSpentSeconds: number;
}

export interface UserProfile {
    id: string;
    username: string;
    streakCount: number;
    totalReviews: number;
    timezone: string;
    createdAt: Date;
}

export interface DailyStreak {
    date: string; // YYYY-MM-DD
    reviewsCompleted: number;
    streakBroken: boolean;
}

// Helper to calculate next review date
export function getNextReviewDate(
    currentStage: number,
    performance: ReviewPerformance
): { nextDate: Date; nextStage: number } {
    const now = new Date();

    if (performance === 'again') {
        return {
            nextDate: now,
            nextStage: 0,
        };
    }

    let newStage = currentStage;
    if (performance === 'easy') {
        newStage = Math.min(currentStage + 2, REVIEW_INTERVALS.length - 1);
    } else if (performance === 'medium') {
        newStage = Math.min(currentStage + 1, REVIEW_INTERVALS.length - 1);
    } else if (performance === 'hard') {
        newStage = currentStage;
    }

    const daysToAdd = REVIEW_INTERVALS[newStage];
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + daysToAdd);

    return { nextDate, nextStage: newStage };
}

// Sample demo item with rich content
export const DEMO_MEMORY_ITEM: MemoryItem = {
    id: 'demo-1',
    categoryId: 'code',
    title: 'React Hooks - useEffect Deep Dive',
    content: '',
    contentBlocks: [
        { id: '1', type: 'heading', content: 'What is useEffect?', level: 1 },
        { id: '2', type: 'text', content: 'useEffect is a React Hook that lets you synchronize a component with an external system. It runs after the component renders.' },
        { id: '3', type: 'heading', content: 'Key Points', level: 2 },
        { id: '4', type: 'bullet', content: 'Runs after every render by default' },
        { id: '5', type: 'bullet', content: 'Dependencies array controls when it re-runs' },
        { id: '6', type: 'bullet', content: 'Cleanup function runs before next effect' },
        { id: '7', type: 'bullet', content: 'Empty array [] means run only on mount' },
        { id: '8', type: 'divider', content: '' },
        { id: '9', type: 'heading', content: 'Example Code', level: 2 },
        {
            id: '10', type: 'code', content: `useEffect(() => {
  // This runs after render
  const subscription = api.subscribe(id);
  
  // Cleanup function
  return () => {
    subscription.unsubscribe();
  };
}, [id]); // Only re-run if id changes`, language: 'typescript'
        },
        { id: '11', type: 'divider', content: '' },
        { id: '12', type: 'heading', content: 'Flow', level: 2 },
        {
            id: '13', type: 'flowchart', content: `graph TD
    A[Component Renders] --> B{First Render?}
    B -->|Yes| C[Run Effect]
    B -->|No| D{Deps Changed?}
    D -->|Yes| E[Run Cleanup]
    E --> C
    D -->|No| F[Skip Effect]
    C --> G[Component Updates]` },
        { id: '14', type: 'note', content: 'Remember: Effects run AFTER paint, use useLayoutEffect for DOM measurements', color: '#F59E0B' },
    ],
    contentType: 'mixed',
    difficulty: 'medium',
    status: 'reviewing',
    nextReviewDate: new Date(),
    reviewStage: 2,
    reviewHistory: [],
    personalNotes: '',
    tags: ['react', 'hooks', 'useEffect', 'javascript'],
    createdAt: new Date(),
    updatedAt: new Date(),
};
