# Remembra# Remembra

Another reminders app. Because the world definitely needed one more. Built with React Native and Expo because we love suffering through native build errors.

## Features (That Hopefully Work)

- **UI**: It uses glassmorphism and fancy gradients. Because apparently, we're still doing that.
- **Supabase**: The backend. It automagically handles things so I don't have to write raw SQL.
- **State Management**: Zustand. Because Redux is too much boilerplate and React Context is "slow" (or so I read on Twitter).
- **Animations**: Things move. Sometimes even smoothly. Thanks, Reanimated.
- **Notifications**: It pings you. Try not to ignore it like your real responsibilities.

## The Stack

- **React Native / Expo**: The "write once, debug everywhere" dream.
- **TypeScript**: Because `any` is a crime, mostly.
- **Supabase**: Like Firebase, but the cool kids use it.

## Prerequisites

- **Node.js**: The newer the better, until it breaks `node-gyp`.
- **Expo Go**: Unless you actually enjoy staring at Xcode/Android Studio loading screens.

## Installation

1.  **Clone it**
    You know the drill.
    ```bash
    git clone <repository-url>
    cd Remembra
    ```

2.  **Install dependencies**
    Go grab a coffee. Maybe two. `node_modules` is heavy.
    ```bash
    npm install
    # or yarn, if you're feeling fancy
    ```

3.  **Environment Setup**
    Yes, you actually need this. Create a `.env` file. Don't commit it.
    ```env
    EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

## Usage

Start the thing:
```bash
npx expo start
```

Then scan the QR code. If it doesn't work, try turning it off and on again. That usually fixes 90% of Expo issues.

## Project Structure

- **app/**: Where the routing magic happens.
- **assets/**: Images and fonts we probably stole from a free asset pack.
- **components/**: Pieces of UI glued together.
- **lib/**: Helper functions used in one place and never touched again.

## Contributing

Found a bug? Keep it to yourself. Just kidding, PRs are welcome. Please don't break the build, CI is judging you.
