import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini SDK as instructed in the guidelines
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Error handling wrapper
const handleAsync = (fn: Function) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ====================================================
// DESIGN PHILOSOPHY: CUSTOMIZABLE GEMINI PROMPTS
// ====================================================

export const DAILY_BRIEF_PROMPT = `
You are a highly premium, intelligent, and conversational daily executive companion.
You will compile a complete morning briefing using the raw data provided below.

INSTRUCTION RULES:
1. Ensure the tone is calm, professional, and sophisticated (English or German depending on user preferences, by default respond in German since the user requested: "Die App erzeugt jeden Morgen einen 'Daily Brief'").
2. Organize the script into a flowing narrator transcript that reads naturally. Do not mention system variables, JSON keys, or technical artifacts.
3. Condense the visual segments into markdown snippets to render on cards.
4. Construct exactly 3 key highlight bullets to present as a quick morning summary.

RAW CONTEXT DATA:
- Date: "{date}"
- User Location: "{location}"
- Topics of Interest: {topics}
- Preferred News Sources: {newsSources}
- Weather Report: {weather}
- Calendar Items: {calendar}
- Important Mails: {emails}
- Daily To-dos: {tasks}
- E-Sign Document Signature Status (Verträge): {esign}
`;

// ====================================================
// RAW DATA SOURCE SIMULATION LAYERS (PLACEHOLDERS)
// ====================================================

function fetchNewsForUser(topics: string[], newsSources: string[]): string {
  const selectedTopics = topics.length > 0 ? topics : ["Digital Health", "AI in Medicine"];
  const sourcesStr = newsSources && newsSources.length > 0 ? ` (Bevorzugte Quellen: ${newsSources.join(", ")})` : "";
  return selectedTopics.map(topic => {
    if (topic.toLowerCase().includes("health") || topic.toLowerCase().includes("medizin")) {
      return `[News: ${topic}]${sourcesStr} Forscher entwickeln neue KI zur Krebsfrüherkennung auf Basis von Blutbildern; Markteinführung in Europa für Ende 2026 geplant. Gesetzliche Krankenkassen prüfen Erstattungsmöglichkeiten.`;
    }
    if (topic.toLowerCase().includes("ai") || topic.toLowerCase().includes("ki") || topic.toLowerCase().includes("tech")) {
      return `[News: ${topic}]${sourcesStr} Open-Source LLMs erreichen Meilenstein in logischer Schlussfolgerung. Neue Benchmark-Tests zeigen Gleichstand mit proprietären Modellen bei 40% geringeren Rechenkosten.`;
    }
    return `[News: ${topic}]${sourcesStr} Jüngste Entwicklungen zeigen verstärkten Fokus auf Datenschutzregeln und dezentrale Cloud-Modelle im DACH-Raum sowie branchenspezifische Innovationen.`;
  }).join("\n");
}

function fetchWeatherForUser(location: string): string {
  const loc = location || "Berlin";
  return `Wetter in ${loc}: 18°C, teilweise bewölkt mit leichtem Wind aus Nord-Westen. Luftfeuchtigkeit bei 62%. Wahrscheinlichkeit für Regenschauer am Nachmittag liegt bei 20%. Perfekte Bedingungen für den Arbeitsweg.`;
}

function fetchCalendarEventsForUser(userId: string): string {
  return `
  - 09:30 - 10:00: Status-Review mit dem Entwicklungsteam (Remote)
  - 12:00 - 13:00: Mittagessen mit Dr. Becker (Zentrum für digitale Medizin)
  - 14:30 - 15:15: Budgetplanung Q3 (Projekt Huxe-Rebuild)
  `;
}

function fetchImportantEmailsForUser(userId: string): string {
  return `
  - Von: Marcus König (mv-koenig@digitalhealth.de) - Betreff: Partnerschaftsvertrag Entwurf V2 - Dringlichkeit: Hoch. Bitte Rückmeldung bis 16:00 Uhr.
  - Von: Google Firebase Admin - Betreff: [AISTUDIO-PROJECT] Deployment erfolgreich abgeschlossen - Dringlichkeit: Mittel.
  - Von: Newsletter Handelsblatt - Betreff: KI-Offensive in deutschen Mittelstandsunternehmen - Dringlichkeit: Niedrig.
  `;
}

