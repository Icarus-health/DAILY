export interface BriefingSegmentData {
  weatherTemp?: string;
  weatherCondition?: string;
  weatherHighLow?: string;
  tasks?: string[];
  newsSource?: string;
  newsLinks?: string[];
}

export interface BriefingSegment {
  id: string;
  title: string;
  spokenText: string;
  cardType: "intro" | "weather" | "tasks" | "insight" | "podcast-intro" | "podcast-body" | "podcast-conclusion" | "interruption" | string;
  visualContent: string; // Markdown or styled text
  data?: BriefingSegmentData;
}

export interface DailyBriefing {
  briefingTitle: string;
  narrativeText: string;
  segments: BriefingSegment[];
}

export interface CustomPodcast {
  id?: string;
  savedAt?: string;
  podcastTitle: string;
  narrativeText: string;
  segments: BriefingSegment[];
  sources?: { title: string; uri: string }[];
}

export interface InterruptionResponse {
  spokenText: string;
  title: string;
  visualContent: string;
}

export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
}
