require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
const db = require('../config/db');
const { GoogleGenAI } = require('@google/genai');
// 1. Import OpenAI SDK for NaraRouter compatibility
const OpenAI = require('openai'); 

const geminiClient = new GoogleGenAI({});
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); // Restored original name 'client'

// 2. Initialize NaraRouter Client
// Change this block in your controller
const naraClient = new OpenAI({
  apiKey: process.env.NARAROUTER_API_KEY, 
  baseURL: 'https://router.bynara.id/v1', // Remove any extra trailing slashes here
  defaultHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'X-Title': 'MMS Capstone Application'
  }
});


const PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const TOKEN_LIMIT_PER_DAY = 10000;

const SYSTEM_PROMPT = `You are the MMS AI Assistant for MMS: A Web-Based Guide in Learning Video Editing.
You ONLY answer questions strictly related to:
- Video editing (pre-production, production, post-production)
- OBS Studio (recording, scenes, sources, streaming)
- DaVinci Resolve (timeline, color grading, nodes, export)
- Adobe Premiere Pro, Final Cut Pro, CapCut
- Color grading, LUTs, transitions, effects
- Storyboarding, shot lists, planning a shoot
- Audio mixing, sound design for video
- Video codecs, formats (H.264, H.265, MP4, MOV)
- Export settings, YouTube/social media optimization
- Cloudinary for video storage
- Lighting for video production
- Video editing terminology

If asked ANYTHING outside these topics (weather, sports, cooking, politics, relationships, math, general knowledge, etc.), respond with:
"I'm specialized exclusively in video editing and multimedia production topics for MMS. Please ask me about recording, editing software, color grading, export settings, or any production-related topic!"

Keep answers clear, educational, and concise. Use bullet points when listing steps. Be encouraging to students.`;

// ── TOKEN GUARD HELPER ──────────────────────────────────────────────────────
async function checkAndTrackTokens(studentId, calculatedTokens = 0, checkOnly = false) {
  const today = new Date().toISOString().split('T')[0]; // Fixed split bug
  
  const [rows] = await db.execute(
    'SELECT tokens_used FROM user_daily_tokens WHERE student_id = ? AND usage_date = ?',
    [studentId, today]
  );
  
  const currentUsage = rows.length > 0 ? rows[0].tokens_used : 0; // Fixed row reading syntax
  
  if (checkOnly) {
    return currentUsage;
  }

  if (rows.length > 0) {
    await db.execute(
      'UPDATE user_daily_tokens SET tokens_used = tokens_used + ? WHERE student_id = ? AND usage_date = ?',
      [calculatedTokens, studentId, today]
    );
  } else {
    await db.execute(
      'INSERT INTO user_daily_tokens (student_id, usage_date, tokens_used) VALUES (?, ?, ?)',
      [studentId, today, calculatedTokens]
    );
  }
  return currentUsage + calculatedTokens;
}

// ── CHAT WITH AI ──────────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message required' });

    // Token Check: Enforce daily limits before execution
    const currentTokensUsed = await checkAndTrackTokens(req.user.id, 0, true);
    if (currentTokensUsed >= TOKEN_LIMIT_PER_DAY) {
      return res.status(429).json({ 
        message: 'You have exceeded your daily limit of 10,000 AI tokens. Please try again tomorrow!' 
      });
    }

    let reply = '';
    let totalTokensSpent = 0;

    if (PROVIDER === 'nararouter') {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ];

      const response = await naraClient.chat.completions.create({
        model: process.env.NARAROUTER_MODEL || 'deepseek-chat', 
        messages,
        max_tokens: 1024,
      });

      reply = response.choices[0].message.content; // Restored standard OpenAI choice array index
      totalTokensSpent = response.usage ? response.usage.total_tokens : 0;

    } else if (PROVIDER === 'anthropic') {
      const messages = [
        ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message }
      ];

      const response = await client.messages.create({ // Restored original client variable
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      });
      reply = response.content[0].text; // Restored original correct SDK path
      totalTokensSpent = response.usage ? (response.usage.input_tokens + response.usage.output_tokens) : 0;

    } else {
      // Default: Route to Google Gemini (Exactly as your original setup)
      const contents = history.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await geminiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          maxOutputTokens: 1024,
        }
      });
      reply = response.text;
      
      // Safe fallback calculation for Gemini tokens
      totalTokensSpent = response.usageMetadata ? response.usageMetadata.totalTokenCount : Math.ceil((message.length + reply.length) / 4);
    }

    // Deduct Spent Tokens from user budget
    await checkAndTrackTokens(req.user.id, totalTokensSpent, false);

    // Save to Database (Unchanged original code)
    await db.execute('INSERT INTO ai_chat_history (student_id, role, content) VALUES (?,?,?)', [req.user.id, 'user', message]);
    await db.execute('INSERT INTO ai_chat_history (student_id, role, content) VALUES (?,?,?)', [req.user.id, 'assistant', reply]);

    res.json({ reply });
  } catch (err) {
    console.error(`${PROVIDER.toUpperCase()} AI Chat Error:`, err);
    res.status(500).json({ message: 'AI service unavailable. Try again.' });
  }
};

// ── GET CHAT HISTORY ──────────────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT role, content, created_at FROM ai_chat_history WHERE student_id=? ORDER BY created_at ASC LIMIT 100',
      [req.user.id]
    );
    res.json({ history: rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── GENERATE VIDEO QUESTION ───────────────────────────────────────────────────
exports.generateVideoQuestion = async (req, res) => {
  try {
    const { video_title, chapter_title } = req.body;

    const response = await client.messages.create({ // Restored original client variable
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Generate ONE multiple-choice quiz question about "${video_title}" for a video editing course chapter on "${chapter_title}".
Return ONLY valid JSON (no markdown, no explanation):
{"question":"...","option_a":"...","option_b":"...","option_c":"...","correct_option":"A"|"B"|"C","explanation":"..."}`
      }]
    });

    const text = response.content[0].text.replace(/```json|```/g, '').trim(); // Restored original correct SDK path
    const q = JSON.parse(text);

    if (req.body.video_id) {
      await db.execute(
        'INSERT INTO video_questions (video_id,question,option_a,option_b,option_c,correct_opt,generated_by) VALUES (?,?,?,?,?,?,\'ai\')',
        [req.body.video_id, q.question, q.option_a, q.option_b, q.option_c, q.correct_option]
      );
    }

    res.json({ question: q });
  } catch (err) {
    console.error('Video question gen error:', err);
    res.status(500).json({ message: 'Could not generate question' });
  }
};

// ── CLEAR HISTORY ─────────────────────────────────────────────────────────────
exports.clearHistory = async (req, res) => {
  try {
    await db.execute('DELETE FROM ai_chat_history WHERE student_id=?', [req.user.id]);
    res.json({ message: 'History cleared' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
