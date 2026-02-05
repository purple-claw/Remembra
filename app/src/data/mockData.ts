import type { Category, MemoryItem, Achievement, AITool, DaySchedule, StatsData, Profile } from '@/types';

export const mockProfile: Profile = {
  id: '1',
  username: 'Alex Learner',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  timezone: 'UTC',
  notification_preferences: {
    daily_reminder: true,
    reminder_time: '09:00',
    streak_reminder: true,
    achievement_notifications: true,
    ai_insights: true,
  },
  streak_count: 12,
  total_reviews: 847,
  created_at: '2024-01-15T00:00:00Z',
};

export const mockCategories: Category[] = [
  { id: '1', user_id: '1', name: 'Programming', color: '#6366F1', icon: 'code', order_index: 0, is_default: true, created_at: '2024-01-15T00:00:00Z' },
  { id: '2', user_id: '1', name: 'Languages', color: '#10B981', icon: 'languages', order_index: 1, is_default: false, created_at: '2024-01-15T00:00:00Z' },
  { id: '3', user_id: '1', name: 'Science', color: '#F59E0B', icon: 'flask', order_index: 2, is_default: false, created_at: '2024-01-15T00:00:00Z' },
  { id: '4', user_id: '1', name: 'History', color: '#EC4899', icon: 'book-open', order_index: 3, is_default: false, created_at: '2024-01-15T00:00:00Z' },
  { id: '5', user_id: '1', name: 'Mathematics', color: '#8B5CF6', icon: 'calculator', order_index: 4, is_default: false, created_at: '2024-01-15T00:00:00Z' },
];