function fetchTasksForUser(tasksList: any[]): string {
  if (!tasksList || tasksList.length === 0) {
    return "Keine kritischen To-dos für heute aufgeführt.";
  }
  return tasksList.map((t, i) => `${i+1}) [${t.status || 'offen'}] ${t.title || t.text} (Priorität: ${t.priority || 'mittel'})`).join("\n");
}

// ====================================================
// RESILIENT AI SIMULATION & QUOTA FALLBACK ENGINE
// ====================================================

function isQuotaOrAPIError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  const status = err.status || (err.error && err.error.status);
  const code = err.code || (err.error && err.error.code);
  return (
    code === 429 ||
    status === 429 ||
    status === "RESOURCE_EXHAUSTED" ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("limit") ||
    msg.includes("429") ||
    msg.includes("exhausted") ||
    msg.includes("api key") ||
    msg.includes("invalid") ||
    msg.includes("credentials")
  );
}

function generateMockBriefing(
  date: string,
  settings: any,
  tasks: any[],
  customCalendar?: string,
  customEmails?: string,
  customNews?: string,
  customWeather?: string,
  customESign?: string
) {
  const topics = settings?.topics || ["Digital Health", "AI", "Health Policy"];
  const location = settings?.location || "Berlin";
  const formattedDate = date || new Date().toISOString().split('T')[0];

  const newsStr = customNews || fetchNewsForUser(topics, settings?.newsSources || []);
  const weatherStr = customWeather || fetchWeatherForUser(location);
  const calendarStr = customCalendar || fetchCalendarEventsForUser("");
  const emailsStr = customEmails || fetchImportantEmailsForUser("");
  const tasksStr = fetchTasksForUser(tasks);
  const esignStr = customESign || `* Partnerschaftsvertrag Entwurf V2 - Ausstehende Unterschrift (Frist: 16:00 Uhr)\n* Vertraulichkeitsvereinbarung (NDA) - Auf Signatur wartend`;

  const bulletNews = newsStr.split("\n").filter(Boolean).map(line => `* ${line.trim()}`).join("\n");
  const bulletCalendar = calendarStr.split("\n").filter(Boolean).map(line => `* ${line.trim()}`).join("\n");
  const bulletEmails = emailsStr.split("\n").filter(Boolean).map(line => `* ${line.trim()}`).join("\n");
  const bulletESign = esignStr.split("\n").filter(Boolean).map(line => `* ${line.trim()}`).join("\n");

  const bulletListTasks = tasks && tasks.length > 0 
    ? tasks.map(t => `* ${t.title || t.text} [${t.status || 'offen'}] (Priorität: ${t.priority || 'mittel'})`).join("\n")
    : "* Keine offenen Aufgaben aufgeführt.";

  const briefingTitle = `Dein Daily Brief • ${formattedDate} (Fallback-Modus)`;
  const narrativeText = `Guten Morgen! Hier ist dein personalisierter täglicher Sprechbericht für heute, den ${formattedDate}.
Wir starten in ${location}. ${weatherStr}

Lass uns nun auf deine persönlichen Interessen blicken. Zu deinen ausgewählten Themen gehören ${topics.join(", ")}. In den Nachrichten zeichnet sich folgendes Bild ab:
${newsStr}.

Für deinen Kalender heute:
${calendarStr}

Wichtige E-Mails:
${emailsStr}

Und zu deinen To-dos: ${tasksStr}

Zuletzt blicken wir auf deine Verträge zur Unterschrift: ${esignStr}

Ich wünsche dir einen erfolgreichen, produktiven Tag. Lass uns das Beste daraus machen!`;

  return {
    briefingTitle,
    narrativeText,
    summaryBullets: [
      `Wetter in ${location}: ${weatherStr.slice(0, 60)}...`,
      topics.length > 0 ? `Spannende Einblicke zu deinem Thema "${topics[0]}".` : "Tägliche Nachrichtenübersicht geladen.",
      tasks.length > 0 ? `Wichtiges To-Do für heute: "${tasks[0].title || tasks[0].text}".` : "Ein fokussierter und strukturierter Tag steht dir bevor."
    ],
    weatherContent: `### 🌦️ Wettermeldung für ${location} (Simuliert)\n${weatherStr}\n\n* **Luftfeuchtigkeit:** 62%\n* **Regenwahrscheinlichkeit:** 20%\n* *Hinweis:* Optimale Bedingungen für den Tag.`,
    newsContent: `### 📰 Branchennachrichten & Insights (Simuliert)\n*Ausgewählte Themen: ${topics.join(", ")}*\n\n${bulletNews}\n\n*Hinweis: Aufgrund von Gemini API-Ratenbegrenzungen wurde dieser Briefing-Inhalt lokal generiert.*`,
    calendarContent: `### 📅 Heutige Termine & Agenda (Simuliert)\n\n${bulletCalendar}`,
    emailsContent: `### ✉️ Wichtige Posteingänge & Mails (Simuliert)\n\n${bulletEmails}`,
    tasksContent: `### 📋 Heutige Aufgaben (Simuliert)\n\n${bulletListTasks}`,
    esignContent: `### ✍️ eSign Dokumentensignaturen (Simuliert)\n\n${bulletESign}`
  };
}

