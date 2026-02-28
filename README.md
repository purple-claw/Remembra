# Remembra

Smart memory training powered by adaptive spaced repetition. Because your brain deserves better than random reviewing.

## What is this?

Remembra is an intelligent memory training app built with React and TypeScript. It uses the **SM-2 (SuperMemo 2) algorithm** — the same proven spaced repetition system trusted by millions of learners worldwide — to optimize when you review each item based on YOUR personal performance history.

Unlike rigid flashcard systems, Remembra adapts to you. Each memory item gets its own personalized schedule that evolves as you learn.

## Key Features

### SM-2 Adaptive Scheduling
- **Intelligent intervals**: Items you know well appear less frequently; items you struggle with come back sooner
- **Personal difficulty tracking**: Each card has its own "easiness factor" that adjusts based on your ratings
- **Lapse detection**: Automatically identifies "leech" cards that need extra attention
- **Smart queue**: Reviews are prioritized by urgency, difficulty, and your past performance

### Rich Review Experience
- **Interactive review sessions** with live timer, retention estimates, and session statistics
- **Inline note-taking**: Add notes to any item during review
- **Bookmark important items** for quick access
- **Skip cards** if you need to come back to them later
- **Predicted intervals**: See exactly when you'll next review a card before you rate it
- **Review history visualization**: Track your performance trends over time

### Organize & Track
- **Categories with progress indicators**: Organize items by topic (DSA, History, Languages, etc.)
- **Multi-format content**: Text, code (with syntax highlighting), markdown, images
- **AI-powered insights**: Auto-generated summaries and bullet points
- **Lifecycle management**: Items automatically graduate to "completed" after mastery (365+ day intervals)

### Analytics & Motivation
- **Streak tracking**: Keep your learning momentum going
- **Accuracy metrics**: See your success rate and identify improvement areas
- **Calendar view**: Visual history of your review activity
- **Session stats**: Cards reviewed, best streak, time spent, performance breakdown

## How It Works: The SM-2 Algorithm

When you review an item, you rate your recall quality:

| Rating | Meaning | What Happens |
|--------|---------|--------------|
| Again | "I completely forgot" | Resets to 1 day, lapse count increases |
| Hard | "I recalled with difficulty" | Smaller interval increase, EF decreases slightly |
| Good | "Normal effort recall" | Standard progression (1d → 6d → 15d → 36d...) |
| Easy | "Instant, effortless" | Aggressive interval growth, EF increases |

**Your ratings shape the future**: The algorithm uses your performance history to calculate a personalized "easiness factor" (EF) for each item. Cards you consistently rate "Easy" will quickly stretch to months between reviews. Cards you struggle with get more frequent practice.

**Example progression**:
```
Day 1:  Create item → due immediately
Day 1:  Rate "Good" → next in 1 day (EF: 2.5)
Day 2:  Rate "Good" → next in 6 days (EF: 2.5)
Day 8:  Rate "Easy" → next in 18 days (EF: 2.6)
Day 26: Rate "Good" → next in 47 days (EF: 2.6)
Day 73: Rate "Hard" → next in 35 days (EF: 2.4)
...
Year 2: Interval reaches 365+ days → auto-graduates to "completed"
```

If you forget (rate "Again"), the item resets to 1 day and starts climbing again. After 4+ lapses, you'll see a **leech warning** — a sign to rewrite the content or break it into smaller chunks.

## Daily Workflow

1. **Open the app** → Dashboard shows how many items are due today
2. **Tap "Start Review"** → Begin your session
3. **For each card**:
    - Read the title and try to recall the content
    - Tap "Show Answer" when ready
    - Review the content (with AI insights if available)
    - Rate yourself: Again / Hard / Good / Easy
    - Use notes, bookmarks, or skip as needed
4. **View session stats** → See cards reviewed, accuracy, streak, and time spent
5. **Come back tomorrow** → The algorithm has scheduled everything optimally

## Tech Stack

- **React 19.2 + TypeScript** — Type-safe component architecture
- **Vite 7** — Lightning-fast dev server and optimized builds
- **Tailwind CSS + shadcn/ui** — Beautiful, accessible UI components
- **Supabase** — PostgreSQL database, authentication, real-time subscriptions
- **Zustand** — Lightweight state management with persistence
- **Capacitor 8** — Cross-platform mobile (Android/iOS)
- **Local Notifications** — Review reminders on Android
- **React Syntax Highlighter** — VS Code-quality code block rendering
- **Mermaid.js** — Diagram and flowchart support
- **KaTeX** — Beautiful math equation rendering

