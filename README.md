# Tic Tac Toe - Real-Time Multiplayer Game

## Setup and Installation

### Backend Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd multiplayer_tic_tac_toe
   ```

2. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

3. **Install TypeScript dependencies:**
   ```bash
   npm install
   ```

4. **Compile TypeScript to JavaScript:**
   ```bash
   npx tsc
   ```
   This creates `build/index.js` from the TypeScript source files.

5. **Start all services with Docker Compose:**
   ```bash
   docker-compose up --build nakama
   ```

   This starts three containers:
   - **PostgreSQL** (port 5432): Database
   - **TensorFlow Serving** (port 8501): AI model server
   - **Nakama** (ports 7349, 7350, 7351): Game server

6. **Verify backend is running:**
   - Nakama Console: http://localhost:7351
   - Default credentials: `admin` / `password`
   - HTTP API: http://localhost:7350
   - gRPC API: port 7349

7. **Check logs:**
   ```bash
   docker-compose logs -f nakama
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   
   Edit `frontend/.env`:
   ```env
   # For local development
   VITE_NAKAMA_HOST=localhost
   VITE_NAKAMA_PORT=7350
   VITE_NAKAMA_KEY=defaultkey
   VITE_NAKAMA_USE_SSL=false
   ```

   For EC2 deployment, edit `frontend/.env`:
   ```env
   # For EC2 deployment (HTTP only)
   VITE_NAKAMA_HOST=your-ec2-ip-address
   VITE_NAKAMA_PORT=7350
   VITE_NAKAMA_KEY=defaultkey
   VITE_NAKAMA_USE_SSL=false
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   - Open http://localhost:5173 in your browser

6. **Build for production:**
   ```bash
   npm run build
   ```
   Output will be in `frontend/dist/`

## Architecture & Design Decisions

### Backend Architecture

**Technology Stack:**
- **Nakama Server**: Open-source game server (v3.x)
- **PostgreSQL**: Database for persistent storage
- **TensorFlow Serving**: AI model server for opponent
- **TypeScript**: Server-side game logic
- **Docker**: Containerization

**Key Design Decisions:**

1. **Authoritative Server**: All game logic runs on the server to prevent cheating
2. **WebSocket Communication**: Real-time bidirectional communication using opcodes
3. **Match-Based Architecture**: Each game is an isolated match with its own state
4. **Storage Collections**: 
   - `profiles`: Player stats (wins, losses, score)
   - `match_history`: Recent game results
5. **Leaderboard**: Sorted set based on player scores

**OpCodes (Message Types):**
```typescript
START = 1          // Game round starting
UPDATE = 2         // Move update
DONE = 3           // Game completed
MOVE = 4           // Player move (client → server)
REJECTED = 5       // Move rejected
OPPONENT_LEFT = 6  // Opponent disconnected
INVITE_AI = 7      // Request AI opponent
```

### Frontend Architecture

**Technology Stack:**
- **React 19**: UI framework
- **Tailwind CSS 4**: Styling
- **Vite**: Build tool
- **Nakama JS SDK**: WebSocket client

**Key Design Decisions:**

1. **Pure React**: Maintainable code
2. **Component-Based**: Each screen is a separate component
3. **Scene-Based Routing**: Simple state-based navigation
4. **Early Message Capture**: Prevents race conditions with WebSocket messages
5. **Responsive Design**: Mobile-first approach with Tailwind 

**State Management:**
- Local component state with `useState`
- Refs (`useRef`) for WebSocket callback values
- Props for component communication
- Nakama SDK for server state synchronization

## Deployment Process (EC2)

### Backend Deployment (Docker on EC2)

1. **Launch EC2 Instance:**
   - AMI: Ubuntu 22.04 LTS
   - Instance Type: t2.micro 
   - Storage: 8GB minimum
   - Security Group: Open ports 22, 7349, 7350, 7351

2. **Connect to EC2:**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```