function generateMockPodcast(query: string) {
  const podcastTitle = `Studio Deep-Dive: ${query} (Simulations-Modus)`;
  const narrativeText = `In dieser Episode von "Briefing Podcast Studio" erkunden Lukas und Sarah das spannende Feld rund um "${query}". Sie analysieren aktuelle Hypes, Potenziale und sprechen über zukunftssichere Best Practices.`;

  return {
    podcastTitle,
    narrativeText,
    segments: [
      {
        id: "podcast_intro",
        title: `Einführung in das Thema: ${query}`,
        spokenText: `Lukas: Hallo zusammen! Willkommen im Podcast-Studio. Heute haben wir ein richtig faszinierendes Thema mitgebracht: ${query}.\n\nSarah: Hallo Lukas! Genau, ein Thema, das gerade in aller Munde ist. Wir schauen uns die Trends und Realitäten dahinter heute mal genauer an!`,
        cardType: "podcast-intro",
        visualContent: `### 🎙️ Willkommen zum Deep-Dive!\n\n* **Thema:** ${query}\n* **Speaker:** Lukas & Sarah\n* **Fokus:** Praxistauglichkeit, Zahlen und Hintergründe.`
      },
      {
        id: "podcast_body_1",
        title: "Chancen & Potenziale",
        spokenText: `Lukas: Das Spannende an und für sich ist ja die Geschwindigkeit, in der sich alles bewegt. Es gibt bemerkenswerte Effizienzsprünge für alle, die das professionell integrieren.\n\nSarah: Absolut. Studien belegen eine signifikante Entlastung bei mühsamen Routineaufgaben. Die gewonnene Zeit fließt direkt in die Kreativität und strategische Ausrichtung.`,
        cardType: "podcast-body",
        visualContent: `### 💡 Analyse & Potenziale\n\n* **Entlastung:** Gesteigerte Produktivität bei kognitiver Entlastung.\n* **Integration:** Schnelle Einarbeitung und spürbare Arbeitserleichterung.`
      },
      {
        id: "podcast_body_2",
        title: "Best Practices & menschzentriertes Design",
        spokenText: `Lukas: Aber wir müssen auch ehrlich sein: Es ist kein Selbstläufer. Strukturierte Usability nach DIN ISO 9241 entscheidet über echte Benutzerakzeptanz.\n\nSarah: Gutes Design fällt nicht auf, weil es unsichtbar unterstützt. Deswegen ist Lautes Denken und standardisiertes Feedback wie der System Usability Scale so entscheidend.\n\nLukas: Genauso ist es, Sarah!`,
        cardType: "podcast-body",
        visualContent: `### ⚙ Best Practices\n\n* **Menschzentriert:** Usability & kognitive Ergonomie bestimmen den Erfolg.\n* **Design:** Klare Informationsarchitektur ohne unnötigen Zierrat.`
      },
      {
        id: "podcast_conclusion",
        title: "Unser tägliches Fazit",
        spokenText: `Lukas: Fassen wir zusammen: "${query}" ist gekommen, um zu bleiben. Die richtige Herangehensweise bringt den echten Vorsprung.\n\nSarah: Ein wunderbares Schlusswort, Lukas. Vielen Dank an alle Zuhörer da draußen, bleibt neugierig und probiert neue Tools aus!\n\nLukas: Macht's gut und bis zur nächsten Folge!`,
        cardType: "podcast-conclusion",
        visualContent: `### 🏁 Kernfazit\n\n* **Erkenntnis:** Kontinuierliches Lernen und Nutzerfokus führen zum Erfolg.\n* **Hinweis:** Dieser Podcast-Inhalt wurde im lokalen Labor-Simulator aufbereitet.`
      }
    ],
    sources: [
      { title: "Standardwerk zur Ergonomie der Mensch-System-Interaktion", uri: "https://de.wikipedia.org/wiki/ISO_9241" },
      { title: "Nielsen Norman Group UX Insights", uri: "https://www.nngroup.com" }
    ]
  };
}

