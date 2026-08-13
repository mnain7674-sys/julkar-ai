<h1 align="center">JOXIQ AI</h1>

<p align="center">
  <strong>Unified Cross-Platform AI Intelligence Platform for Web, Android, iOS, and Desktop</strong>
</p>

<p align="center">
  <a href="https://github.com/mnain7674/joxiq-ai">
    <img src="https://img.shields.io/badge/Platform-Cross--Platform-indigo.svg" alt="Platform" />
  </a>
  <a href="https://github.com/mnain7674/joxiq-ai">
    <img src="https://img.shields.io/badge/Framework-React%20%7C%20Expo-blue.svg" alt="Framework" />
  </a>
  <a href="https://github.com/mnain7674/joxiq-ai">
    <img src="https://img.shields.io/badge/Style-Tailwind%20CSS-black.svg" alt="Style" />
  </a>
</p>

---

## 🌟 Introduction

**JOXIQ AI** is a highly intelligent, premium AI chatbot companion, classroom suite, and adaptive learning assistant designed for multi-platform environments. Powered by the high-performance **Gemini API** and featuring custom AI agents, JOXIQ AI bridges the gap between conversational intelligence and modern academic workspace utilities.

---

## 🚀 Key Features

### 💻 Web Platform
- **Advanced Chat Interface**: Highly responsive, thread-based real-time chat with support for file attachments, code highlighting, and interactive agent selection.
- **AI Learning Platform**: Custom courses, quiz generation, automated roadmap generation, and performance analytics.
- **Educational Suite**: Lesson planning, syllabus building, homework graders, and real-time score assessment.
- **AI Language Coach**: Immersive audio/text speech coach with dynamic feedback loops across multiple difficulty levels.
- **Interactive Tools**: Built-in dynamic developer sandboxes, markdown format renderers, and workspace organization settings.
- **Admin Dashboard**: Comprehensive analytics panel for user logs, subscription rates, database health, and server telemetry.

### 📱 Mobile Platform (Expo / React Native)
- **Shared Authentication**: Connected to the same Firebase Authentication and Firestore database for unified accounts.
- **Universal Synchronization**: Real-time cross-device state and chat history persistence.
- **Native Experience**: Fully optimized view transitions, offline state caching, splash screen overlays, and adaptive icon setups.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Recharts (Data Visualizations)
- **Backend / API Proxy**: Express server with CJS transpilation via esbuild (production container safe)
- **Mobile**: Expo SDK, React Native, AsyncStorage, Native Firebase client integrations
- **AI Engine**: `@google/genai` (Gemini Flash & Omni-capable pipelines)
- **Persistence**: Firebase (Authentication & Cloud Firestore)

---

## 📂 Project Structure

```
├── api/                      # Vercel serverless functions & API entry points
├── mobile-app/               # React Native Expo mobile source code
│   ├── assets/               # Splash screen, adaptive icon, and launcher images
│   ├── src/                  # Firebase modules, screen components, and static structures
│   └── App.js                # Mobile application entry point
├── public/                   # Static web assets (manifest.json)
├── src/                      # React web application frontend
│   ├── components/           # Sub-modules (AboutPage, EducationalSuite, LanguageCoach, etc.)
│   ├── lib/                  # Library bindings (Firebase initialization)
│   ├── App.tsx               # Primary single-page web core
│   └── main.tsx              # Web entry point mount
├── server.ts                 # Full-stack Node/Express environment backend
├── firestore.rules           # Durable Cloud Firestore security declarations
└── package.json              # Build configurations & module specifications
```

---

## ⚡ Quick Start

### Web Application

1. **Install web dependencies**:
   ```bash
   npm install
   ```

2. **Run in development mode**:
   ```bash
   npm run dev
   ```

3. **Compile production build**:
   ```bash
   npm run build
   ```

### Mobile Application

1. **Navigate to the mobile app folder**:
   ```bash
   cd mobile-app
   ```

2. **Install mobile dependencies**:
   ```bash
   npm install
   ```

3. **Start the local Expo development server**:
   ```bash
   npx expo start
   ```

---

## 🛡️ License

Created and maintained by **Julkar Nain Mahi** (mnain7674@gmail.com). All rights reserved.
