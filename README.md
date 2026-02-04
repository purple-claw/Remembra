# Remembra

**Master anything with the 1-4-7 Memory Retention System**

A scientifically-backed spaced repetition app built with React Native, Expo, and Supabase. Uses AI to enhance your learning with summaries, quizzes, flashcards, and more.

## Features

- **1-4-7 Spaced Repetition Algorithm**: Review on Day 1, Day 4, Day 7, then Day 30+ for optimal retention
- **Rich Content Support**: Text, markdown, code blocks, flashcards, and flowcharts
- **AI-Powered Learning**: 
  - Auto-generate summaries
  - Create quizzes
  - Generate flashcards
  - Build flowcharts
  - AI study assistant
- **Smart Notifications**: Reminders at your optimal study time
- **Progress Tracking**: Streaks, statistics, calendar heatmap
- **Beautiful UI**: Glassmorphism, smooth animations, dark mode

## Tech Stack

### Frontend
- **React Native + Expo** - Cross-platform (iOS, Android, Web)
- **Expo Router** - File-based routing
- **Zustand** - State management
- **React Native Reanimated** - Smooth animations

### Backend
- **Supabase** - PostgreSQL database, Auth, Realtime, Edge Functions
- **Row Level Security** - Secure data access

### AI Integration
- **Groq API** - Primary AI provider (1M tokens/min free)
- **Cohere API** - Fallback provider

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (for development)
- Supabase account
- Groq API key (free at https://console.groq.com)
- Cohere API key (free trial at https://cohere.com)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Remembra
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   
   a. Create a new project at https://supabase.com
   
   b. Run the database schema:
   - Go to SQL Editor in Supabase Dashboard
   - Copy and paste content from `lib/schema_new.sql`
   - Execute the SQL
   
   c. Run the RPC functions:
   - Copy and paste content from `lib/rpc_functions_new.sql`
   - Execute the SQL

4. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key
   EXPO_PUBLIC_COHERE_API_KEY=your_cohere_api_key
   ```

5. **Start the development server**
   ```bash
   npx expo start
   ```

6. **Run on your device**
   - Scan the QR code with Expo Go app (iOS/Android)
   - Press `w` to run in web browser
   - Press `i` for iOS simulator (Mac only)
   - Press `a` for Android emulator

## Project Structure

```
app/                    # Expo Router screens
  (tabs)/              # Bottom tab navigation
    index.tsx          # Today/Home screen
    library.tsx        # Library with categories
    calendar.tsx       # Calendar view
    stats.tsx          # Statistics
  auth/                # Authentication screens
  item/                # Item detail screens
components/            # Reusable UI components
  ui/                  # Base UI components
  content/             # Content-specific components
constants/             # Theme, colors
contexts/              # React contexts (Auth)
lib/                   # Core services
  supabase.ts         # Supabase client
  database.ts         # Database service layer
  ai.ts               # AI service (Groq/Cohere)
  notifications.ts    # Notification system
  schema_new.sql      # Database schema
  rpc_functions_new.sql # PostgreSQL functions
store/                 # Zustand state management
types/                 # TypeScript type definitions
```

## Database Schema

The app uses a PostgreSQL database with the following main tables:

- **profiles** - User profiles (extends Supabase auth.users)
- **categories** - User-created categories
- **memory_items** - Learning items with spaced repetition tracking
- **reviews** - History of all review attempts
- **ai_content** - AI-generated content (summaries, quizzes, etc.)
- **notification_preferences** - User notification settings

## 1-4-7 Algorithm

The spaced repetition system uses optimal intervals:

- **Day 0**: Learn new material
- **Day 1**: First review (24 hours later)
- **Day 4**: Second review (96 hours later)
- **Day 7**: Third review (168 hours later)
- **Day 30**: Mastery check
- **Day 90**: Long-term retention

If you fail a review, it resets to Day 1. Success extends the interval.

## AI Features

All AI features use Groq as primary (fast, generous free tier) with Cohere as fallback:

- **Summarize**: Extract key points from any content
- **Generate Quiz**: Create multiple-choice questions
- **Create Flashcards**: Auto-generate front/back cards
- **Build Flowchart**: Visualize processes
- **Study Assist**: Ask questions about your content

## Free Tier Limits

This app is designed to run completely free:

- **Supabase**: 500MB database, 2GB bandwidth, 50K monthly active users
- **Groq**: 1M tokens/min, 14 requests/min (very generous)
- **Cohere**: Free trial with rate limits
- **Vercel**: Unlimited for hobby projects
- **Expo**: 30 builds/month free

## Contributing

Contributions are welcome! Please open an issue or submit a PR.

## License

MIT License - see LICENSE file

## Acknowledgments

- Built following the specifications in `main.json`
- Uses the scientifically-proven spaced repetition methodology
- Inspired by evidence-based learning techniques

