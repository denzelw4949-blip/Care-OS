# Quick Start Guide for CARE OS

Since Node.js was just installed, you'll need to either restart your terminal or add it to PATH. Here's the easiest way to activate CARE OS:

## Option 1: Restart Terminal (Recommended)

1. Close this terminal window
2. Open a new terminal
3. Navigate to the project:
   ```bash
   cd /Users/denzelwilliams/.gemini/antigravity/playground/sonic-plasma
   ```
4. Run the setup script:
   ```bash
   ./setup.sh
   ```

## Option 2: Add Node to PATH Now

Run this command to add Node.js to your current session:

```bash
export PATH="/usr/local/bin:$PATH"
cd /Users/denzelwilliams/.gemini/antigravity/playground/sonic-plasma
./setup.sh
```

## What the Setup Script Does

The `setup.sh` script will automatically:
- ✅ Verify Node.js and npm are installed
- ✅ Install all npm dependencies
- ✅ Install and start PostgreSQL (via Homebrew)
- ✅ Install and start Redis (via Homebrew)
- ✅ Create the `care_os` database
- ✅ Run database migrations
- ✅ Start the CARE OS server at http://localhost:3000

## Manual Setup (If Script Doesn't Work)

If you prefer to do it manually, here are the individual steps:

### 1. Install Dependencies
```bash
npm install
```

### 2. Install PostgreSQL and Redis
```bash
brew install postgresql@14 redis
brew services start postgresql@14
brew services start redis
```

### 3. Create Database
```bash
createdb care_os
psql -d care_os -f src/database/schema.sql
```

### 4. Start Server
```bash
npm run dev
```

Server will be available at: **http://localhost:3000**

## API Endpoints Available

Once running, you can test these endpoints:

- `GET /health` - Health check
- `POST /api/checkins` - Submit check-in
- `GET /api/tasks` - Get tasks
- `POST /api/recognitions` - Send recognition

## Next Steps After Activation

1. **Test the API** using the admin dashboard or tools like Postman/curl
2. **Configure Slack** (optional) - Follow `docs/PLATFORM_SETUP.md`
3. **Add AI capabilities** (optional) - Add OpenAI or Gemini API key to `.env`

## Troubleshooting

**Issue**: `npm: command not found`
- **Solution**: Restart terminal or add to PATH: `export PATH="/usr/local/bin:$PATH"`

**Issue**: `createdb: command not found`
- **Solution**: Install PostgreSQL: `brew install postgresql@14`

**Issue**: Database connection error
- **Solution**: Make sure PostgreSQL is running: `brew services start postgresql@14`

---

**Need help?** Check the full documentation in `README.md` or `docs/` folder.
