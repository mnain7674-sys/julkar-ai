import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  GraduationCap,
  FileText,
  CheckCircle2,
  Target,
  Mic,
  MicOff,
  Image as ImageIcon,
  Camera,
  Brain,
  ChevronRight,
  HelpCircle,
  RefreshCw,
  Printer,
  Copy,
  Volume2,
  Play,
  Square,
  Check,
  X,
  BookOpen,
  AlertCircle,
  Upload,
  Plus,
  Award,
  BookMarked,
  Hourglass,
  Calendar,
  Flame,
  VolumeX,
  Languages
} from "lucide-react";
import Markdown from "react-markdown";

interface EducationalSuiteProps {
  theme: "dark" | "light";
  userProfile: { name: string; email: string } | null;
}

// Interfaces for Quiz
interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

// Interfaces for Goal Tracker
interface StudyGoal {
  id: string;
  title: string;
  durationDays: number;
  dailyMinutes: number;
  startDate: number;
  completedDays: number[]; // Array of day indices (e.g. [1, 2, 4])
  hoursStudied: number;
  plan: { day: number; topic: string; tasks: string[] }[];
}

export const EducationalSuite: React.FC<EducationalSuiteProps> = ({ theme, userProfile }) => {
  const [activeTab, setActiveTab] = useState<"teacher" | "exam" | "goals" | "voice" | "photo">("teacher");

  // ==========================================
  // COMMON API HELPER
  // ==========================================
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const callEducationAPI = async (prompt: string, jsonMode = false) => {
    setIsGenerating(true);
    setApiError(null);
    try {
      const res = await fetch("/api/education/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, jsonMode }),
      });
      if (!res.ok) {
        throw new Error("Failed to generate content from JOXIQ AI Engine");
      }
      const data = await res.json();
      return data.result;
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Something went wrong.");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  // ==========================================
  // 1. STUDY MODE AI STATE
  // ==========================================
  const [teacherTopic, setTeacherTopic] = useState("");
  const [teacherGrade, setTeacherGrade] = useState("High School");
  const [teacherLanguage, setTeacherLanguage] = useState("English");
  const [teacherExplanation, setTeacherExplanation] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [quizCurrentIndex, setQuizCurrentIndex] = useState(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);

  const handleTeacherExplain = async () => {
    if (!teacherTopic.trim()) return;
    const prompt = `You are a highly experienced, professional educator teaching the topic "${teacherTopic}" to a ${teacherGrade} student in ${teacherLanguage}. 

CRITICAL PEDAGOGICAL TEACHING RULES:
1. Never start explaining a topic with examples.
2. Always begin by explaining the core concept first in simple, beginner-friendly language, assuming zero prior knowledge.
3. Before giving any example, ensure the learner fully understands:
   - What the topic/concept is.
   - Why it exists.
   - Why it is important.
   - Where it is used.
   - When it is used.
   - How it works.
4. After explaining the concept thoroughly, gradually introduce examples.
5. Start with exactly one very simple, clear example.
6. Explain that example step by step and line by line/concept by concept.
7. Only after explaining the first example, introduce more examples with increasing difficulty. Never overload the learner with many examples at once.
8. Always focus on understanding before memorization.
9. Continuously evaluate the learner's understanding through thoughtful questions and interactive checkpoints. If understanding is weak, STOP moving forward and spend more time explaining the concepts in different ways instead of rushing to complete the syllabus.
10. Never give information just to finish a lesson. Teach until the learner genuinely and deeply understands. The learner's success is far more important than completing the syllabus.
11. If the concept is complex, stop introducing new items. Explain the concept again in different words, use a clear everyday analogy, or use a real-life situation.
12. This must feel like a real interactive classroom session taught by an excellent, patient teacher. Never rush.
Use clear headers, bullet points, and clean high-contrast Markdown formatting. Respond directly in ${teacherLanguage}.`;
    
    const explanation = await callEducationAPI(prompt);
    if (explanation) {
      setTeacherExplanation(explanation);
      setQuizQuestions(null); // Reset quiz
    }
  };

  const handleGenerateQuiz = async () => {
    const topic = teacherTopic.trim() || "General Science & Logic";
    const prompt = `Generate a high-quality 5-question multiple choice quiz about the topic "${topic}" for a ${teacherGrade} level student. 
    You must output exactly a JSON array containing 5 elements. Do not include any markdown styling like \`\`\`json or trailing comments. Output only valid JSON.
    Each element in the array must strictly match this TypeScript interface:
    {
      "question": "The text of the question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0, // 0-based index of the correct option
      "explanation": "Empathetic explanation of why this option is correct and others are incorrect."
    }`;

    const quizText = await callEducationAPI(prompt, true);
    if (quizText) {
      try {
        // Clean markdown wraps if the model returned them anyway
        const cleanJSON = quizText.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
        const parsed = JSON.parse(cleanJSON);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuizQuestions(parsed);
          setQuizCurrentIndex(0);
          setQuizSelectedOption(null);
          setQuizScore(0);
          setQuizAnswered(false);
          setQuizComplete(false);
        } else {
          throw new Error("Invalid format");
        }
      } catch (e) {
        setApiError("Failed to parse quiz JSON. Please try generating again.");
      }
    }
  };

  // ==========================================
  // 2. EXAM PAPER GENERATOR STATE
  // ==========================================
  const [examTopic, setExamTopic] = useState("");
  const [examGrade, setExamGrade] = useState("High School");
  const [examDifficulty, setExamDifficulty] = useState("Medium");
  const [includeMCQ, setIncludeMCQ] = useState(true);
  const [includeCQ, setIncludeCQ] = useState(true);
  const [includeShort, setIncludeShort] = useState(true);
  const [generatedExam, setGeneratedExam] = useState<string | null>(null);
  const [showExamAnswers, setShowExamAnswers] = useState(false);
  const [examSolutions, setExamSolutions] = useState<string | null>(null);

  const handleGenerateExam = async () => {
    if (!examTopic.trim()) return;
    const types: string[] = [];
    if (includeMCQ) types.push("Multiple Choice Questions (MCQ)");
    if (includeShort) types.push("Short Answer Questions (SAQ)");
    if (includeCQ) types.push("Creative Structured Questions (CQ) / Essay scenarios");

    const prompt = `Create an academic exam paper about "${examTopic}" for ${examGrade} level. 
    Difficulty level: ${examDifficulty}.
    The exam paper should include the following types of questions: ${types.join(", ")}.
    Format this beautifully like an official board exam paper. Add standard exam headers, margins, instructions, total marks, and timing.
    Use clear question numbers and mark values (e.g., "[5 Marks]").
    Do NOT include the answers yet. Respond in a highly professional academic tone.`;

    const exam = await callEducationAPI(prompt);
    if (exam) {
      setGeneratedExam(exam);
      setShowExamAnswers(false);
      setExamSolutions(null);
    }
  };

  const handleGetExamSolutions = async () => {
    if (!generatedExam) return;
    const prompt = `Based on this exam paper, provide a detailed Answer Key and step-by-step marking guideline solutions for all questions:
    
    === EXAM PAPER ===
    ${generatedExam}
    
    Output step-by-step model explanations and answers so the student can grade their performance. Keep it clear, precise, and educational.`;

    const solutions = await callEducationAPI(prompt);
    if (solutions) {
      setExamSolutions(solutions);
      setShowExamAnswers(true);
    }
  };

  // ==========================================
  // 3. GOAL TRACKER AI STATE
  // ==========================================
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDuration, setGoalDuration] = useState(30);
  const [goalHoursLog, setGoalHoursLog] = useState<number>(0);
  const [goalPlan, setGoalPlan] = useState<StudyGoal | null>(null);

  useEffect(() => {
    const savedGoal = localStorage.getItem("julkar_edu_goal");
    if (savedGoal) {
      try {
        setGoalPlan(JSON.parse(savedGoal));
      } catch (e) {}
    }
  }, []);

  const handleCreateGoalPlan = async () => {
    if (!goalTitle.trim()) return;
    const prompt = `You are an expert curriculum designer. Design a highly effective daily day-by-day study syllabus for learning "${goalTitle}" over exactly ${goalDuration} days.
    Output exactly a structured JSON object representing the study plan. Output ONLY valid JSON without markdown wrapping.
    The output must strictly match this structure:
    {
      "title": "${goalTitle}",
      "durationDays": ${goalDuration},
      "dailyMinutes": 45,
      "plan": [
        {
          "day": 1,
          "topic": "Core foundational concepts",
          "tasks": ["Read introduction", "Complete basic workspace setup", "Try first hello world example"]
        },
        ... (generate a representative day-by-day set of tasks)
      ]
    }`;

    const planText = await callEducationAPI(prompt, true);
    if (planText) {
      try {
        const cleanJSON = planText.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
        const parsed = JSON.parse(cleanJSON);
        if (parsed.plan && Array.isArray(parsed.plan)) {
          const newGoal: StudyGoal = {
            id: Math.random().toString(36).substring(2, 11),
            title: parsed.title || goalTitle,
            durationDays: Number(parsed.durationDays) || goalDuration,
            dailyMinutes: Number(parsed.dailyMinutes) || 45,
            startDate: Date.now(),
            completedDays: [],
            hoursStudied: 0,
            plan: parsed.plan,
          };
          setGoalPlan(newGoal);
          localStorage.setItem("julkar_edu_goal", JSON.stringify(newGoal));
        } else {
          throw new Error("Invalid plan structure");
        }
      } catch (e) {
        setApiError("Failed to parse study plan JSON. Please try again.");
      }
    }
  };

  const handleToggleDayComplete = (day: number) => {
    if (!goalPlan) return;
    let newCompleted = [...goalPlan.completedDays];
    if (newCompleted.includes(day)) {
      newCompleted = newCompleted.filter((d) => d !== day);
    } else {
      newCompleted.push(day);
    }
    const updated = { ...goalPlan, completedDays: newCompleted };
    setGoalPlan(updated);
    localStorage.setItem("julkar_edu_goal", JSON.stringify(updated));
  };

  const handleLogStudyTime = (hrs: number) => {
    if (!goalPlan || hrs <= 0) return;
    const updated = { ...goalPlan, hoursStudied: Number(goalPlan.hoursStudied || 0) + hrs };
    setGoalPlan(updated);
    localStorage.setItem("julkar_edu_goal", JSON.stringify(updated));
    setGoalHoursLog(0);
  };

  const handleResetGoal = () => {
    if (confirm("Are you sure you want to delete this learning goal? All tracking history will be reset.")) {
      setGoalPlan(null);
      localStorage.removeItem("julkar_edu_goal");
    }
  };

  // ==========================================
  // 4. VOICE TUTOR STATE (Speech-to-Text & TTS)
  // ==========================================
  const [voiceLang, setVoiceLang] = useState<"en-US" | "bn-BD">("en-US");
  const [voiceExercise, setVoiceExercise] = useState("Introduce Yourself");
  const [isListening, setIsListening] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState("");
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const startVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech Recognition is not natively supported in this browser. Please use Google Chrome, Safari, or Microsoft Edge for Voice Tutor features.");
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = voiceLang;
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
        setSpokenTranscript("");
        setVoiceFeedback(null);
      };

      rec.onerror = (e: any) => {
        console.error("Speech error", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSpokenTranscript(transcript);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleSubmitSpeech = async () => {
    if (!spokenTranscript.trim()) return;
    const prompt = `You are an empathetic, world-class Language Pronunciation Coach and Conversational Tutor. 
    The student is practicing their speaking skills under the exercise theme: "${voiceExercise}".
    They spoke the following response in ${voiceLang === "bn-BD" ? "Bangla (Bengali)" : "English"}:
    
    "${spokenTranscript}"
    
    Analyze their spoken response and provide a highly interactive feedback card. 
    1. **Grammar & Word Choice**: Correct any subtle mistakes.
    2. **Fluency & Better Alternatives**: Provide 2-3 natural, advanced ways to say this.
    3. **Acoustic / Pronunciation Score**: Rate their overall message readability out of 100 and point out difficult phonemes.
    Provide constructive feedback. Speak back in a highly clear, supportive educator voice.`;

    const feedback = await callEducationAPI(prompt);
    if (feedback) {
      setVoiceFeedback(feedback);
      // Trigger voice output play-back automatically
      speakBackText(feedback);
    }
  };

  const speakBackText = async (rawFeedback: string) => {
    // Extract key advice from feedback or read first paragraph
    const cleanedText = rawFeedback
      .replace(/[*#`_]/g, "") // Clean markdown
      .split("\n")
      .filter((line) => line.trim().length > 10)[0] || "Wonderful speech attempt! Let's examine the detailed grammar scorecard below.";

    try {
      setIsAudioPlaying(true);
      const res = await fetch("/api/chat/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanedText, voice: voiceLang === "bn-BD" ? "Kore" : "Charon" }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const data = await res.json();
      if (data.audio) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        const audioObj = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audioRef.current = audioObj;
        audioObj.onended = () => setIsAudioPlaying(false);
        audioObj.play();
      } else {
        throw new Error();
      }
    } catch (e) {
      // Fallback to Web Speech API SpeechSynthesis
      setIsAudioPlaying(true);
      const synth = window.speechSynthesis;
      if (synth) {
        const utter = new SpeechSynthesisUtterance(cleanedText);
        utter.lang = voiceLang;
        utter.onend = () => setIsAudioPlaying(false);
        synth.speak(utter);
      } else {
        setIsAudioPlaying(false);
      }
    }
  };

  const stopSpeakBack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    window.speechSynthesis.cancel();
    setIsAudioPlaying(false);
  };

  // ==========================================
  // 5. PHOTO-TO-ANSWER STATE
  // ==========================================
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoAnswer, setPhotoAnswer] = useState<string | null>(null);
  const [photoFollowUp, setPhotoFollowUp] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setPhotoAnswer(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSolvePhoto = async () => {
    if (!photoPreview) return;
    setIsGenerating(true);
    setApiError(null);
    try {
      // Photo is Base64 format. We send to our server streaming chat API by creating a temporary single-message stream,
      // or using a specialized content builder. Let's send directly as inline base64 image data to the standard education generator API or chat endpoint.
      // To keep it simple and robust, we fetch from our educational API where the model reads the base64 inline image.
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "Please detect any exam/quiz question, formula, or educational problem in this uploaded image. Extract it accurately, solve it step-by-step with simple, detailed conceptual explanations, and show the final highlighted answer at the end.",
              image: {
                data: photoPreview.split(",")[1], // Extract actual base64 bytes
                mimeType: photoPreview.split(";")[0].split(":")[1] || "image/png",
              },
            },
          ],
          model: "gemini-2.5-flash",
          systemInstruction: "You are an expert academic visual solver. Identify formulas, handwritten math, text questions, diagrams or scientific layouts from images. Provide precise step-by-step guidance.",
          temperature: 0.2,
          useSearch: false,
        }),
      });

      if (!res.ok) throw new Error("Solver engine failed to scan this document.");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) throw new Error("No reader");

      let done = false;
      let text = "";
      setPhotoAnswer("");

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const payloadStr = trimmed.replace(/^data: /, "");
            if (payloadStr === "[DONE]") {
              done = true;
              break;
            }
            try {
              const payload = JSON.parse(payloadStr);
              if (payload.text) {
                text += payload.text;
                setPhotoAnswer(text);
              }
            } catch (err) {}
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Visual Solver Error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePhotoFollowUp = async () => {
    if (!photoFollowUp.trim() || !photoAnswer) return;
    const currentQuestion = photoFollowUp;
    setPhotoFollowUp("");
    
    // Append to current answer in markdown style
    const previousExplanation = photoAnswer;
    setPhotoAnswer((prev) => `${prev}\n\n---\n\n**User Question:** ${currentQuestion}\n\n*Thinking...*`);

    setIsGenerating(true);
    try {
      const prompt = `You previously solved a visual question with this breakdown:
      
      ${previousExplanation}
      
      The student has asked a follow-up doubt or question:
      "${currentQuestion}"
      
      Provide a highly clear, simple, and step-by-step explanation addressing this specific doubt in detail. Make it easy to digest.`;

      const response = await callEducationAPI(prompt);
      if (response) {
        setPhotoAnswer(`${previousExplanation}\n\n---\n\n**User Doubts Question:** ${currentQuestion}\n\n**JOXIQ Teacher Reply:**\n${response}`);
      }
    } catch (e) {
      setApiError("Failed to fetch follow-up.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetPhotoSolver = () => {
    setPhotoPreview(null);
    setPhotoAnswer(null);
    setPhotoFollowUp("");
    setApiError(null);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden max-w-5xl mx-auto px-4 md:px-6 py-4">
      
      {/* Dynamic Sub Tab Navigation */}
      <div className={`flex items-center gap-1.5 p-1 rounded-2xl mb-5 w-fit ${
        theme === "dark" ? "bg-white/[0.03] border border-white/5" : "bg-slate-200 border border-slate-300 shadow-xs"
      }`}>
        <button
          onClick={() => setActiveTab("teacher")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "teacher"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-900 hover:text-indigo-600 dark:text-slate-300"
          }`}
        >
          <GraduationCap size={14} />
          <span>Study Mode AI</span>
        </button>

        <button
          onClick={() => setActiveTab("exam")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "exam"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-900 hover:text-indigo-600 dark:text-slate-300"
          }`}
        >
          <FileText size={14} />
          <span>Exam Generator</span>
        </button>

        <button
          onClick={() => setActiveTab("goals")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "goals"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-900 hover:text-indigo-600 dark:text-slate-300"
          }`}
        >
          <Target size={14} />
          <span>Goal Tracker</span>
        </button>

        <button
          onClick={() => setActiveTab("voice")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "voice"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-900 hover:text-indigo-600 dark:text-slate-300"
          }`}
        >
          <Mic size={14} />
          <span>Voice Tutor</span>
        </button>

        <button
          onClick={() => setActiveTab("photo")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "photo"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "text-slate-900 hover:text-indigo-600 dark:text-slate-300"
          }`}
        >
          <Camera size={14} />
          <span>Photo Answer Solver</span>
        </button>
      </div>

      {/* Global Error Notice */}
      {apiError && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{apiError}</span>
        </div>
      )}

      {/* ==========================================
          TAB 1: STUDY MODE AI (🎓 Teacher & Quizzes)
          ========================================== */}
      {activeTab === "teacher" && (
        <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
          {/* Controls Column */}
          <div className={`w-full md:w-80 shrink-0 border p-5 rounded-2xl flex flex-col gap-4 overflow-y-auto ${
            theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200/80 shadow-sm"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">AI Teacher Setup</h3>
                <p className="text-[10px] text-slate-500 font-medium">Select target audience & theme</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">What topic to learn?</label>
              <input
                type="text"
                placeholder="e.g. Photosynthesis, Trigonometry"
                value={teacherTopic}
                onChange={(e) => setTeacherTopic(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                  theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Language</label>
                <select
                  value={teacherLanguage}
                  onChange={(e) => setTeacherLanguage(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                    theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                  }`}
                >
                  <option value="English">English</option>
                  <option value="Bangla">Bangla (বাংলা)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Level</label>
                <select
                  value={teacherGrade}
                  onChange={(e) => setTeacherGrade(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                    theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                  }`}
                >
                  <option value="Primary School">Primary</option>
                  <option value="High School">High School</option>
                  <option value="College">College</option>
                  <option value="University">University</option>
                </select>
              </div>
            </div>

            {/* Suggestions list */}
            <div className="space-y-1.5 mt-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Suggested Topics</label>
              <div className="flex flex-wrap gap-1">
                {["Photosynthesis", "Newton's 3rd Law", "Fraction Basics", "Tense in English", "Mitochondria Power"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTeacherTopic(t)}
                    className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                      teacherTopic === t
                        ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                        : (theme === "dark" ? "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200")
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-slate-500/10 mt-auto">
              <button
                disabled={isGenerating || !teacherTopic.trim()}
                onClick={handleTeacherExplain}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isGenerating ? <RefreshCw className="animate-spin w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Explain Step-by-Step</span>
              </button>

              <button
                disabled={isGenerating}
                onClick={handleGenerateQuiz}
                className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  theme === "dark" ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Generate Topic Quiz</span>
              </button>
            </div>
          </div>

          {/* Teacher Content Display Column */}
          <div className={`flex-1 border rounded-2xl p-6 overflow-y-auto flex flex-col ${
            theme === "dark" ? "bg-white/[0.01] border-white/5 text-slate-200" : "bg-white border-slate-200/80 text-slate-800 shadow-sm"
          }`}>
            {isGenerating && (
              <div className="my-auto text-center py-20 space-y-3">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-medium">JOXIQ AI Teacher is preparing study materials...</p>
              </div>
            )}

            {!isGenerating && !teacherExplanation && !quizQuestions && (
              <div className="my-auto text-center py-20 max-w-sm mx-auto space-y-3 select-none">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
                  <GraduationCap className="w-6 h-6 animate-bounce" />
                </div>
                <h4 className="font-bold text-sm">Welcome to JOXIQ AI Study Classroom</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter a topic on the left to get premium, step-by-step teacher explanations, analogies, and take high-quality customized quizzes!
                </p>
              </div>
            )}

            {/* Displaying Teacher Explanation */}
            {!isGenerating && teacherExplanation && !quizQuestions && (
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between border-b pb-3 mb-2 border-slate-500/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase bg-indigo-500/15 text-indigo-400 px-2.5 py-1 rounded-lg">Study Explainer</span>
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">{teacherGrade} Level</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(teacherExplanation);
                      alert("Explanation copied to clipboard!");
                    }}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      theme === "dark" ? "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                    title="Copy Text"
                  >
                    <Copy size={12} />
                  </button>
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs md:text-sm leading-relaxed text-slate-300 markdown-body">
                  <Markdown>{teacherExplanation}</Markdown>
                </div>
              </div>
            )}

            {/* Displaying Quiz Questions */}
            {!isGenerating && quizQuestions && (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  {/* Progress Header */}
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-500/10">
                    <span className="text-xs font-bold text-indigo-400">Classroom Topic Quiz</span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Question {quizCurrentIndex + 1} of {quizQuestions.length}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 bg-slate-500/15 rounded-full overflow-hidden mb-6">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${((quizCurrentIndex + 1) / quizQuestions.length) * 100}%` }}
                    />
                  </div>

                  {!quizComplete ? (
                    <div className="space-y-5 text-left">
                      <h3 className="font-bold text-base md:text-lg">
                        {quizQuestions[quizCurrentIndex].question}
                      </h3>

                      {/* Options List */}
                      <div className="grid grid-cols-1 gap-2.5">
                        {quizQuestions[quizCurrentIndex].options.map((opt, idx) => {
                          const isSelected = quizSelectedOption === idx;
                          const isCorrect = idx === quizQuestions[quizCurrentIndex].correctAnswerIndex;
                          let btnStyle = "";

                          if (quizAnswered) {
                            if (isCorrect) {
                              btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-400";
                            } else if (isSelected) {
                              btnStyle = "bg-rose-500/20 border-rose-500 text-rose-400";
                            } else {
                              btnStyle = theme === "dark" ? "bg-gray-950 border-gray-800 text-slate-500 cursor-not-allowed opacity-60" : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60";
                            }
                          } else {
                            btnStyle = isSelected
                              ? "bg-indigo-600 border-indigo-500 text-white font-bold"
                              : (theme === "dark" ? "bg-gray-950 border-gray-800 hover:border-indigo-500 hover:bg-indigo-500/5 text-slate-300" : "bg-slate-50 border-slate-200 hover:border-indigo-500 hover:bg-indigo-500/5 text-slate-700");
                          }

                          return (
                            <button
                              key={idx}
                              disabled={quizAnswered}
                              onClick={() => setQuizSelectedOption(idx)}
                              className={`w-full p-3 text-left text-xs md:text-sm rounded-xl border transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {quizAnswered && isCorrect && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />}
                              {quizAnswered && isSelected && !isCorrect && <X className="w-4.5 h-4.5 text-rose-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Score Checker Advice Explainer */}
                      {quizAnswered && (
                        <div className={`p-4 rounded-xl border flex items-start gap-3 mt-4 ${
                          theme === "dark" ? "bg-black border-zinc-800" : "bg-indigo-50/40 border-indigo-100"
                        }`}>
                          <HelpCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-wide">Explanation</span>
                            <p className="text-xs leading-relaxed text-slate-300">
                              {quizQuestions[quizCurrentIndex].explanation}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Quiz score-board complete cards view */
                    <div className="py-8 text-center space-y-5">
                      <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center mx-auto text-xl font-extrabold shadow-md">
                        {quizScore} / {quizQuestions.length}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg md:text-xl">Quiz Complete!</h3>
                        <p className="text-xs text-slate-400">
                          {quizScore === quizQuestions.length ? "Incredible work! Complete mastery achieved." : "Good attempt! Read the explanations and try again."}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-500/10 flex justify-center gap-3">
                        <button
                          onClick={handleGenerateQuiz}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                        >
                          Retry Current Quiz
                        </button>
                        <button
                          onClick={() => setQuizQuestions(null)}
                          className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            theme === "dark" ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          Back to Explainer
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Question Next Step Navigation */}
                {quizQuestions && !quizComplete && (
                  <div className="flex items-center justify-end gap-3 border-t pt-4 mt-6 border-slate-500/10">
                    {!quizAnswered ? (
                      <button
                        disabled={quizSelectedOption === null}
                        onClick={() => {
                          if (quizSelectedOption === null) return;
                          setQuizAnswered(true);
                          if (quizSelectedOption === quizQuestions[quizCurrentIndex].correctAnswerIndex) {
                            setQuizScore((prev) => prev + 1);
                          }
                        }}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (quizCurrentIndex + 1 < quizQuestions.length) {
                            setQuizCurrentIndex((prev) => prev + 1);
                            setQuizSelectedOption(null);
                            setQuizAnswered(false);
                          } else {
                            setQuizComplete(true);
                          }
                        }}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
                      >
                        <span>{quizCurrentIndex + 1 === quizQuestions.length ? "Finish Quiz" : "Next Question"}</span>
                        <ChevronRight size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: EXAM PAPER GENERATOR (📝 MCQ, CQ, & Short)
          ========================================== */}
      {activeTab === "exam" && (
        <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
          {/* Options Column */}
          <div className={`w-full md:w-80 shrink-0 border p-5 rounded-2xl flex flex-col gap-4 overflow-y-auto ${
            theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200/80 shadow-sm"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Exam Board Setup</h3>
                <p className="text-[10px] text-slate-500 font-medium">Configure syllabus parameters</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Syllabus Topic</label>
              <input
                type="text"
                placeholder="e.g. Mitochondria, IELTS Reading"
                value={examTopic}
                onChange={(e) => setExamTopic(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                  theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Level</label>
                <select
                  value={examGrade}
                  onChange={(e) => setExamGrade(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                    theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                  }`}
                >
                  <option value="Primary School">Primary</option>
                  <option value="High School">High School</option>
                  <option value="College">College</option>
                  <option value="University">University</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Difficulty</label>
                <select
                  value={examDifficulty}
                  onChange={(e) => setExamDifficulty(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                    theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                  }`}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Inclusions */}
            <div className="space-y-2 mt-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Question Formats</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMCQ}
                    onChange={(e) => setIncludeMCQ(e.target.checked)}
                    className="accent-indigo-500 rounded"
                  />
                  <span>Multiple Choice (MCQ)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeShort}
                    onChange={(e) => setIncludeShort(e.target.checked)}
                    className="accent-indigo-500 rounded"
                  />
                  <span>Short Questions (SAQ)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCQ}
                    onChange={(e) => setIncludeCQ(e.target.checked)}
                    className="accent-indigo-500 rounded"
                  />
                  <span>Creative Questions (CQ)</span>
                </label>
              </div>
            </div>

            <button
              disabled={isGenerating || !examTopic.trim() || (!includeMCQ && !includeShort && !includeCQ)}
              onClick={handleGenerateExam}
              className="w-full mt-auto py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isGenerating ? <RefreshCw className="animate-spin w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Generate Exam Paper</span>
            </button>
          </div>

          {/* Exam Rendering Display Area */}
          <div className={`flex-1 border rounded-2xl p-6 overflow-y-auto flex flex-col relative ${
            theme === "dark" ? "bg-white/[0.01] border-white/5 text-slate-200" : "bg-white border-slate-200/80 text-slate-800 shadow-sm"
          }`}>
            {isGenerating && (
              <div className="my-auto text-center py-20 space-y-3">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-medium">Julkar Academic Board is printing exam papers...</p>
              </div>
            )}

            {!isGenerating && !generatedExam && (
              <div className="my-auto text-center py-20 max-w-sm mx-auto space-y-3 select-none">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm">Welcome to Exam Paper Center</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Generate fully-formatted, customized examination papers (MCQ, short, creative essay questions) from any topic with difficulty tuning and interactive solution cards.
                </p>
              </div>
            )}

            {!isGenerating && generatedExam && (
              <div className="space-y-6 text-left">
                {/* Exam controls header toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-slate-500/10">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold uppercase bg-indigo-500/15 text-indigo-400 px-2.5 py-1 rounded-lg">Official Paper</span>
                    <span className="text-[10px] text-slate-500 font-mono uppercase font-bold">{examDifficulty} Diff</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const style = document.createElement("style");
                        style.innerHTML = "@media print { body { background: white !important; color: black !important; } .no-print { display: none !important; } }";
                        document.head.appendChild(style);
                        window.print();
                      }}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                        theme === "dark" ? "bg-white/5 border-white/10 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                      title="Print / PDF"
                    >
                      <Printer size={12} />
                      <span className="hidden sm:inline">Print Exam</span>
                    </button>

                    <button
                      onClick={handleGetExamSolutions}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                        showExamAnswers
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : (theme === "dark" ? "bg-white/5 border-white/10 text-indigo-400" : "bg-indigo-50 border-indigo-200 text-indigo-700")
                      }`}
                    >
                      <CheckCircle2 size={12} />
                      <span>{showExamAnswers ? "Hide Solution Key" : "View Answers Solutions"}</span>
                    </button>
                  </div>
                </div>

                {/* Exam sheet */}
                <div className={`p-6 md:p-8 rounded-2xl border ${
                  theme === "dark" ? "bg-gray-950/60 border-white/5" : "bg-gray-50/50 border-slate-200"
                }`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs md:text-sm leading-relaxed text-slate-300 markdown-body">
                    <Markdown>{generatedExam}</Markdown>
                  </div>

                  {/* Solution Key display */}
                  {showExamAnswers && (
                    <div className="mt-8 pt-8 border-t border-dashed border-indigo-500/20">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                        <h4 className="text-sm font-extrabold text-emerald-400 uppercase tracking-widest font-sans">Official marking guideline answers</h4>
                      </div>

                      {!examSolutions ? (
                        <div className="text-center py-6">
                          <div className="w-6 h-6 rounded-full border border-emerald-500 border-t-transparent animate-spin mx-auto mb-2" />
                          <span className="text-[10px] text-slate-500">Retrieving academic solutions key...</span>
                        </div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-xs md:text-sm leading-relaxed text-slate-300 markdown-body bg-emerald-500/[0.02] p-4 rounded-xl border border-emerald-500/10">
                          <Markdown>{examSolutions}</Markdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 3: GOAL TRACKER AI (🎯 Learning Goals)
          ========================================== */}
      {activeTab === "goals" && (
        <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
          {/* Planner Side-Panel Column */}
          <div className={`w-full md:w-80 shrink-0 border p-5 rounded-2xl flex flex-col gap-4 overflow-y-auto ${
            theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200/80 shadow-sm"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Goal Planner AI</h3>
                <p className="text-[10px] text-slate-500 font-medium">Personalized study track generator</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Learning Objective Goal</label>
              <input
                type="text"
                placeholder="e.g. Master React, Fluent IELTS English"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                  theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Duration Days</label>
              <select
                value={goalDuration}
                onChange={(e) => setGoalDuration(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                  theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                }`}
              >
                <option value={7}>7 Days Sprint</option>
                <option value={15}>15 Days Intensive</option>
                <option value={30}>30 Days Complete Blueprint</option>
              </select>
            </div>

            <button
              disabled={isGenerating || !goalTitle.trim()}
              onClick={handleCreateGoalPlan}
              className="w-full mt-auto py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isGenerating ? <RefreshCw className="animate-spin w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Generate AI Study Tracker</span>
            </button>
          </div>

          {/* Goal Tracker Layout Display Column */}
          <div className={`flex-1 border rounded-2xl p-6 overflow-y-auto flex flex-col ${
            theme === "dark" ? "bg-white/[0.01] border-white/5 text-slate-200" : "bg-white border-slate-200/80 text-slate-800 shadow-sm"
          }`}>
            {isGenerating && (
              <div className="my-auto text-center py-20 space-y-3">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-medium">JOXIQ AI Curriculum Designer is building customized tracking boards...</p>
              </div>
            )}

            {!isGenerating && !goalPlan && (
              <div className="my-auto text-center py-20 max-w-sm mx-auto space-y-3 select-none">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
                  <Target className="w-6 h-6 text-indigo-500" />
                </div>
                <h4 className="font-bold text-sm">Welcome to AI Goal Tracker Board</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter your learning objective on the left. AI will create a comprehensive day-by-day customized blueprint study curriculum with tracking progress checklist cards.
                </p>
              </div>
            )}

            {!isGenerating && goalPlan && (
              <div className="space-y-6 text-left flex-1 flex flex-col justify-between">
                <div>
                  {/* Goals Stats Header Board */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                      theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                    }`}>
                      <Calendar className="w-8 h-8 text-indigo-400 shrink-0" />
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Total Completion</div>
                        <div className="text-sm font-extrabold text-indigo-400">
                          {goalPlan.completedDays.length} / {goalPlan.durationDays} Days ({Math.round((goalPlan.completedDays.length / goalPlan.durationDays) * 100)}%)
                        </div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                      theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                    }`}>
                      <Hourglass className="w-8 h-8 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Study Duration Log</div>
                        <div className="text-sm font-extrabold text-emerald-400">
                          {goalPlan.hoursStudied || 0} Total Hours
                        </div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                      theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                    }`}>
                      <Flame className="w-8 h-8 text-amber-500 shrink-0 animate-pulse" />
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Study Goal</div>
                        <div className="text-sm font-extrabold text-amber-400 truncate w-32">
                          {goalPlan.title}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hourly Log input panel */}
                  <div className={`mt-4 p-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                    theme === "dark" ? "bg-indigo-500/[0.02] border-indigo-500/10" : "bg-indigo-50/20 border-indigo-100"
                  }`}>
                    <div className="flex items-center gap-2">
                      <BookMarked size={14} className="text-indigo-500" />
                      <span className="text-xs font-bold text-indigo-400">Completed a study session? Log hours here:</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        placeholder="e.g. 1.5"
                        value={goalHoursLog || ""}
                        onChange={(e) => setGoalHoursLog(Number(e.target.value))}
                        className={`w-20 p-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center ${
                          theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-white border-gray-200 text-gray-800"
                        }`}
                      />
                      <button
                        onClick={() => handleLogStudyTime(goalHoursLog)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                      >
                        Log Session
                      </button>
                    </div>
                  </div>

                  {/* Syllabus Roadmap */}
                  <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mt-6 mb-3">Daily study curriculum blueprint</h4>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {goalPlan.plan.map((item) => {
                      const isCompleted = goalPlan.completedDays.includes(item.day);
                      return (
                        <div
                          key={item.day}
                          onClick={() => handleToggleDayComplete(item.day)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                            isCompleted
                              ? "bg-emerald-500/[0.04] border-emerald-500/20 text-slate-400"
                              : (theme === "dark" ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]" : "bg-white border-slate-200 shadow-sm hover:bg-slate-50")
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center transition-all ${
                            isCompleted ? "bg-emerald-500/20 border-emerald-500 text-emerald-500" : "border-slate-400"
                          }`}>
                            {isCompleted && <Check size={12} />}
                          </div>

                          <div className="space-y-1 text-left flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold uppercase tracking-wider ${isCompleted ? "text-emerald-500" : "text-indigo-400"}`}>
                                Day {item.day}
                              </span>
                              <span className={`text-xs font-bold leading-tight ${isCompleted ? "line-through text-slate-500" : ""}`}>
                                {item.topic}
                              </span>
                            </div>
                            <ul className="text-[11px] list-disc pl-4 space-y-0.5 mt-1 text-slate-400">
                              {item.tasks.map((task, idx) => (
                                <li key={idx} className={isCompleted ? "line-through opacity-70" : ""}>
                                  {task}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reset Trigger */}
                <div className="pt-4 border-t border-slate-500/10 flex items-center justify-end mt-4">
                  <button
                    onClick={handleResetGoal}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    Delete Goal & Syllabus
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 4: VOICE TUTOR (🎙️ Real-time Speaking & Audio)
          ========================================== */}
      {activeTab === "voice" && (
        <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
          {/* Practice Parameters Side Board */}
          <div className={`w-full md:w-80 shrink-0 border p-5 rounded-2xl flex flex-col gap-4 overflow-y-auto ${
            theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200/80 shadow-sm"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center animate-pulse">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Speaking Practice</h3>
                <p className="text-[10px] text-slate-500 font-medium">Configure Language & Accent</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Practice Language</label>
              <select
                value={voiceLang}
                onChange={(e) => setVoiceLang(e.target.value as any)}
                className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                  theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                }`}
              >
                <option value="en-US">English Conversation (American)</option>
                <option value="bn-BD">Bengali Speaking Practice (বাংলা)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Exercise Topic</label>
              <select
                value={voiceExercise}
                onChange={(e) => setVoiceExercise(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                  theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                }`}
              >
                <option value="Introduce Yourself">Introduce Yourself</option>
                <option value="Job Interview Prep">Job Interview Prep</option>
                <option value="Hometown & Family">Hometown & Family</option>
                <option value="Order food at a restaurant">Order food at a restaurant</option>
                <option value="Explain your Favorite Hobby">Explain your Favorite Hobby</option>
              </select>
            </div>

            <div className="p-3 bg-indigo-500/[0.03] border border-indigo-500/10 rounded-xl space-y-2 text-left mt-2">
              <div className="flex items-center gap-1.5 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                <Brain size={12} />
                <span>Coach Advice</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                Click the microphone below, record your response, and click submit. The AI Pronunciation Coach analyzes your syntax and speech accuracy step-by-step.
              </p>
            </div>
          </div>

          {/* Recorder Canvas Display Area */}
          <div className={`flex-1 border rounded-2xl p-6 overflow-y-auto flex flex-col justify-between ${
            theme === "dark" ? "bg-white/[0.01] border-white/5 text-slate-200" : "bg-white border-slate-200/80 text-slate-800 shadow-sm"
          }`}>
            <div className="space-y-5 text-left flex-1 flex flex-col justify-center max-w-xl mx-auto w-full">
              
              {/* Giant Recording Trigger Circle Button */}
              <div className="flex flex-col items-center justify-center gap-4 py-8 relative">
                <button
                  onClick={isListening ? stopVoiceRecording : startVoiceRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer relative shadow-lg ${
                    isListening
                      ? "bg-rose-600 animate-pulse ring-4 ring-rose-500/30 text-white scale-110"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 active:scale-95"
                  }`}
                >
                  {isListening ? <MicOff size={28} /> : <Mic size={28} />}
                  
                  {/* Wave effect when active */}
                  {isListening && (
                    <span className="absolute inset-0 w-full h-full rounded-full bg-rose-500/30 animate-ping" />
                  )}
                </button>

                <div className="text-center space-y-1 select-none">
                  <h4 className="text-sm font-bold">
                    {isListening ? "Listening closely... Speak now..." : "Click to start recording"}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {isListening ? "Click button again to complete" : "Speak in the language selected on the left"}
                  </p>
                </div>
              </div>

              {/* Speech transcript output box */}
              {spokenTranscript && (
                <div className="space-y-1 text-left">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Your voice transcript:</span>
                  <div className={`p-4 rounded-xl border text-xs md:text-sm italic leading-relaxed ${
                    theme === "dark" ? "bg-gray-950 border-gray-800 text-slate-300" : "bg-gray-50 border-slate-200 text-slate-700"
                  }`}>
                    "{spokenTranscript}"
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              {spokenTranscript && !voiceFeedback && (
                <button
                  disabled={isGenerating}
                  onClick={handleSubmitSpeech}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isGenerating ? <RefreshCw className="animate-spin w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Submit to Pronunciation Coach</span>
                </button>
              )}

              {/* AI Coach Feedback Panel */}
              {voiceFeedback && (
                <div className="space-y-4 border-t pt-5 border-slate-500/10 text-left mt-4">
                  <div className="flex items-center justify-between border-b pb-3 border-slate-500/10">
                    <span className="text-xs font-extrabold bg-pink-500/15 text-pink-400 px-2.5 py-1 rounded-lg uppercase">AI Voice Scorecard</span>
                    
                    <div className="flex items-center gap-2">
                      {isAudioPlaying ? (
                        <button
                          onClick={stopSpeakBack}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <VolumeX size={11} />
                          <span>Stop Audio</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => speakBackText(voiceFeedback)}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 size={11} />
                          <span>Speak Response</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs md:text-sm leading-relaxed text-slate-300 markdown-body bg-pink-500/[0.01] p-4 rounded-xl border border-pink-500/10">
                    <Markdown>{voiceFeedback}</Markdown>
                  </div>

                  <button
                    onClick={() => {
                      setSpokenTranscript("");
                      setVoiceFeedback(null);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      theme === "dark" ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Start another Pronunciation Drill
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 5: PHOTO-TO-ANSWER AI (📸 Visual Solver)
          ========================================== */}
      {activeTab === "photo" && (
        <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden">
          {/* Snap Camera Preview Column */}
          <div className={`w-full md:w-80 shrink-0 border p-5 rounded-2xl flex flex-col gap-4 overflow-y-auto ${
            theme === "dark" ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200/80 shadow-sm"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Visual Problem Solver</h3>
                <p className="text-[10px] text-slate-500 font-medium">Extract questions from snapshots</p>
              </div>
            </div>

            {/* Upload Area Dropzone */}
            {!photoPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 border-2 border-dashed rounded-2xl p-6 text-center flex flex-col justify-center items-center gap-3 cursor-pointer transition-colors min-h-[160px] ${
                  theme === "dark"
                    ? "border-white/10 bg-white/[0.01] hover:bg-white/[0.03] hover:border-indigo-500/50 text-slate-400 hover:text-indigo-400"
                    : "border-slate-200 bg-gray-50/50 hover:bg-slate-50 hover:border-indigo-500/50 text-slate-500 hover:text-indigo-600"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Upload size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight">Click or Drag Image</div>
                  <div className="text-[9px] text-slate-500 mt-1">Supports PNG, JPG snapshots</div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  ref={fileInputRef}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative border rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <img src={photoPreview} alt="Snapshot Preview" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                  <button
                    onClick={handleResetPhotoSolver}
                    className="absolute right-2 top-2 p-1 bg-black/80 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 py-1.5 text-[10px] font-bold border rounded-lg transition-all cursor-pointer text-center ${
                      theme === "dark" ? "bg-white/5 border-white/5 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"
                    }`}
                  >
                    Replace Image
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    ref={fileInputRef}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            <button
              disabled={isGenerating || !photoPreview}
              onClick={handleSolvePhoto}
              className="w-full mt-auto py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              {isGenerating ? <RefreshCw className="animate-spin w-3.5 h-3.5" /> : <Brain className="w-3.5 h-3.5" />}
              <span>Analyze & Solve step-by-step</span>
            </button>
          </div>

          {/* Solver Explanation display area */}
          <div className={`flex-1 border rounded-2xl p-6 overflow-y-auto flex flex-col justify-between ${
            theme === "dark" ? "bg-white/[0.01] border-white/5 text-slate-200" : "bg-white border-slate-200/80 text-slate-800 shadow-sm"
          }`}>
            <div className="flex-1 flex flex-col justify-between text-left">
              {isGenerating && !photoAnswer && (
                <div className="my-auto text-center py-20 space-y-3 w-full">
                  <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Julkar Multimodal Scanning Engine is scanning formulas...</p>
                </div>
              )}

              {!isGenerating && !photoAnswer && (
                <div className="my-auto text-center py-20 max-w-sm mx-auto space-y-3 select-none w-full">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
                    <Brain className="w-6 h-6 text-indigo-500" />
                  </div>
                  <h4 className="font-bold text-sm">Visual Solver Worksheet</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Upload an exam problem snapshot on the left, and click solve. Our visual AI scanner detects questions or mathematical formulas and outlines solutions immediately.
                  </p>
                </div>
              )}

              {/* Renders solved output */}
              {photoAnswer && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b pb-3 border-slate-500/10">
                    <span className="text-xs font-extrabold bg-indigo-500/15 text-indigo-400 px-2.5 py-1 rounded-lg uppercase">Visual Solver Results</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(photoAnswer);
                        alert("Solution copied to clipboard!");
                      }}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        theme === "dark" ? "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                      title="Copy Solution"
                    >
                      <Copy size={12} />
                    </button>
                  </div>

                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs md:text-sm leading-relaxed text-slate-300 markdown-body bg-indigo-500/[0.01] p-4 rounded-xl border border-indigo-500/10">
                    <Markdown>{photoAnswer}</Markdown>
                  </div>

                  {/* Follow-up question input */}
                  <div className="border-t pt-4 border-slate-500/10 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Have a follow-up doubt or question?</span>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handlePhotoFollowUp();
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        placeholder="e.g. Can you explain step 3 in more detail?"
                        value={photoFollowUp}
                        disabled={isGenerating}
                        onChange={(e) => setPhotoFollowUp(e.target.value)}
                        className={`flex-1 p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${
                          theme === "dark" ? "bg-gray-950 border-gray-800 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={isGenerating || !photoFollowUp.trim()}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                      >
                        Ask
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
