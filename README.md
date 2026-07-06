# MMS: A Web-Based Guide in Learning Video Editing
## Full Stack Setup Guide

---

## 📦 Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router v6, Axios |
| Backend | Node.js, Express.js |
| Database | MySQL 8+ |
| File Storage | Cloudinary |
| AI | Anthropic Claude API |
| Email | Gmail SMTP via Nodemailer |
| Auth | JWT + bcrypt |

---

## 🗂️ Project Structure
```
mms-system/
├── backend/
│   ├── config/
│   │   ├── db.js            # MySQL connection pool
│   │   ├── cloudinary.js    # Cloudinary + multer config
│   │   └── schema.sql       # Full database schema + seed data
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── chapterController.js
│   │   ├── quizController.js
│   │   ├── activityController.js
│   │   ├── peerController.js
│   │   └── aiController.js
│   ├── middleware/
│   │   └── auth.js          # JWT protect, instructorOnly, studentOnly
│   ├── routes/
│   │   └── index.js         # All API routes
│   ├── server.js            # Express app entry point
│   ├── package.json
│   └── .env.example         # Copy to .env and fill in
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.js       # Global auth state
    │   ├── services/
    │   │   └── api.js               # All Axios API calls
    │   ├── components/shared/
    │   │   ├── InstructorLayout.js  # Sidebar + topbar
    │   │   └── StudentLayout.js
    │   ├── pages/
    │   │   ├── LoginPage.js
    │   │   ├── ForgotPassword.js
    │   │   ├── ResetPassword.js
    │   │   ├── instructor/
    │   │   │   ├── Dashboard.js
    │   │   │   ├── LearningLessons.js
    │   │   │   ├── CreateAssessment.js
    │   │   │   ├── StudentList.js
    │   │   │   ├── AccountManagement.js
    │   │   │   ├── PeerEvalSetup.js
    │   │   │   └── InstructorProfile.js
    │   │   └── student/
    │   │       ├── Dashboard.js
    │   │       ├── StudyLessons.js
    │   │       ├── StudentProfile.js
    │   │       ├── TakeAssessment.js
    │   │       ├── AIAssistant.js
    │   │       ├── PeerEvaluation.js
    │   │       └── UploadActivities.js
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    └── package.json
```

---

## 🚀 Setup Instructions

### Step 1 — Prerequisites
- Node.js v18+
- MySQL 8+
- Cloudinary account (free tier is fine)
- Gmail account with App Password enabled
- Anthropic API key

### Step 2 — Database Setup
```bash
# Log into MySQL
mysql -u root -p

# Run the schema
SOURCE /path/to/mms-system/backend/config/schema.sql;
```

### Step 3 — Backend Setup
```bash
cd mms-system/backend

# Copy and fill in environment variables
cp .env.example .env
nano .env   # Fill in all values

# Install dependencies
npm install

# Start development server
npm run dev
# Server runs at http://localhost:5000
```

### Step 4 — Frontend Setup
```bash
cd mms-system/frontend

# Install dependencies
npm install

# Start React dev server
npm start
# App runs at http://localhost:3000
```

---

## 🔑 Environment Variables (.env)

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=mms_db

# JWT
JWT_SECRET=your_random_secret_64_chars
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3001

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Gmail SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=youremail@gmail.com
EMAIL_PASS=your_app_password   # Gmail App Password
EMAIL_FROM="MMS System <youremail@gmail.com>"

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 📋 Gmail App Password Setup
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Go to App Passwords → Generate
4. Use that password as `EMAIL_PASS`

---

## 🏗️ Production Deployment

### Build React
```bash
cd frontend
npm run build
```

### Set NODE_ENV=production in backend .env
The Express server will automatically serve the React build.

### Deploy options
- **VPS** (DigitalOcean, Linode): Use PM2 for Node + Nginx reverse proxy
- **Railway**: Connect GitHub, set env vars, deploy both services
- **Render**: Free tier works for both Node API and static React

---

## 👤 Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Instructor | instructor@ccs.edu | admin123 |
| Student (demo) | juan@ccs.edu | ccs2024! |

All student accounts imported via Excel use `ccs2024!` as default password.

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login (returns JWT) |
| POST | /api/auth/forgot-password | Send reset email |
| POST | /api/auth/reset-password | Reset with token |
| PUT | /api/auth/change-password | Change password |
| GET | /api/auth/me | Get current user |

### Users / Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | Get all students (instructor) |
| PUT | /api/users/profile | Update profile |
| PUT | /api/users/avatar | Upload avatar |
| PUT | /api/users/:id/score | Update student score |
| POST | /api/users/import | Import Excel roster |

### Chapters
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/chapters | Get all 6 chapters |
| PUT | /api/chapters/:id | Update chapter content |
| POST | /api/chapters/video | Upload video (Cloudinary) |
| DELETE | /api/chapters/video/:id | Delete video |
| POST | /api/chapters/progress | Mark chapter complete |

### Quiz
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/quiz | Get all questions (randomized) |
| POST | /api/quiz | Create question |
| DELETE | /api/quiz/:id | Remove question |
| POST | /api/quiz/attempt/start | Start quiz attempt |
| POST | /api/quiz/attempt/submit | Submit answers & get score |

### Activities & Submissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/activities | Get activity files |
| POST | /api/activities/upload | Upload activity file |
| POST | /api/activities/submit | Student submits work |
| GET | /api/activities/submissions | View all submissions |
| PUT | /api/activities/submissions/:id/grade | Grade submission |

### Peer Evaluation
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/peer | Get all groups |
| POST | /api/peer | Create group |
| PUT | /api/peer/:id | Update group |
| DELETE | /api/peer/:id | Delete group |
| POST | /api/peer/evaluate | Submit peer ratings |
| GET | /api/peer/results | View all results |

### AI Assistant
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/ai/chat | Chat with Claude AI |
| GET | /api/ai/history | Get chat history |
| POST | /api/ai/video-question | Generate video-based question |
| DELETE | /api/ai/history | Clear chat history |

---

## 🎨 Color Palette
```css
--wine:  #5f3333   /* Primary dark wine */
--wine2: #675c5c   /* Muted wine */
--rose:  #856f6c   /* Rose gray */
--brown: #645c54   /* Warm brown */
--cream: #d1cabe   /* Cream (default avatar bg) */
--bg:    #ece8e1   /* Page background */
```