3. **Install Docker and Docker Compose:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   sudo apt install -y docker.io
   sudo systemctl start docker
   sudo systemctl enable docker
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   
   # Add user to docker group
   sudo usermod -aG docker $USER
   ```
   
   Log out and back in for group changes to take effect.

4. **Transfer backend files:**
   ```bash
   # From your local machine
   rsync -avz --exclude 'node_modules' --exclude '.git' \
     -e "ssh -i your-key.pem" \
     ./backend/ ubuntu@your-ec2-ip:~/backend/

     # OR Git Clone Repo
     git clone https://github.com/IJPenguin/multiplayer_tic_tac_toe
   ```

5. **Build and start services on EC2:**
   ```bash
   cd ~/backend
   npm install
   npx tsc
   docker-compose up -d 
   ```

6. **Verify deployment:**
   ```bash
   docker-compose ps
   docker-compose logs -f nakama
   ```

7. **Access Nakama Console:**
   - http://your-ec2-ip:7351

### Frontend Deployment (Nginx on EC2)

1. **Install Nginx:**
   ```bash
   sudo apt install -y nginx
   ```

2. **Build frontend locally:**
   ```bash
   cd frontend
   npm run build
   ```

3. **Transfer build files to EC2:**
   ```bash
   rsync -avz --delete \
     -e "ssh -i your-key.pem" \
     dist/ ubuntu@your-ec2-ip:/var/www/html/

     # or git clone 
     git clone https://github.com/IJPenguin/multiplayer_tic_tac_toe
   ```

4. **Configure Nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/default
   ```

   Add this configuration:
   ```nginx
   server {
        listen 80;
        server_name _;

        root /home/ubuntu/multiplayer_tic_tac_toe/frontend/dist;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }
    }   
   ```

5. **Restart Nginx:**
   ```bash
   sudo systemctl restart nginx
   sudo systemctl enable nginx
   ```

6. **Access the application:**
   - http://your-ec2-ip

### Important Notes

 **HTTP Only Deployment**: Both frontend and backend are deployed using HTTP (not HTTPS). This is suitable for development/testing but NOT recommended for production.

For production, you should:
- Set up SSL certificates (Let's Encrypt)
- Configure HTTPS for both frontend and backend
- Update `VITE_NAKAMA_USE_SSL=true` in frontend `.env`
- Use a domain name instead of IP address

## API/Server Configuration

### Nakama Server Configuration

**File**: `backend/local.yml`

```yaml
console:
  max_message_size_bytes: 409600  # 400KB max console message

logger:
  level: "DEBUG"  # Change to "INFO" for production

runtime:
  js_entrypoint: "build/index.js"  # Compiled TypeScript entry point

session:
  token_expiry_sec: 7200  # 2 hours session expiry

socket:
  max_message_size_bytes: 4096      # 4KB max WebSocket message
  max_request_size_bytes: 131072    # 128KB max request
  allowed_origins:
    - "*"  # Allow all origins (restrict in production)
```

### Environment Variables

**Backend** (via `docker-compose.yml`):
```yaml
POSTGRES_DB: nakama
POSTGRES_PASSWORD: localdb
MODEL_NAME: ttt  # TensorFlow model name
```

**Frontend** (`.env`):
```env
VITE_NAKAMA_HOST=your-server-ip
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_KEY=defaultkey
VITE_NAKAMA_USE_SSL=false
```

### API Endpoints

**HTTP API** (port 7350):
- `POST /v2/account/authenticate/device` - Guest authentication
- `POST /v2/account/authenticate/email` - Email authentication
- `POST /v2/rpc/find_match_js` - Find/create match
- `POST /v2/rpc/get_profile_js` - Get player profile
- `POST /v2/rpc/get_leaderboard_js` - Get leaderboard
- `POST /v2/rpc/get_match_history_js` - Get match history
- `POST /v2/rpc/update_username_js` - Update username

**WebSocket** (port 7350):
- Match data messages (opcodes 1-7)
- Real-time game state updates

**Console** (port 7351):
- Admin dashboard
- API explorer
- Database viewer

## Testing Multiplayer Functionality

### Local Testing (Two Browser Windows)

1. **Start backend and frontend:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   docker-compose up

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Open two browser windows:**
   - Window 1: http://localhost:5173
   - Window 2: http://localhost:5173 (incognito/private mode)

3. **Test flow:**
   - Both windows: Click "Play as Guest"
   - Both windows: Click "PLAY" → "Classic Mode"
   - Wait for matchmaking to pair you
   - Play the game!

### Testing with a Friend

1. **Share your EC2 public IP:**
   - Example: http://13.201.228.206

2. **Both players:**
   - Open the URL in browser
   - Click "Play as Guest" or create accounts
   - Click "PLAY" → "Classic Mode"
   - Wait for matchmaking

3. **Test scenarios:**
   - **Classic Mode**: Real-time PvP
   - **AI Mode**: Play against AI
   - **Profile**: Check stats after games
   - **Leaderboard**: See rankings

### Testing AI Mode

1. Open the application
2. Click "Play as Guest"
3. Click "PLAY" → "AI Mode"
4. Game starts immediately with AI opponent
5. AI makes moves automatically
