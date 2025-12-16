# BakuScan - Replit.md

## Overview

BakuScan is a Python Flask web application for identifying Bakugan toys from the original 2007-2012 run. The app uses browser-based camera access (WebRTC) for scanning and Groq AI (Llama 4 Scout Vision) for identification. Users can access it from any device's web browser without installing an app.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Type
- **Framework**: Python Flask web application
- **Frontend**: Server-rendered HTML templates with vanilla JavaScript
- **Camera Access**: WebRTC/getUserMedia for browser-based camera
- **Styling**: Custom CSS with dark theme, mobile-responsive design

### Backend Architecture
- **Server**: Flask running on Python 3.11
- **API Structure**: RESTful endpoints
  - `POST /api/analyze` - Main endpoint for Bakugan image analysis (accepts base64 image)
  - `GET /api/history` - Get user's scan history
- **AI Integration**: Groq API (Llama 4 Scout Vision) for image recognition
- **Session Management**: Flask sessions with secret key

### Data Storage
- **Storage**: In-memory Python dictionaries (session-based)
- **Catalog**: JSON file at `shared/bakugan_catalog.json` with 147 Bakugan entries
- **Note**: PostgreSQL database exists but connection times out from Python context - using in-memory storage as workaround

### Key Files
- `python_app/main.py` - Flask application entry point
- `python_app/templates/index.html` - Main scanning page
- `python_app/templates/history.html` - Scan history page
- `python_app/static/style.css` - Application styles
- `python_app/static/app.js` - Frontend JavaScript for camera and API
- `shared/bakugan_catalog.json` - Bakugan catalog data

### User Flow
1. User opens app in browser
2. Grants camera permission or uploads image
3. Captures/selects image
4. Image sent to `/api/analyze` as base64
5. Groq AI analyzes and identifies Bakugan
6. Results displayed with name, series, attribute, G-power, rarity
7. Scan saved to session history

## External Dependencies

### Third-Party Services
- **Groq API**: Llama 4 Scout Vision model for Bakugan image recognition (requires `GROQ_API_KEY` environment variable)

### Python Packages
- **flask**: Web framework
- **groq**: Official Groq SDK for AI vision API
- **python-dotenv**: Environment variable management
- **psycopg2-binary**: PostgreSQL driver (not currently used due to connection issues)

### Environment Variables Required
- `GROQ_API_KEY`: For Bakugan image analysis (Groq Llama 4 Scout Vision)
- `SESSION_SECRET`: Flask session secret key
- `PORT`: Server port (defaults to 5000)

## Development

### Running the App
```bash
cd python_app && PORT=5000 python main.py
```

### Project Structure
```
python_app/
  main.py           # Flask app with routes and AI integration
  templates/
    index.html      # Camera/scan page
    history.html    # Scan history page
  static/
    style.css       # Styles
    app.js          # Frontend JavaScript
shared/
  bakugan_catalog.json  # 147 Bakugan entries
```

### Features
- Browser camera access (mobile and desktop)
- Image upload from gallery
- AI-powered Bakugan identification
- Session-based scan history
- Dark theme with mobile-responsive design

### Known Issues
- PostgreSQL connection times out from Python context
- History is session-based (in-memory), cleared on server restart
