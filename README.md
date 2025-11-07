# RoadResQ

Voice-first AI IVR for highway emergencies. 100% client-side (HTML/CSS/JS).

## Features
- Web Speech API (STT/TTS)
- Rule-based NLU (intent + slot extraction)
- Incident logging with localStorage + CSV export (Papa Parse)
- Leaflet dark map with incident markers
- Glassmorphism UI with maroon accents and custom cursor
- Keyboard shortcuts and responsive design

## Getting Started
1. Open with Live Server (VS Code) or any static server.
2. Use Chrome/Edge over HTTPS for Speech APIs.
3. Click "Start Emergency Call" or press S to listen.

## Keyboard Shortcuts
- 1: Medical
- 2: Breakdown
- 3: Theft
- S: Start listening
- R: Reset dialog
- E: Export all incidents
- ?: Toggle help

## Testing Scenarios
- Medical: "There's been an accident on NH48, kilometer 245. Two people injured."
- Breakdown: "My car broke down near Gurgaon toll plaza. Engine overheating. Need a mechanic."
- Theft: "Someone stole my bag at a rest stop on NH16."
- Ambiguous: "Help! Something happened!" (reprompt expected)

## Notes
- Map geocoding is mocked in `modules/map-handler.js`.
- Speech gracefully degrades to text input.

## File Structure
```
roadresq/
├── index.html
├── styles.css
├── app.js
├── modules/
│   ├── dialog-manager.js
│   ├── nlu-engine.js
│   ├── incident-logger.js
│   ├── speech-handler.js
│   └── map-handler.js
├── assets/
│   ├── logo.svg
│   └── sounds/
│       ├── notification.mp3
│       └── success.mp3
└── README.md
```

## License
MIT


