# Remembra

A simple app to help you remember things. Because apparently, our brains need help these days.

## What is this?

Remembra is a memory training app built with React and TypeScript. It helps you create, review, and track your learning progress. Think of it as flashcards on steroids, but without the actual steroids.

## Features

- Create and organize memory items
- Review them with spaced repetition (fancy term for "remind you at the right time")
- Track your progress and streaks
- AI-powered suggestions (because who has time to think of good questions?)
- Calendar view to see what you need to review
- Statistics to make you feel good about your memory

## Tech Stack

- React with TypeScript (because JavaScript alone wasn't confusing enough)
- Vite for building (fast, or so they say)
- Tailwind CSS for styling (because writing CSS is so last century)
- Supabase for the database (cloud stuff, handles the backend)
- Capacitor for mobile (turns web app into phone app)

## Getting Started

### For Users

1. Download the app from wherever we put it
2. Sign up with your email
3. Start adding things you want to remember
4. Review them regularly - the app will remind you

### For Developers

1. Make sure you have Node.js installed (version 18 or higher, because why not?)
2. Clone this repo
3. Install dependencies: `npm install`
4. Set up your environment variables (see .env.example)
5. Run the development server: `npm run dev`
6. Open your browser and see the magic happen

## Environment Setup

Copy `.env.example` to `.env` and fill in your Supabase credentials. Don't forget the API keys, or nothing will work. And trust me, debugging that is not fun.

## Development

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build
- `npm run lint` - Check if your code is clean (it probably isn't)

For Android builds, see BUILD.md. It's a whole adventure involving Java, Android SDK, and Gradle. Good luck.

## Building for Production

Run `npm run build` and deploy the `dist` folder to any static hosting. Easy peasy.

For mobile, use Capacitor. More details in BUILD.md.

## Contributing

Found a bug? Want to add a feature? Great! But please, make sure your code doesn't break everything. We have tests... somewhere.

1. Fork the repo
2. Create a branch
3. Make your changes
4. Test them (please)
5. Submit a pull request

## License

MIT License. Do whatever you want, but don't blame us if it breaks.

---

Remember, this app is for learning. If you forget how to use it, well, that's ironic.