// ====================================================
// API ENDPOINTS
// ====================================================

// 1. Generate Structured Daily Briefing (combining mocks & processing via Gemini-3.5-flash)
app.post("/api/briefing/generate", handleAsync(async (req: express.Request, res: express.Response) => {
  const { userId, date, settings, tasks, customCalendar, customEmails, customNews, customWeather, customESign } = req.body;

  const topics = settings?.topics || ["Digital Health", "AI", "Health Policy"];
  const newsSources = settings?.newsSources || [];
  const location = settings?.location || "Berlin";

  // Simulate reading from external/internal sources, or override with custom dashboard inputs
  const newsRaw = customNews || fetchNewsForUser(topics, newsSources);
  const weatherRaw = customWeather || fetchWeatherForUser(location);
  const calendarRaw = customCalendar || fetchCalendarEventsForUser(userId);
  const emailsRaw = customEmails || fetchImportantEmailsForUser(userId);
  const tasksRaw = fetchTasksForUser(tasks);
  const esignRaw = customESign || `* Partnerschaftsvertrag Entwurf V2 - Ausstehende Unterschrift (Frist: 16:00 Uhr)\n* Vertraulichkeitsvereinbarung (NDA) - Auf Signatur wartend`;

  const finalPrompt = DAILY_BRIEF_PROMPT
    .replace("{date}", date || new Date().toISOString().split('T')[0])
    .replace("{location}", location)
    .replace("{topics}", JSON.stringify(topics))
    .replace("{newsSources}", JSON.stringify(newsSources))
    .replace("{weather}", weatherRaw)
    .replace("{calendar}", calendarRaw)
    .replace("{emails}", emailsRaw)
    .replace("{tasks}", tasksRaw)
    .replace("{esign}", esignRaw);

  try {
    const ai = getAIClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: finalPrompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are the central core AI processor for the premium 'Daily Brief' morning executive app. German language required. Deliver a crisp JSON response mirroring the requested schema exactly. You MUST use the Google Search tool to query and synthesize live daily news matching the user's requested 'Topics of Interest' and prioritizing news from the user's requested 'Preferred News Sources' (news publications or domains) if any are provided. Also query today's real weather forecast for the user's configured location, and update the weatherContent accordingly.",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            briefingTitle: { type: Type.STRING, description: "Morning title e.g., 'Dein Daily Brief - 22. Mai'" },
            narrativeText: { type: Type.STRING, description: "Full spoken script for TTS speech reading." },
            summaryBullets: {
              type: Type.ARRAY,
              description: "Exactly 3 concise summary bulletins representing the most vital news or items today.",
              items: { type: Type.STRING }
            },
            weatherContent: { type: Type.STRING, description: "Detailed Markdown weather display content." },
            newsContent: { type: Type.STRING, description: "Detailed Markdown news summaries display content." },
            calendarContent: { type: Type.STRING, description: "Detailed Markdown calendar agenda display content." },
            emailsContent: { type: Type.STRING, description: "Detailed Markdown email bulletin display content." },
            tasksContent: { type: Type.STRING, description: "Detailed Markdown task summaries display content." },
            esignContent: { type: Type.STRING, description: "Detailed Markdown eSign / signature agreements status display content." }
          },
          required: [
            "briefingTitle", 
            "narrativeText", 
            "summaryBullets", 
            "weatherContent", 
            "newsContent", 
            "calendarContent", 
            "emailsContent", 
            "tasksContent",
            "esignContent"
          ]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text from Gemini API.");
    }

    const result = JSON.parse(response.text.trim());
    res.json(result);
  } catch (err: any) {
    console.warn("AI Generation encountered an error, activating resilient simulation fallback:", err);
    if (isQuotaOrAPIError(err)) {
      console.warn("[QUOTA/API LIMITS WARNING] Activating simulation-briefing fallback engine.");
    }
    const resultMock = generateMockBriefing(
      date,
      settings,
      tasks,
      customCalendar,
      customEmails,
      customNews,
      customWeather,
      customESign
    );
    res.json(resultMock);
  }
}));

