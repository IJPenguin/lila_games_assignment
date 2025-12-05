# Tic Tac Toe - React Frontend

A modern, responsive Tic Tac Toe game built with React and Tailwind CSS, featuring real-time multiplayer via Nakama game server.

## 🎮 Features

- **Real-time Multiplayer**: Play against other players in real-time
- **AI Opponent**: Practice against an AI opponent
- **User Profiles**: Track your stats, wins, losses, and match history
- **Global Leaderboard**: Compete with players worldwide
- **Responsive Design**: Works perfectly on mobile, tablet, and desktop
- **Guest Mode**: Play without creating an account
- **Email Authentication**: Create an account to save your progress

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── Login.jsx       # Authentication
│   │   ├── Mainmenu.jsx    # Main menu + leaderboard
│   │   ├── Selection.jsx   # Game mode selection
│   │   ├── Matchmaking.jsx # Finding opponents
│   │   ├── Game.jsx        # Game board
│   │   └── Profile.jsx     # User profile
│   ├── App.jsx             # Main app with routing
│   ├── nakama.js           # Nakama client
│   ├── config.js           # Configuration
│   └── main.jsx            # Entry point
├── .env                     # Environment variables
└── package.json
```

## 🔧 Configuration

Create or update `.env` file:

```env
# Nakama Server Configuration
VITE_NAKAMA_HOST=your-server-ip
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_KEY=defaultkey
VITE_NAKAMA_USE_SSL=false
```

## 🎨 Tech Stack

- **React 19** - UI framework
- **Tailwind CSS 4** - Styling
- **Vite** - Build tool
- **Nakama JS SDK** - Real-time multiplayer
- **UUID** - Unique identifiers

## 📱 Responsive Design

The app is fully responsive and works on:
- 📱 Mobile (320px+)
- 📱 Tablet (640px+)
- 💻 Desktop (1024px+)
- 🖥️ Large screens (1920px+)

## 🎯 Game Modes

### Classic Mode
- Play against real players
- Matchmaking system finds opponents
- Real-time gameplay

### AI Mode
- Play against AI opponent
- Instant matchmaking
- Great for practice

## 👤 User Features

### Guest Mode
- Play without account
- Stats not saved
- Quick start

### Registered Users
- Email/password authentication
- Persistent stats and history
- Global leaderboard ranking
- Customizable username

## 🏆 Leaderboard

- Top 5 players displayed on main menu
- Ranked by score
- Updates in real-time
- Medal icons for top 3

## 📊 Profile Stats

Track your performance:
- Total score
- Wins / Losses / Draws
- Recent match history
- Score changes per match

## 🔐 Security

- Passwords hashed on server
- Secure WebSocket connections
- Environment variables for sensitive data
- No credentials stored in frontend

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy Options

**Vercel** (Recommended)
```bash
vercel --prod
```

**Netlify**
```bash
netlify deploy --prod
```

**Docker**
```bash
docker build -t tictactoe-frontend .
docker run -p 80:80 tictactoe-frontend
```

## 🐛 Troubleshooting

### Can't connect to Nakama
1. Check `.env` configuration
2. Verify Nakama server is running
3. Check firewall/security group settings
4. Ensure CORS is configured on server

### White screen on load
1. Check browser console for errors
2. Verify all dependencies are installed
3. Clear browser cache
4. Try `npm run build` and check for errors

### Game not updating
1. Check WebSocket connection in Network tab
2. Verify Nakama server is responding
3. Check for JavaScript errors in console

## 📝 Development

### Code Style
- ESLint for linting
- Prettier for formatting (optional)
- React best practices

### State Management
- React hooks (useState, useEffect, useRef)
- Props for component communication
- Nakama SDK for server state

### Component Guidelines
- Functional components only
- Hooks for state and effects
- Tailwind for styling
- Responsive by default

## 🧪 Testing

```bash
# Run linter
npm run lint
```

## 📚 Documentation

- [MIGRATION.md](./MIGRATION.md) - Migration from Phaser to React
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md) - Detailed changes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🙏 Acknowledgments

- Nakama for the game server
- Heroic Labs for the JS SDK
- Tailwind CSS for the styling system
- React team for the amazing framework

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the documentation
3. Check browser console for errors
4. Verify server configuration

## 🎉 Have Fun!

Enjoy playing Tic Tac Toe with friends around the world!
