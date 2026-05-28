import { DailyBrief, UserSettings, DbTask } from "./firebase";

export interface GeneratedBriefPayload {
  briefingTitle: string;
  narrativeText: string;
  summaryBullets: string[];
  weatherContent: string;
  newsContent: string;
  calendarContent: string;
  emailsContent: string;
  tasksContent: string;
  esignContent: string;
}

export async function generateBriefingOnServer(
  userId: string, 
  date: string, 
  settings: UserSettings, 
  tasks: DbTask[],
  customCalendar?: string,
  customEmails?: string,
  customNews?: string,
  customWeather?: string,
  customESign?: string
): Promise<GeneratedBriefPayload> {
  const response = await fetch("/api/briefing/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      userId, 
      date, 
      settings, 
      tasks, 
      customCalendar, 
      customEmails, 
      customNews, 
      customWeather,
      customESign
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server responded with status ${response.status}`);
  }

  return await response.json() as GeneratedBriefPayload;
}

export async function generateBriefingAudio(text: string, voiceName: string = "Kore"): Promise<string> {
  const response = await fetch("/api/briefing/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice: voiceName })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `TTS conversion request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.audioContent; // Base64 PCM/WAV content
}

export interface GoogleCalendarEvent {
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export async function fetchGoogleCalendarEvents(accessToken: string): Promise<string> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
  
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startOfDay)}&timeMax=${encodeURIComponent(endOfDay)}&singleEvents=true&orderBy=startTime`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Google Calendar API list failed with code ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const items: GoogleCalendarEvent[] = data.items || [];
  if (items.length === 0) {
    return "Keine Termine für heute im Google Kalender eingetragen.";
  }

  return items.map(event => {
    let timeStr = "";
    if (event.start?.dateTime) {
      const startLocal = new Date(event.start.dateTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      const endLocal = event.end?.dateTime ? new Date(event.end.dateTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "";
      timeStr = endLocal ? `${startLocal} - ${endLocal}` : startLocal;
    } else if (event.start?.date) {
      timeStr = "Ganztägig";
    }
    return `- ${timeStr}: ${event.summary || "Kein Titel"}`;
  }).join("\n");
}

export async function fetchGoogleGmailEmails(accessToken: string): Promise<string> {
  const listUrl = `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=8&q=label:INBOX`;
  const listResponse = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept": "application/json"
    }
  });

  if (!listResponse.ok) {
    throw new Error(`Gmail API list failed with code ${listResponse.status}: ${listResponse.statusText}`);
  }

  const listData = await listResponse.json();
  const messages = listData.messages || [];

  if (messages.length === 0) {
    return "Keine neuen E-Mails im Gmail Posteingang gefunden.";
  }

  const details = await Promise.all(
    messages.slice(0, 5).map(async (msg: any) => {
      try {
        const detailRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Accept": "application/json"
          }
        });
        if (!detailRes.ok) return null;
        return await detailRes.json();
      } catch (e) {
        console.error("Error fetching message details for id: " + msg.id, e);
        return null;
      }
    })
  );

  const formattedEmails = details
    .filter(d => d !== null)
    .map((detail: any) => {
      const headers = detail.payload?.headers || [];
      const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unbekannt";
      const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "Kein Betreff";
      const snippet = detail.snippet || "";
      
      return `- Von: ${from} - Betreff: ${subject} - Vorschau: ${snippet}`;
    });

  if (formattedEmails.length === 0) {
    return "Keine neuen E-Mails im Gmail Posteingang lesbar.";
  }

  return formattedEmails.join("\n");
}

export interface GoogleTask {
  id: string;
  title: string;
  status: "needsAction" | "completed";
  due?: string;
  notes?: string;
  updated?: string;
}

export async function fetchGoogleTasks(accessToken: string): Promise<GoogleTask[]> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?maxResults=50`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Google Tasks API list failed with code ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items || [];
}

export async function createGoogleTask(accessToken: string, title: string, notes?: string): Promise<GoogleTask> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/@default/tasks`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      title,
      notes,
    })
  });

  if (!response.ok) {
    throw new Error(`Google Tasks API create failed with code ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

export async function updateGoogleTaskStatus(accessToken: string, taskId: string, completed: boolean): Promise<GoogleTask> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      status: completed ? "completed" : "needsAction"
    })
  });

  if (!response.ok) {
    throw new Error(`Google Tasks API update failed with code ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

export async function deleteGoogleTask(accessToken: string, taskId: string): Promise<void> {
  const url = `https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Google Tasks API delete failed with code ${response.status}: ${response.statusText}`);
  }
}

