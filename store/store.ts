import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Category, DailyStreak, MemoryItem, UserProfile } from '../types/types';

interface AppState {
    user: UserProfile | null;
    categories: Category[];
    memoryItems: MemoryItem[];
    streaks: DailyStreak[];

    setUser: (user: UserProfile) => void;
    addCategory: (category: Category) => void;
    updateCategory: (id: string, updates: Partial<Category>) => void;
    deleteCategory: (id: string) => void;
    addMemoryItem: (item: MemoryItem) => void;
    updateMemoryItem: (id: string, updates: Partial<MemoryItem>) => void;
    deleteMemoryItem: (id: string) => void;
    recordDailyActivity: (reviewsCompleted: number) => void;
    getTodayReviews: () => MemoryItem[];
    getItemsByCategory: (categoryId: string) => MemoryItem[];
    getCurrentStreak: () => number;
}

const defaultCategories: Category[] = [
    {
        id: 'general',
        name: 'General',
        color: '#6366F1',
        icon: 'book-outline',
        orderIndex: 0,
        isDefault: true,
        createdAt: new Date(),
    },
    {
        id: 'code',
        name: 'Code',
        color: '#22C55E',
        icon: 'code-slash-outline',
        orderIndex: 1,
        isDefault: false,
        createdAt: new Date(),
    },
    {
        id: 'vocabulary',
        name: 'Vocabulary',
        color: '#F59E0B',
        icon: 'language-outline',
        orderIndex: 2,
        isDefault: false,
        createdAt: new Date(),
    },
    {
        id: 'science',
        name: 'Science',
        color: '#EC4899',
        icon: 'flask-outline',
        orderIndex: 3,
        isDefault: false,
        createdAt: new Date(),
    },
    {
        id: 'history',
        name: 'History',
        color: '#8B5CF6',
        icon: 'time-outline',
        orderIndex: 4,
        isDefault: false,
        createdAt: new Date(),
    },
];

