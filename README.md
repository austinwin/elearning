# Smart Math Tutor

**AI-assisted adaptive math tutor for children Pre-K through 5th Grade**

A complete, installable Progressive Web App (PWA) that helps children learn math with adaptive question generation, local progress tracking, and optional AI-powered questions via the DeepSeek API.

---

## Features

- 🎓 **Full Curriculum Coverage**: Pre-K through 5th Grade across 12 math domains
- 🤖 **AI-Powered Questions**: Optional DeepSeek API integration for dynamic question generation
- 📱 **Installable PWA**: Works offline, installs on iPad, iPhone, Android, and desktop
- 📊 **Parent Dashboard**: Track progress, accuracy by domain, mastery levels, and suggested focus areas
- ⭐ **Kid-Friendly Scoring**: Star-based motivation system with no negative feedback
- 🧠 **Adaptive Difficulty**: Questions adjust based on the child's actual performance
- 🔒 **Privacy-First**: All data stored locally on device. No backend, no tracking.
- ♿ **Accessible**: Semantic HTML, ARIA labels, keyboard support, screen reader friendly
- 🎨 **Responsive Design**: Works on all screen sizes from phones to desktops
- 🔊 **Read Aloud**: Text-to-speech for questions and choices

---

## Quick Start

### Option 1: Open Directly

Open `index.html` in a modern browser. For full PWA features (service worker, offline mode), serve via a local static server.

### Option 2: Local Static Server (Recommended)

```bash
# Using Python 3
python3 -m http.server 8000

# Using npx
npx serve .

# Using PHP
php -S localhost:8000
```

Then open **http://localhost:8000** in your browser.

### Option 3: Host as Static Site

Upload all files to any static hosting service:
- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- Any static file server (nginx, Apache, etc.)

No build step or backend required.

---

## Adding to iPad/iPhone Home Screen

1. Open the app in **Safari** on your iPad or iPhone
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it (e.g., "Math Tutor") and tap **Add**
5. The app will now appear on your home screen and work like a native app, including offline!

For Android: Open in Chrome → Menu → "Add to Home Screen"

---

## Setting Up the DeepSeek API Key

The app works fully offline with built-in questions. For AI-generated questions:

1. Go to [platform.deepseek.com](https://platform.deepseek.com)
2. Sign up and get your API key
3. Open the app → tap the ⚙️ gear icon (top-right)
4. Enter your API key in the "AI Settings" section
5. Click **Save Settings**
6. Toggle "Use AI Questions" to ON

> 🔒 **Privacy Note**: Your API key is stored only on your device in localStorage. It is never sent anywhere except directly to the DeepSeek API. This is convenient for personal use but less secure than a backend proxy.

---

## How It Works

### Kid Mode
The child sees:
- Their name and grade level
- A math question with large, friendly text
- Answer input (numeric, multiple choice, or true/false)
- Hint and Read Aloud buttons
- Stars earned and current streak
- Encouraging feedback (never negative)
- Daily progress bar

### Parent Mode
Parents can:
- Enter/clear the API key
- Set the child's nickname and grade level
- Toggle AI and sound settings
- View the dashboard with detailed statistics
- Export/Import progress as JSON
- Reset all progress (with confirmation)

### Adaptive Learning
The app tracks:
- Every question attempt
- Skill-level mastery (hidden from child)
- Domain-level progress
- Daily practice records
- Streaks and stars

Questions are selected based on:
- Weakest domain (prioritized)
- Least recently practiced domain
- Recent performance (3 correct → harder; 2 wrong → easier)
- Overall accuracy (low accuracy → foundational skills)
- Grade-level appropriate content

### Mastery Levels
| Score | Label | Description |
|-------|-------|-------------|
| 0-29  | Needs Support | Extra practice needed |
| 30-59 | Practicing | Building skills |
| 60-79 | Improving | Getting stronger |
| 80-100| Strong | Confident in this area |

---

## Curriculum Coverage

### Pre-K
Counting 1-10, number recognition, comparing quantities, basic shapes, simple patterns

### Kindergarten
Counting to 20, addition/subtraction within 5, comparing numbers, 2D shapes, patterns

### 1st Grade
Addition/subtraction within 20, place value (tens/ones), time, money recognition, 2D/3D shapes

### 2nd Grade
Addition/subtraction within 100, hundreds/tens/ones, skip counting, time to 5 minutes, money, fractions (halves/thirds/fourths)

### 3rd Grade
Multiplication facts, division basics, area, perimeter, fractions on number line, time intervals

### 4th Grade
Multi-digit operations, division with remainders, equivalent fractions, decimals, angles, measurement conversion

### 5th Grade
Multi-digit multiplication/division, unlike denominator fractions, decimals, volume, coordinate plane, order of operations

### Domains Covered
1. Counting and Cardinality
2. Operations and Algebraic Thinking
3. Number Sense and Place Value
4. Measurement
5. Time
6. Money
7. Geometry
8. Data and Graphs
9. Fractions
10. Decimals
11. Patterns
12. Word Problems

---

## Technical Architecture

### Files
| File | Purpose |
|------|---------|
| `index.html` | Main HTML structure with kid/parent mode markup |
| `styles.css` | Complete responsive stylesheet with CSS custom properties |
| `app.js` | Main application logic, UI management, scoring |
| `db.js` | IndexedDB layer for storing attempts, progress, and sessions |
| `ai.js` | DeepSeek API integration with fallback to local generator |
| `curriculum.js` | Local question generator with full grade-level templates |
| `manifest.json` | PWA manifest for installation |
| `sw.js` | Service worker for offline caching |

### Data Storage
- **localStorage**: Settings (API key, grade, child name, theme, sound)
- **IndexedDB**: Question attempts, skill progress, daily practice, sessions

### Offline Support
- Service worker caches all static assets
- Local question generator provides unlimited offline questions
- Progress saves locally and syncs when needed
- "Offline Practice" badge shown when disconnected

### Browser Support
- Chrome 80+
- Safari 13+ (iOS/iPadOS)
- Firefox 80+
- Edge 80+
- Samsung Internet

---

## Privacy

- **No data leaves your device** except API calls to DeepSeek (if configured)
- No analytics, no tracking, no cookies
- No account required
- All progress stored in your browser's IndexedDB
- Export/Import gives you full control over your data
- No external CDN dependencies

---

## Limitations

- API key stored in localStorage (not encrypted at rest)
- No multi-child profiles (single child per device)
- No cloud sync between devices
- Speech synthesis quality varies by browser/OS
- Question generation quality depends on API response format compliance
- IndexedDB has storage limits (typically 50MB+ per origin, sufficient for years of use)

---

## Future Improvement Ideas

- [ ] Multi-child profiles with switching
- [ ] Optional backend for encrypted API key proxy
- [ ] Visual shape/number rendering for younger children
- [ ] Sound effects for correct answers
- [ ] Printable progress reports
- [ ] Timed practice mode
- [ ] Achievement badges system
- [ ] More languages for questions
- [ ] Handwriting recognition for answer input
- [ ] iCloud/Google Drive sync for progress backup

---

## License

This project is provided for educational and personal use.

---

**Smart Math Tutor** · Helping kids love math, one question at a time 🌟
