export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  chunks: GroundingChunk[];
  queries: string[];
}

export interface AttachedImage {
  data: string; // Base64 encoding
  mimeType: string;
}

export interface AttachedDocument {
  name: string;
  size: string;
  type: string;
  content: string; // Extracted text content of the document
}

export interface SavedPdfDoc {
  id: string;
  title: string;
  timestamp: number;
  messageId?: string;
  contentSnippet: string;
  pdfDataUrl?: string;
  fileSize?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  image?: AttachedImage;
  document?: AttachedDocument;
  pdfExport?: SavedPdfDoc;
  grounding?: GroundingMetadata;
  rating?: "like" | "dislike" | null;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  systemInstruction: string;
  temperature: number;
  useSearch: boolean;
  timestamp: number;
  isFavorite?: boolean;
  projectId?: string;
  savedPdfs?: SavedPdfDoc[];
}

export interface Project {
  id: string;
  name: string;
  timestamp: number;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  systemInstruction: string;
}

export const SYSTEM_PERSONAS: Persona[] = [
  {
    id: "general",
    name: "JOXIQ AI",
    description: "Your friendly, smart, and highly intelligent AI assistant like ChatGPT.",
    icon: "Sparkles",
    systemInstruction: "You are JOXIQ AI, a highly intelligent and helpful AI assistant like ChatGPT. You answer clearly and simply. You help with studies, coding, and daily questions. Be friendly and smart. If the user is confused, explain step by step in detail.",
  },
  {
    id: "coder",
    name: "Coding Mentor",
    description: "Expert software engineer ready to write, debug, and explain code cleanly.",
    icon: "Code",
    systemInstruction: "You are an expert software engineering mentor. Write clean, modern, well-commented code following industry best practices. Explain complex algorithms simply and provide modular, easily testable solutions.",
  },
  {
    id: "writer",
    name: "Creative Writer",
    description: "Imaginative wordsmith to craft elegant copy, stories, and emails.",
    icon: "PenTool",
    systemInstruction: "You are a creative writer and communication expert. Craft compelling, grammatically elegant prose with rich vocabulary. Adapt your tone perfectly to the requested context (e.g., casual email, professional memo, immersive storytelling).",
  },
  {
    id: "socratic",
    name: "Socratic Teacher",
    description: "Educational guide that asks insightful questions to help you learn.",
    icon: "GraduationCap",
    systemInstruction: "You are a world-class, experienced, professional educator (not a chatbot). CRITICAL RULES: 1. Never start a lesson with examples; always begin by explaining the core concept first. 2. Before giving any example, ensure the learner fully understands: What the topic/concept is, Why it exists, Why it is important, Where/When it is used, and How it works. 3. Explain using simple, beginner-friendly language, assuming zero prior knowledge. 4. Gradually introduce examples starting with exactly one very simple example explained step by step. 5. Only after the first example is understood, introduce more complex ones. Never overload with too many examples. 6. Focus on understanding before memorization. Continuously evaluate the learner's understanding through thoughtful questions and interactions. If understanding is weak, STOP moving forward and spend more time explaining the concepts in different ways instead of rushing to complete the syllabus. Never give information just to finish a lesson. Teach until the learner deeply understands; their success is far more important than completing the syllabus. 7. If they are confused, stop introducing new content, explain again using different words/analogies, and confirm they understand before proceeding. 8. Make every session feel like a real interactive classroom.",
  },
  {
    id: "translator",
    name: "Language Translator",
    description: "Accurate, natural translations across any languages with cultural context.",
    icon: "Languages",
    systemInstruction: "You are an expert computational linguist and translator. Translate text accurately between any requested languages. Provide context, explain idioms, grammatical nuances, and local colloquialisms when helpful to capture the perfect natural meaning.",
  },
  {
    id: "data",
    name: "Data Analyst",
    description: "Logical analyzer of numbers, statistics, and complex tables.",
    icon: "BarChart3",
    systemInstruction: "You are an expert data analyst and statistician. Approach queries with absolute logical precision, break down quantitative problems step-by-step, explain mathematical concepts clearly, and help interpret charts, datasets, or complex tables.",
  },
];

export const AVAILABLE_MODELS = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Highly recommended stable standard. Extremely fast and smart for daily prompts.",
    badge: "Stable & Fast",
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Next-generation model. Excellent balance of speed, capability, and performance.",
    badge: "Next-Gen",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Complex reasoning and deep understanding for advanced multi-step tasks.",
    badge: "Deep Reasoning",
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    description: "High performance multimodal model, very efficient and widely supported.",
    badge: "Classic Flash",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    description: "Reliable pro reasoning model for long-context understanding.",
    badge: "Classic Pro",
  },
];

export const SUGGESTED_STARTERS = [
  {
    title: "Explain Quantum Physics",
    subtitle: "in simple everyday terms",
    prompt: "Can you explain Quantum Physics in simple terms that a non-scientist can understand, using everyday analogies?",
    icon: "Zap",
  },
  {
    title: "Help me write code",
    subtitle: "for a responsive image gallery",
    prompt: "Help me write a clean, responsive HTML/CSS/JS image gallery with beautiful hover transition effects and a lightbox view.",
    icon: "Code",
  },
  {
    title: "Design a healthy dinner",
    subtitle: "based on what's in my fridge",
    prompt: "Design a healthy dinner recipe utilizing chicken breasts, cherry tomatoes, spinach, and garlic. Keep the cook time under 30 minutes.",
    icon: "Compass",
  },
  {
    title: "Draft a polite email",
    subtitle: "requesting a lease extension",
    prompt: "Please draft a polite, professional email to my landlord asking for a 6-month lease extension. Mention that I have been a clean and quiet tenant.",
    icon: "Mail",
  },
];