// Comprehensive demo items
const demoItems: MemoryItem[] = [
    {
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
            { id: '11', type: 'note', content: 'Remember: Effects run AFTER paint, use useLayoutEffect for DOM measurements', color: '#F59E0B' },
        ],
        contentType: 'mixed',
        difficulty: 'medium',
        status: 'reviewing',
        nextReviewDate: new Date(),
        reviewStage: 2,
        reviewHistory: [
            { date: new Date(Date.now() - 7 * 86400000), performance: 'easy', timeSpentSeconds: 45 },
            { date: new Date(Date.now() - 3 * 86400000), performance: 'medium', timeSpentSeconds: 30 },
        ],
        personalNotes: 'Very important for interviews! Remember the cleanup pattern.',
        tags: ['react', 'hooks', 'useEffect', 'javascript'],
        createdAt: new Date(Date.now() - 14 * 86400000),
        updatedAt: new Date(),
    },
    {
        id: 'demo-2',
        categoryId: 'general',
        title: 'Spaced Repetition - The 1-4-7 Method',
        content: '',
        contentBlocks: [
            { id: '1', type: 'heading', content: 'The Science of Memory', level: 1 },
            { id: '2', type: 'text', content: 'Spaced repetition leverages the psychological spacing effect. Information reviewed at increasing intervals is retained more effectively than massed practice.' },
            { id: '3', type: 'heading', content: 'The 1-4-7-30-90 Schedule', level: 2 },
            { id: '4', type: 'bullet', content: 'Day 1: First review after learning' },
            { id: '5', type: 'bullet', content: 'Day 4: Second reinforcement' },
            { id: '6', type: 'bullet', content: 'Day 7: Third reinforcement' },
            { id: '7', type: 'bullet', content: 'Day 30: Monthly consolidation' },
            { id: '8', type: 'bullet', content: 'Day 90: Long-term retention check' },
            { id: '9', type: 'divider', content: '' },
            { id: '10', type: 'note', content: 'If you fail a review, the item resets to Day 1. Consistency is key!', color: '#FF6B35' },
            { id: '11', type: 'heading', content: 'Why It Works', level: 2 },
            { id: '12', type: 'text', content: 'Each successful recall strengthens the memory trace. The increasing intervals push against the forgetting curve, training your brain to retain information longer.' },
        ],
        contentType: 'text',
        difficulty: 'easy',
        status: 'learning',
        nextReviewDate: new Date(Date.now() + 86400000),
        reviewStage: 0,
        reviewHistory: [],
        personalNotes: 'This is the core concept behind Remembra!',
        tags: ['learning', 'memory', 'productivity', 'study'],
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'demo-3',
        categoryId: 'code',
        title: 'JavaScript Array Methods Cheatsheet',
        content: '',
        contentBlocks: [
            { id: '1', type: 'heading', content: 'Essential Array Methods', level: 1 },
            { id: '2', type: 'heading', content: 'map() - Transform', level: 2 },
            { id: '3', type: 'text', content: 'Creates a new array by transforming each element.' },
            {
                id: '4', type: 'code', content: `const numbers = [1, 2, 3, 4];
const doubled = numbers.map(n => n * 2);
// Result: [2, 4, 6, 8]`, language: 'javascript'
            },
            { id: '5', type: 'heading', content: 'filter() - Select', level: 2 },
            { id: '6', type: 'text', content: 'Creates a new array with elements that pass a test.' },
            {
                id: '7', type: 'code', content: `const numbers = [1, 2, 3, 4, 5];
const evens = numbers.filter(n => n % 2 === 0);
// Result: [2, 4]`, language: 'javascript'
            },
            { id: '8', type: 'heading', content: 'reduce() - Accumulate', level: 2 },
            { id: '9', type: 'text', content: 'Reduces array to a single value.' },
            {
                id: '10', type: 'code', content: `const numbers = [1, 2, 3, 4];
const sum = numbers.reduce((acc, n) => acc + n, 0);
// Result: 10`, language: 'javascript'
            },
            { id: '11', type: 'heading', content: 'find() - Search', level: 2 },
            {
                id: '12', type: 'code', content: `const users = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
const user = users.find(u => u.id === 2);
// Result: {id: 2, name: 'Bob'}`, language: 'javascript'
            },
        ],
        contentType: 'code',
        difficulty: 'medium',
        status: 'reviewing',
        nextReviewDate: new Date(),
        reviewStage: 1,
        reviewHistory: [
            { date: new Date(Date.now() - 4 * 86400000), performance: 'medium', timeSpentSeconds: 60 },
        ],
        personalNotes: '',
        tags: ['javascript', 'arrays', 'methods', 'functional'],
        createdAt: new Date(Date.now() - 5 * 86400000),
        updatedAt: new Date(),
    },
    {
        id: 'demo-4',
        categoryId: 'vocabulary',
        title: 'Spanish Greetings & Farewells',
        content: '',
        contentBlocks: [
            { id: '1', type: 'heading', content: 'Greetings (Saludos)', level: 1 },
            { id: '2', type: 'bullet', content: 'Hola - Hello' },
            { id: '3', type: 'bullet', content: 'Buenos días - Good morning' },
            { id: '4', type: 'bullet', content: 'Buenas tardes - Good afternoon' },
            { id: '5', type: 'bullet', content: 'Buenas noches - Good evening/night' },
            { id: '6', type: 'bullet', content: '¿Cómo estás? - How are you? (informal)' },
            { id: '7', type: 'bullet', content: '¿Cómo está usted? - How are you? (formal)' },
            { id: '8', type: 'divider', content: '' },
            { id: '9', type: 'heading', content: 'Farewells (Despedidas)', level: 1 },
            { id: '10', type: 'bullet', content: 'Adiós - Goodbye' },
            { id: '11', type: 'bullet', content: 'Hasta luego - See you later' },
            { id: '12', type: 'bullet', content: 'Hasta mañana - See you tomorrow' },
            { id: '13', type: 'bullet', content: 'Nos vemos - See you' },
            { id: '14', type: 'note', content: 'Use "usted" for elders and formal situations!', color: '#22C55E' },
        ],
        contentType: 'text',
        difficulty: 'easy',
        status: 'mastered',
        nextReviewDate: new Date(Date.now() + 30 * 86400000),
        reviewStage: 4,
        reviewHistory: [
            { date: new Date(Date.now() - 90 * 86400000), performance: 'easy', timeSpentSeconds: 20 },
            { date: new Date(Date.now() - 60 * 86400000), performance: 'easy', timeSpentSeconds: 15 },
            { date: new Date(Date.now() - 30 * 86400000), performance: 'easy', timeSpentSeconds: 12 },
        ],
        personalNotes: 'Practice with native speakers when possible!',
        tags: ['spanish', 'vocabulary', 'greetings', 'language'],
        createdAt: new Date(Date.now() - 100 * 86400000),
        updatedAt: new Date(),
    },
    {
        id: 'demo-5',
        categoryId: 'science',
        title: 'The Water Cycle',
        content: '',
        contentBlocks: [
            { id: '1', type: 'heading', content: 'Stages of the Water Cycle', level: 1 },
            { id: '2', type: 'text', content: 'The water cycle describes the continuous movement of water on, above, and below the surface of the Earth.' },
            { id: '3', type: 'heading', content: '1. Evaporation', level: 2 },
            { id: '4', type: 'text', content: 'The sun heats water in oceans, lakes, and rivers. Water transforms from liquid to vapor and rises into the atmosphere.' },
            { id: '5', type: 'heading', content: '2. Condensation', level: 2 },
            { id: '6', type: 'text', content: 'As water vapor rises, it cools and condenses into tiny droplets, forming clouds.' },
            { id: '7', type: 'heading', content: '3. Precipitation', level: 2 },
            { id: '8', type: 'text', content: 'When droplets combine and become heavy enough, they fall as rain, snow, or hail.' },
            { id: '9', type: 'heading', content: '4. Collection', level: 2 },
            { id: '10', type: 'text', content: 'Water collects in oceans, lakes, rivers, and underground. The cycle begins again.' },
            { id: '11', type: 'note', content: 'About 97% of Earth\'s water is in the oceans. Only 3% is freshwater!', color: '#3B82F6' },
        ],
        contentType: 'text',
        difficulty: 'easy',
        status: 'reviewing',
        nextReviewDate: new Date(Date.now() + 3 * 86400000),
        reviewStage: 2,
        reviewHistory: [],
        personalNotes: '',
        tags: ['science', 'water', 'nature', 'earth'],
        createdAt: new Date(Date.now() - 7 * 86400000),
        updatedAt: new Date(),
    },
    {
        id: 'demo-6',
        categoryId: 'code',
        title: 'Git Commands Quick Reference',
        content: '',
        contentBlocks: [
            { id: '1', type: 'heading', content: 'Essential Git Commands', level: 1 },
            { id: '2', type: 'heading', content: 'Setup & Init', level: 2 },
            {
                id: '3', type: 'code', content: `git init                    # Initialize new repo
git clone <url>             # Clone remote repo
git config --global user.name "Name"
git config --global user.email "email"`, language: 'bash'
            },
            { id: '4', type: 'heading', content: 'Daily Workflow', level: 2 },
            {
                id: '5', type: 'code', content: `git status                  # Check status
git add .                   # Stage all changes
git commit -m "message"     # Commit with message
git push origin main        # Push to remote
git pull origin main        # Pull from remote`, language: 'bash'
            },
            { id: '6', type: 'heading', content: 'Branching', level: 2 },
            {
                id: '7', type: 'code', content: `git branch                  # List branches
git branch <name>           # Create branch
git checkout <name>         # Switch branch
git checkout -b <name>      # Create and switch
git merge <branch>          # Merge branch`, language: 'bash'
            },
            { id: '8', type: 'note', content: 'Always pull before push to avoid conflicts!', color: '#FF6B35' },
        ],
        contentType: 'code',
        difficulty: 'medium',
        status: 'learning',
        nextReviewDate: new Date(),
        reviewStage: 0,
        reviewHistory: [],
        personalNotes: 'Reference this when I forget commands',
        tags: ['git', 'version-control', 'commands', 'terminal'],
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

// Demo streaks for the last 10 days
const generateDemoStreaks = (): DailyStreak[] => {
    const streaks: DailyStreak[] = [];
    for (let i = 0; i < 10; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        if (i !== 5) { // Skip one day to show broken streak
            streaks.push({
                date: date.toISOString().split('T')[0],
                reviewsCompleted: Math.floor(Math.random() * 5) + 1,
                streakBroken: false,
            });
        }
    }
    return streaks;
};

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            user: {
                id: 'local-user',
                username: 'Demo User',
                streakCount: 7,
                totalReviews: 42,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                createdAt: new Date(),
            },
            categories: defaultCategories,
            memoryItems: demoItems,
            streaks: generateDemoStreaks(),

            setUser: (user) => set({ user }),

            addCategory: (category) =>
                set((state) => ({ categories: [...state.categories, category] })),

            updateCategory: (id, updates) =>
                set((state) => ({
                    categories: state.categories.map((c) =>
                        c.id === id ? { ...c, ...updates } : c
                    ),
                })),

            deleteCategory: (id) =>
                set((state) => ({
                    categories: state.categories.filter((c) => c.id !== id),
                })),

            addMemoryItem: (item) =>
                set((state) => ({ memoryItems: [...state.memoryItems, item] })),

            updateMemoryItem: (id, updates) =>
                set((state) => ({
                    memoryItems: state.memoryItems.map((m) =>
                        m.id === id ? { ...m, ...updates, updatedAt: new Date() } : m
                    ),
                })),

            deleteMemoryItem: (id) =>
                set((state) => ({
                    memoryItems: state.memoryItems.filter((m) => m.id !== id),
                })),

            recordDailyActivity: (reviewsCompleted) => {
                const today = new Date().toISOString().split('T')[0];
                set((state) => {
                    const existingStreak = state.streaks.find((s) => s.date === today);
                    if (existingStreak) {
                        return {
                            streaks: state.streaks.map((s) =>
                                s.date === today
                                    ? { ...s, reviewsCompleted: s.reviewsCompleted + reviewsCompleted }
                                    : s
                            ),
                        };
                    }
                    return {
                        streaks: [...state.streaks, { date: today, reviewsCompleted, streakBroken: false }],
                    };
                });
            },

            getTodayReviews: () => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return get().memoryItems.filter((item) => {
                    const reviewDate = new Date(item.nextReviewDate);
                    reviewDate.setHours(0, 0, 0, 0);
                    return reviewDate <= today && item.status !== 'archived' && item.status !== 'mastered';
                });
            },

            getItemsByCategory: (categoryId) =>
                get().memoryItems.filter((m) => m.categoryId === categoryId),

            getCurrentStreak: () => {
                const streaks = get().streaks.sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                let count = 0;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                for (let i = 0; i < streaks.length; i++) {
                    const streakDate = new Date(streaks[i].date);
                    streakDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.floor(
                        (today.getTime() - streakDate.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    if (diffDays === i && streaks[i].reviewsCompleted > 0) {
                        count++;
                    } else {
                        break;
                    }
                }
                return count;
            },
        }),
        {
            name: 'remembra-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