export const mockMemoryItems: MemoryItem[] = [
  {
    id: '1',
    user_id: '1',
    category_id: '1',
    title: 'React Hooks Deep Dive',
    content: 'useEffect is a hook that lets you synchronize a component with an external system. It accepts two arguments: a setup function and an optional dependencies array.\n\nKey points:\n- Runs after every render by default\n- Can return a cleanup function\n- Dependencies control when it re-runs',
    content_type: 'code',
    attachments: [],
    difficulty: 'medium',
    status: 'reviewing',
    next_review_date: new Date().toISOString().split('T')[0],
    review_stage: 2,
    review_history: [
      { date: '2024-01-20', performance: 'medium', time_spent_seconds: 120 },
      { date: '2024-01-24', performance: 'easy', time_spent_seconds: 90 },
    ],
    ai_summary: '• useEffect synchronizes components with external systems\n• Takes setup function + dependencies array\n• Runs after render, can return cleanup\n• Dependencies control re-execution',
    ai_flowchart: 'graph TD\n    A[Component Render] --> B[useEffect Setup]\n    B --> C{Dependencies Changed?}\n    C -->|Yes| D[Run Cleanup]\n    D --> E[Run Setup]\n    C -->|No| F[Skip Effect]\n    E --> G[Component Updated]\n    F --> G',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-24T00:00:00Z',
  },
  {
    id: '2',
    user_id: '1',
    category_id: '1',
    title: 'TypeScript Generics',
    content: 'Generics allow you to create reusable components that work with multiple types. They provide a way to make components work with any data type while maintaining type safety.\n\nExample:\n```typescript\nfunction identity<T>(arg: T): T {\n    return arg;\n}\n```',
    content_type: 'code',
    attachments: [],
    difficulty: 'hard',
    status: 'learning',
    next_review_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    review_stage: 0,
    review_history: [],
    ai_summary: '• Generics enable type-safe reusable components\n• Use <T> syntax for type parameters\n• Maintain type information across operations\n• Common in functions, interfaces, classes',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
  },
  {
    id: '3',
    user_id: '1',
    category_id: '2',
    title: 'Spanish Verb Conjugations - Present Tense',
    content: 'Regular -ar verbs:\nYo hablo (I speak)\nTú hablas (You speak)\nÉl/Ella habla (He/She speaks)\nNosotros hablamos (We speak)\nVosotros habláis (You all speak)\nEllos hablan (They speak)',
    content_type: 'text',
    attachments: [],
    difficulty: 'medium',
    status: 'reviewing',
    next_review_date: new Date().toISOString().split('T')[0],
    review_stage: 1,
    review_history: [
      { date: '2024-01-28', performance: 'medium', time_spent_seconds: 180 },
    ],
    ai_summary: '• Regular -ar verbs follow predictable patterns\n• Endings: -o, -as, -a, -amos, -áis, -an\n• Subject pronouns determine the ending\n• Practice with hablar, comer, vivir',
    created_at: '2024-01-28T00:00:00Z',
    updated_at: '2024-01-28T00:00:00Z',
  },
  {
    id: '4',
    user_id: '1',
    category_id: '3',
    title: 'Photosynthesis Process',
    content: 'Photosynthesis is the process by which plants convert light energy into chemical energy.\n\nEquation:\n6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂\n\nStages:\n1. Light-dependent reactions (thylakoid)\n2. Calvin cycle/light-independent reactions (stroma)',
    content_type: 'text',
    attachments: [],
    difficulty: 'easy',
    status: 'mastered',
    next_review_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    review_stage: 4,
    review_history: [
      { date: '2024-01-10', performance: 'medium', time_spent_seconds: 240 },
      { date: '2024-01-14', performance: 'easy', time_spent_seconds: 180 },
      { date: '2024-01-21', performance: 'easy', time_spent_seconds: 120 },
    ],
    ai_summary: '• Converts light energy to chemical energy (glucose)\n• Takes CO₂ + H₂O + light → glucose + O₂\n• Two stages: light-dependent and Calvin cycle\n• Occurs in chloroplasts',
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-21T00:00:00Z',
  },
  {
    id: '5',
    user_id: '1',
    category_id: '4',
    title: 'World War II Key Events',
    content: 'Major events timeline:\n\n1939: Germany invades Poland (Sept 1)\n1940: Battle of Britain\n1941: Operation Barbarossa (June), Pearl Harbor (Dec 7)\n1942: Battle of Midway, Battle of Stalingrad begins\n1944: D-Day (June 6)\n1945: Germany surrenders (May 8), Atomic bombs, Japan surrenders (Aug 15)',
    content_type: 'text',
    attachments: [],
    difficulty: 'medium',
    status: 'reviewing',
    next_review_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    review_stage: 2,
    review_history: [
      { date: '2024-01-25', performance: 'hard', time_spent_seconds: 300 },
      { date: '2024-01-29', performance: 'medium', time_spent_seconds: 240 },
    ],
    ai_summary: '• 1939: Germany invades Poland (war begins)\n• 1941: Pearl Harbor brings US into war\n• 1944: D-Day invasion of Normandy\n• 1945: End of war in Europe and Pacific',
    created_at: '2024-01-25T00:00:00Z',
    updated_at: '2024-01-29T00:00:00Z',
  },
  {
    id: '6',
    user_id: '1',
    category_id: '5',
    title: 'Calculus Derivatives Rules',
    content: 'Basic derivative rules:\n\nPower Rule: d/dx(xⁿ) = nxⁿ⁻¹\nProduct Rule: d/dx(uv) = u\'v + uv\'\nQuotient Rule: d/dx(u/v) = (u\'v - uv\')/v²\nChain Rule: d/dx(f(g(x))) = f\'(g(x)) · g\'(x)\n\nCommon derivatives:\nd/dx(sin x) = cos x\nd/dx(cos x) = -sin x\nd/dx(eˣ) = eˣ\nd/dx(ln x) = 1/x',
    content_type: 'text',
    attachments: [],
    difficulty: 'hard',
    status: 'learning',
    next_review_date: new Date().toISOString().split('T')[0],
    review_stage: 0,
    review_history: [],
    ai_summary: '• Power Rule: bring down exponent, subtract 1\n• Product Rule: first·deriv second + second·deriv first\n• Chain Rule: derivative of outer × derivative of inner\n• Memorize common derivatives: sin, cos, eˣ, ln',
    created_at: '2024-02-03T00:00:00Z',
    updated_at: '2024-02-03T00:00:00Z',
  },
  {
    id: '7',
    user_id: '1',
    category_id: '1',
    title: 'JavaScript Async/Await',
    content: 'Async/await is syntactic sugar for Promises, making asynchronous code look synchronous.\n\nKey concepts:\n- async function always returns a Promise\n- await pauses execution until Promise resolves\n- try/catch for error handling\n- Can only use await inside async functions',
    content_type: 'code',
    attachments: [],
    difficulty: 'medium',
    status: 'reviewing',
    next_review_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    review_stage: 1,
    review_history: [
      { date: '2024-02-01', performance: 'medium', time_spent_seconds: 150 },
    ],
    ai_summary: '• Syntactic sugar over Promises\n• async functions return Promises\n• await pauses until Promise resolves\n• Use try/catch for error handling',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z',
  },
  {
    id: '8',
    user_id: '1',
    category_id: '2',
    title: 'French Common Phrases',
    content: 'Essential phrases:\n\nBonjour - Hello/Good morning\nBonsoir - Good evening\nMerci - Thank you\nS\'il vous plaît - Please (formal)\nS\'il te plaît - Please (informal)\nExcusez-moi - Excuse me\nJe ne comprends pas - I don\'t understand\nParlez-vous anglais? - Do you speak English?',
    content_type: 'text',
    attachments: [],
    difficulty: 'easy',
    status: 'mastered',
    next_review_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
    review_stage: 3,
    review_history: [
      { date: '2024-01-15', performance: 'easy', time_spent_seconds: 90 },
      { date: '2024-01-19', performance: 'easy', time_spent_seconds: 60 },
      { date: '2024-01-26', performance: 'easy', time_spent_seconds: 45 },
    ],
    ai_summary: '• Bonjour = Hello/Good morning\n• Merci = Thank you\n• S\'il vous plaît = Please (formal)\n• Excusez-moi = Excuse me',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-26T00:00:00Z',
  },
];