## Getting Started

### For Users

1. **Install the app** from Google Play (or build from source)
2. **Sign up** with your email
3. **Create your first item**:
    - Tap the **+** button
    - Add a title and content (text, code, markdown, etc.)
    - Choose a category and difficulty
4. **Review daily**: The app will show you what's due
5. **Watch your progress**: Track streaks, accuracy, and mastery in the Stats screen

### For Developers

#### Prerequisites
- Node.js 18+ (we recommend 20+)
- npm or pnpm
- (For Android) Android Studio, JDK 17, Android SDK

#### Quick Start

```bash
# Clone the repository
git clone https://github.com/purple-claw/Remembra.git
cd Remembra/app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

#### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run `supabase/schema.sql` to create tables
3. **If migrating from an older version**, also run `supabase/migration_sm2.sql`
4. Copy your API URL and anon key to `.env`:
    ```
    VITE_SUPABASE_URL=https://your-project.supabase.co
    VITE_SUPABASE_ANON_KEY=your-anon-key
    ```
5. Enable Email authentication in Supabase Dashboard → Authentication → Providers

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for detailed instructions.

## Development Commands

```bash
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # Build for production
npm run preview   # Preview production build locally
npm run lint      # Run ESLint
npx tsc --noEmit  # Type-check without emitting files
```

### Android Development

See [BUILD.md](BUILD.md) for complete Android build instructions:

```bash
npm run build               # Build web assets
npx cap sync android        # Sync with Capacitor
npx cap open android        # Open in Android Studio
```

## Project Structure

```
app/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # shadcn/ui base components
│   │   ├── AuthProvider.tsx
│   │   ├── BottomNav.tsx
│   │   ├── ItemDetail.tsx
│   │   └── MarkdownRenderer.tsx
│   ├── screens/         # Main app screens
│   │   ├── Dashboard.tsx
│   │   ├── Review.tsx   # Core SM-2 review experience
│   │   ├── Create.tsx
│   │   ├── Library.tsx
│   │   ├── Stats.tsx
│   │   └── Calendar.tsx
│   ├── services/        # Supabase API layer
│   │   ├── memoryItemService.ts
│   │   ├── categoryService.ts
│   │   └── notificationService.ts
│   ├── store/           # Zustand state management
│   │   └── useSupabaseStore.ts
│   ├── types/           # TypeScript definitions + SM-2 engine
│   │   └── index.ts     # Core SM-2 algorithm
│   └── lib/             # Utilities
├── supabase/
│   ├── schema.sql       # Initial database schema
│   └── migration_sm2.sql # SM-2 migration script
└── android/             # Capacitor Android project
```

## Building for Production

### Web Deployment

```bash
npm run build
# Deploy the `dist/` folder to any static hosting:
# Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc.
```

### Android APK/AAB

See [BUILD.md](BUILD.md) for detailed guide:

```bash
npm run build
npx cap sync android
npx cap open android
# In Android Studio: Build → Generate Signed Bundle/APK
```

```

## Key Screens

### Dashboard
Your daily overview with due items, streak count, category progress, and quick access to start reviewing.

### Review
The heart of the app. Interactive review sessions with live timer, retention estimates, inline notes, bookmarks, and personalized interval predictions.

### Library
Browse all your items organized by category. Search, filter, and manage your knowledge base.

### Stats
Detailed analytics: total reviews, accuracy rate, current streak, status breakdown, and performance trends.

### Calendar
Visual history of your review activity with daily breakdown of items reviewed.

## Contributing

Contributions are welcome! Whether it's bug fixes, new features, or documentation improvements:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with clear, descriptive commits
4. **Test thoroughly** — make sure the build passes (`npm run build`)
5. **Submit a pull request** with a clear description of what changed and why

Please ensure your code follows the existing style and TypeScript best practices.

## License

MIT License — see [LICENSE](LICENSE) for details.

---

**Remembra** — Because your brain deserves an intelligent learning system, not random flashcards.

