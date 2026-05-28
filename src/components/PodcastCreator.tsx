import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Compass, HelpCircle, Flame, Network } from "lucide-react";
import { CustomPodcast } from "../types";

interface PodcastCreatorProps {
  onPodcastGenerated: (podcast: CustomPodcast) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
}

const SUGGESTIONS = [
  "Why is everyone talking about this new social app?",
  "Tell me the history of that building I walk past every day.",
  "What is the current state of ambient computing?",
  "Explain quantum superpositions using simple kitchen metaphors."
];

const LOADING_STATUSES = [
  "Consulting Google Search grounding indexes...",
  "Synthesizing latest articles and topics...",
  "Drafting personalized conversational podcast audio...",
  "Formatting responsive card modules for playback sync...",
  "Finalizing voice narration matrices..."
];

export default function PodcastCreator({ onPodcastGenerated, isGenerating, setIsGenerating }: PodcastCreatorProps) {
  const [query, setQuery] = useState("");
  const [statusIdx, setStatusIdx] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setStatusIdx((prev) => (prev + 1) % LOADING_STATUSES.length);
      }, 3000);
    } else {
      setStatusIdx(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsGenerating(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/podcast/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate custom podcast. Please check your network connection.");
      }

      const data: CustomPodcast = await response.json();
      onPodcastGenerated(data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Something went wrong during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-6 md:p-12 bg-white rounded-3xl border border-black/10 shadow-[8px_8px_0px_0px_rgba(17,17,17,0.03)] text-black">
      <div className="flex items-center gap-1.5 px-3 py-1 bg-black text-[#F9F9F8] rounded-full border border-black mb-5">
        <Sparkles className="h-3 w-3 text-white" />
        <span className="text-[9px] font-mono tracking-[0.2em] font-bold uppercase">daily podcast studio</span>
      </div>

      <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-black text-center mb-2">
        Turn any curiosity into a personal podcast
      </h2>
      <p className="text-xs text-neutral-500 text-center max-w-md mb-8">
        Daily turns any concept, query, or customized research topic into a beautifully paced, conversational podcast briefing in real-time.
      </p>

      {isGenerating ? (
        <div className="w-full flex flex-col items-center justify-center py-12 gap-5">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-t-2 border-black animate-spin" />
            <div className="absolute inset-2 rounded-full border-b-2 border-black/30 animate-spin-reverse" />
            <Compass className="h-5 w-5 text-black animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-xs text-black font-mono tracking-wider uppercase font-semibold transition-all duration-500">
              {LOADING_STATUSES[statusIdx]}
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">Generating audio cues & visual companion feeds...</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="What are you curious about today?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-5 py-4 pr-14 bg-[#F9F9F8] border border-black/15 rounded-2xl text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black transition"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="absolute right-2.5 p-2 bg-black hover:bg-neutral-800 disabled:opacity-35 text-white font-semibold rounded-xl leading-none transition duration-150 cursor-pointer"
            >
              <ArrowRight className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-[9px] font-mono uppercase text-neutral-400 tracking-[0.2em] font-bold">Inspiration Topics:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className="p-4 bg-[#F9F9F8] hover:bg-black hover:text-white text-left rounded-xl border border-black/10 text-xs text-neutral-600 font-medium transition duration-150 flex items-start gap-2 group cursor-pointer"
                >
                  <Flame className="h-3.5 w-3.5 text-neutral-400 mt-0.5 group-hover:text-amber-500 flex-shrink-0" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      )}

      {errorMessage && (
        <div className="mt-4 p-3.5 bg-red-50 rounded-xl border border-red-200 w-full text-center">
          <span className="text-xs text-red-600 font-sans font-medium">{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