export const mockAchievements: Achievement[] = [
  { id: '1', name: '7 Day Streak', description: 'Review items for 7 consecutive days', icon: 'flame', unlocked_at: '2024-01-22T00:00:00Z', progress: 7, max_progress: 7 },
  { id: '2', name: '100 Reviews', description: 'Complete 100 review sessions', icon: 'target', unlocked_at: '2024-01-25T00:00:00Z', progress: 100, max_progress: 100 },
  { id: '3', name: 'Code Master', description: 'Master 5 programming topics', icon: 'code-2', unlocked_at: undefined, progress: 3, max_progress: 5 },
  { id: '4', name: 'Speed Reader', description: 'Complete a review in under 30 seconds', icon: 'zap', unlocked_at: '2024-01-28T00:00:00Z', progress: 1, max_progress: 1 },
  { id: '5', name: 'AI Explorer', description: 'Use AI features 10 times', icon: 'sparkles', unlocked_at: undefined, progress: 6, max_progress: 10 },
  { id: '6', name: 'Polyglot', description: 'Learn items in 3 different languages', icon: 'globe', unlocked_at: undefined, progress: 2, max_progress: 3 },
  { id: '7', name: '30 Day Streak', description: 'Review items for 30 consecutive days', icon: 'crown', unlocked_at: undefined, progress: 12, max_progress: 30 },
  { id: '8', name: 'Perfectionist', description: 'Get "Easy" rating 50 times in a row', icon: 'award', unlocked_at: undefined, progress: 23, max_progress: 50 },
];

export const mockAITools: AITool[] = [
  { id: 'summarizer', name: 'Smart Summary', description: 'Generate concise bullet points from any content', icon: 'file-text', color: '#6366F1' },
  { id: 'flowchart', name: 'Visual Mapper', description: 'Create interactive flowcharts from text', icon: 'git-branch', color: '#8B5CF6' },
  { id: 'quiz', name: 'Quiz Generator', description: 'Generate practice questions automatically', icon: 'help-circle', color: '#10B981' },
  { id: 'memory-palace', name: 'Memory Palace', description: 'Create visual memory journeys', icon: 'home', color: '#F59E0B' },
  { id: 'chat', name: 'Study Buddy', description: 'AI tutor for your learning materials', icon: 'message-circle', color: '#EC4899' },
];

export const generateCalendarData = (): DaySchedule[] => {
  const data: DaySchedule[] = [];
  const today = new Date();
  
  for (let i = -7; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const isToday = i === 0;
    const isPast = i < 0;
    const baseReviews = Math.floor(Math.random() * 5) + 1;
    
    let reviewsDue = 0;
    let reviewsCompleted = 0;
    
    if (isPast) {
      reviewsDue = baseReviews;
      reviewsCompleted = Math.random() > 0.2 ? baseReviews : Math.floor(baseReviews * 0.7);
    } else if (isToday) {
      reviewsDue = 3;
      reviewsCompleted = 0;
    } else {
      reviewsDue = Math.floor(Math.random() * 4);
      reviewsCompleted = 0;
    }
    
    data.push({
      date: dateStr,
      reviews_due: reviewsDue,
      reviews_completed: reviewsCompleted,
      items: [],
    });
  }
  
  return data;
};

export const mockCalendarData = generateCalendarData();

export const mockStatsData: StatsData = {
  retention_curve: [
    { date: 'Week 1', retention: 100 },
    { date: 'Week 2', retention: 85 },
    { date: 'Week 3', retention: 78 },
    { date: 'Week 4', retention: 72 },
    { date: 'Week 5', retention: 75 },
    { date: 'Week 6', retention: 82 },
    { date: 'Week 7', retention: 88 },
    { date: 'Week 8', retention: 91 },
  ],
  category_breakdown: [
    { category: 'Programming', time_spent: 45, color: '#6366F1' },
    { category: 'Languages', time_spent: 25, color: '#10B981' },
    { category: 'Science', time_spent: 15, color: '#F59E0B' },
    { category: 'History', time_spent: 10, color: '#EC4899' },
    { category: 'Mathematics', time_spent: 5, color: '#8B5CF6' },
  ],
  daily_activity: [
    { date: 'Mon', count: 12 },
    { date: 'Tue', count: 8 },
    { date: 'Wed', count: 15 },
    { date: 'Thu', count: 10 },
    { date: 'Fri', count: 18 },
    { date: 'Sat', count: 6 },
    { date: 'Sun', count: 9 },
  ],
  total_items: 48,
  mastered_items: 15,
  current_streak: 12,
  longest_streak: 23,
  average_accuracy: 87,
};

// Helper functions
export const getCategoryById = (id: string): Category | undefined => {
  return mockCategories.find(c => c.id === id);
};

export const getItemsDueToday = (): MemoryItem[] => {
  const today = new Date().toISOString().split('T')[0];
  return mockMemoryItems.filter(item => item.next_review_date === today);
};

export const getItemsByCategory = (categoryId: string): MemoryItem[] => {
  return mockMemoryItems.filter(item => item.category_id === categoryId);
};

export const getItemsByStatus = (status: string): MemoryItem[] => {
  return mockMemoryItems.filter(item => item.status === status);
};