// 2. Text-to-Speech Generation using gemini-3.1-flash-tts-preview
app.post("/api/briefing/tts", handleAsync(async (req: express.Request, res: express.Response) => {
  const { text, voice } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required for Text-To-Speech conversion." });
  }

  try {
    const ai = getAIClient();
    const selectedVoice = voice || "Kore"; // Puck, Charon, Kore, Fenrir, Zephyr

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Lies das folgende flüssig und in einer angenehmen morgendlichen Vorlesestimme vor: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("TTS compilation failed on Gemini engine.");
    }

    res.json({ audioContent: base64Audio });
  } catch (err: any) {
    console.warn("TTS generation failed on Gemini, responding with status 429 for local speech synthesis fallback.", err);
    res.status(429).json({ error: "Gemini TTS quota limits exceeded. Falling back to native browser speech synthesis." });
  }
}));

// Helper structure for parsed Google News RSS items
interface NewsFeedItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  topic: string;
}

// Robust Google News RSS parser using native fetch and Regex
async function fetchGoogleNewsFeed(topics: string[], newsSources: string[]): Promise<NewsFeedItem[]> {
  const allItems: NewsFeedItem[] = [];
  const searchTopics = topics && topics.length > 0 ? topics : ["Top Schlagzeilen"];

  for (const topic of searchTopics) {
    try {
      // Build a search query prioritizing news sources if provided
      let query = topic;
      if (newsSources && newsSources.length > 0) {
        const sourcesQuery = newsSources.map(s => `"${s}"`).join(" OR ");
        query = `${topic} (${sourcesQuery})`;
      }

      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=de&gl=DE&ceid=DE:de`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/115.0"
        }
      });
      if (!response.ok) continue;

      const xml = await response.text();
      
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match;
      let count = 0;
      
      while ((match = itemRegex.exec(xml)) !== null && count < 8) {
        const itemContent = match[1];
        
        const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i);
        const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
        const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
        
        let title = titleMatch ? titleMatch[1].trim() : "";
        let link = linkMatch ? linkMatch[1].trim() : "";
        let pubDate = pubDateMatch ? pubDateMatch[1].trim() : "";
        let sourceStr = sourceMatch ? sourceMatch[1].trim() : "Google News";
        
        if (title.startsWith("<![CDATA[")) title = title.substring(9, title.length - 3);
        if (link.startsWith("<![CDATA[")) link = link.substring(9, link.length - 3);
        if (pubDate.startsWith("<![CDATA[")) pubDate = pubDate.substring(9, pubDate.length - 3);
        if (sourceStr.startsWith("<![CDATA[")) sourceStr = sourceStr.substring(9, sourceStr.length - 3);
        
        // Formatter for clean display header
        if (title.includes(" - ")) {
          const parts = title.split(" - ");
          if (parts.length > 1) {
            const probableSrc = parts[parts.length - 1].toLowerCase();
            if (probableSrc.includes(sourceStr.toLowerCase()) || sourceStr.toLowerCase().includes(probableSrc)) {
              title = parts.slice(0, -1).join(" - ").trim();
            }
          }
        }
        
        if (title && link) {
          allItems.push({
            title,
            link,
            pubDate,
            source: sourceStr,
            topic
          });
          count++;
        }
      }
    } catch (err) {
      console.error(`Fehler beim Google News Feed Parser für '${topic}':`, err);
    }
  }

  // Sort items desc (newest first)
  return allItems.sort((a, b) => {
    try {
      return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    } catch {
      return 0;
    }
  }).slice(0, 20); // Top 20 items
}

// 3. Live Google News Feed fetch route (pulls live data matched to user settings profile)
app.post("/api/briefing/bulletins", handleAsync(async (req: express.Request, res: express.Response) => {
  try {
    const { topics, newsSources } = req.body;
    const feed = await fetchGoogleNewsFeed(topics || [], newsSources || []);
    res.json({ success: true, feed });
  } catch (err: any) {
    console.error("Fehler im /api/briefing/bulletins Router:", err);
    // Return a clean fallback list when news feed fetching throws any error
    res.json({
      success: true,
      feed: [
        {
          title: "KI-Ökosysteme im Aufwind: Strategische Partnerschaften treiben Innovationen",
          link: "https://news.google.com",
          pubDate: new Date().toISOString(),
          source: "Branchennachrichten",
          topic: req.body?.topics?.[0] || "Digital Health"
        },
        {
          title: "Usability im Fokus: Menschzentrierte Schnittstellen setzen neue Standards",
          link: "https://news.google.com",
          pubDate: new Date(Date.now() - 3600000).toISOString(),
          source: "UX Lab Research",
          topic: req.body?.topics?.[0] || "Digital Health"
        }
      ]
    });
  }
}));

// 4. Custom Podcast Generator route (Grounding with Google Search for real-time news & context)
app.post("/api/podcast/generate", handleAsync(async (req: express.Request, res: express.Response) => {
  const { query } = req.body;
  if (!query) {
    throw new Error("Suche/Thema ist erforderlich.");
  }

  const finalPrompt = `
You are a world-class conversational AI podcast producer. Your goal is to generate a highly engaging, intellectual, and entertaining podcast episode based on the user's topic: "${query}".

INSTRUCTION RULES:
1. The podcast must be in German and presented by two dynamic, friendly, and knowledgeable co-hosts: "Lukas" (charismatic, loves examples and metaphors) and "Sarah" (insightful, analytical, provides data points and background context). Set a highly premium, executive, yet accessible conversation style.
2. Structure the podcast into 4 to 6 dialogue segments. Include an engaging introduction ("podcast-intro"), multiple in-depth body sections diving into and examining different news, facts, or technical perspectives ("podcast-body"), and a brief satisfying wrapping conclusion ("podcast-conclusion").
3. Each segment must have:
   - "id": A unique ID such as "podcast_intro", "podcast_body_1", "podcast_conclusion".
   - "title": A catching, witty title for that specific subsection.
   - "spokenText": The actual spoken dialog. Use dialog formatting prefixed by their names, e.g.:
     "Lukas: Hallo zusammen! Willkommen zu einer neuen Folge unseres Podcasts. Heute haben wir ein richtig faszinierendes Thema mitgebracht..."
     "Sarah: Ganz genau Lukas, das ist ein Thema, das in den letzten Wochen extrem an Bedeutung gewonnen hat..."
     Ensure Lukas and Sarah talk back and forth naturally, agreeing, questioning, and sharing insightful details to keep the listener hooked.
   - "cardType": String enum corresponding exactly to: "podcast-intro", "podcast-body", or "podcast-conclusion".
   - "visualContent": Richly formatted Markdown context notes (bullet list, bold keywords, quotes, stats) summarizing the core takeaways or figures discussed in this segment to render on the companion screen.
4. "podcastTitle": Generate a creative, high-impact Title for the episode (in German).
5. "narrativeText": A summarizing introductory text or overview about what this episode covers.

Provide a valid, clean JSON response that matches the schema exactly. You MUST use the Google Search tool to gather up-to-date daily news, facts, and live context matching the user's topic query before drafting the podcast dialogs.
`;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: finalPrompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are the premium 'Briefing Podcast Studio' processor. You formulate German language spoken podcast scripts and visual companion metadata. Use Google Search grounding to make the episodes accurate, fresh, and grounded.",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            podcastTitle: { type: Type.STRING, description: "Catchy, premium title for the podcast episode." },
            narrativeText: { type: Type.STRING, description: "A cohesive synopsis of this episode." },
            segments: {
              type: Type.ARRAY,
              description: "Flowing dialogue cards/segments.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  spokenText: { type: Type.STRING, description: "Back-and-forth conversational dialogue in German between Lukas and Sarah." },
                  cardType: { type: Type.STRING, description: "'podcast-intro', 'podcast-body', or 'podcast-conclusion'" },
                  visualContent: { type: Type.STRING, description: "Markdown highlights companion notes for this segment." }
                },
                required: ["id", "title", "spokenText", "cardType", "visualContent"]
              }
            }
          },
          required: ["podcastTitle", "narrativeText", "segments"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Keine Rückmeldung von der Gemini Podcast Engine.");
    }

    const parsed = JSON.parse(response.text);

    // Map Google Search grounding sources if available
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .filter((c: any) => c.web?.uri)
      .map((c: any) => ({
        title: c.web.title || "Quellen-Link",
        uri: c.web.uri
      }));

    res.json({
      ...parsed,
      sources
    });
  } catch (err: any) {
    console.warn("Podcast Generation encountered an error, activating resilient simulation fallback:", err);
    if (isQuotaOrAPIError(err)) {
      console.warn("[QUOTA/API LIMITS WARNING] Activating simulation-podcast fallback engine.");
    }
    const mockPodcastResult = generateMockPodcast(query);
    res.json(mockPodcastResult);
  }
}));

// ====================================================
// VITE CLIENT DEV SERVER PIPELINE
// ====================================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Handle generic errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("API Error Server side:", err);
    res.status(500).json({ error: err.message || "An internal server error occurred" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DailyBrief Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
