import React from "react";
import { BriefingSegment } from "../types";
import { Cloud, CheckCircle, Award, Compass, HelpCircle, Activity, ExternalLink, Calendar, MessageSquareQuote } from "lucide-react";
import { motion } from "motion/react";

interface BriefingCardProps {
  key?: React.Key | string | number;
  segment: BriefingSegment;
  isActive: boolean;
  isSpoken: boolean;
}

const renderMarkdownToHtml = (md?: string) => {
  if (!md) return "";
  let html = md;
  
  // Clean escape entities safely
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  // Header tags
  html = html.replace(/^### (.*$)/gim, '<h5 class="font-sans font-bold text-black/90 text-xs uppercase tracking-wider mt-3 mb-1.5">$1</h5>');
  html = html.replace(/^## (.*$)/gim, '<h5 class="font-serif font-bold text-black text-sm mt-4 mb-2">$1</h5>');
  html = html.replace(/^# (.*$)/gim, '<h4 class="font-serif font-black text-black text-base mt-4 mb-2">$1</h4>');
  
  // Strong tags
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-black">$1</strong>');
  
  // Italic tags
  html = html.replace(/\*(.*?)\*/g, '<em class="italic text-neutral-800 font-medium">$1</em>');
  
  // List bullets
  html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li class="ml-4 pl-1 list-disc text-neutral-700 leading-relaxed mb-0.5">$1</li>');
  
  // Newline splits
  html = html.replace(/\n/g, '<br />');
  
  return html;
};

export default function BriefingCard({ segment, isActive, isSpoken }: BriefingCardProps) {
  const getIcon = () => {
    switch (segment.cardType) {
      case "weather":
        return <Cloud className={`h-4.5 w-4.5 ${isActive ? 'text-black' : 'text-neutral-500'}`} />;
      case "tasks":
        return <CheckCircle className={`h-4.5 w-4.5 ${isActive ? 'text-black' : 'text-neutral-400'}`} />;
      case "insight":
        return <Award className={`h-4.5 w-4.5 ${isActive ? 'text-black' : 'text-neutral-400'}`} />;
      case "intro":
      case "podcast-intro":
        return <Compass className={`h-4.5 w-4.5 ${isActive ? 'text-black' : 'text-neutral-400'}`} />;
      case "interruption":
        return <Activity className={`h-4.5 w-4.5 ${isActive ? 'text-black' : 'text-neutral-400'}`} />;
      default:
        return <HelpCircle className={`h-4.5 w-4.5 ${isActive ? 'text-black' : 'text-neutral-400'}`} />;
    }
  };

  const getCardTheme = () => {
    if (isActive) {
      return "border-black bg-white shadow-[6px_6px_0px_0px_rgba(17,17,17,1)] scale-[1.01]";
    }
    if (isSpoken) {
      return "border-black/5 bg-white/40 opacity-60";
    }
    return "border-black/10 bg-white/80 hover:bg-white hover:border-black/20";
  };

  return (
    <motion.div
      id={`card-${segment.id}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative p-6 rounded-2xl border transition-all duration-300 ${getCardTheme()} flex flex-col gap-4 group text-[#111111]`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isActive ? 'bg-[#F9F9F8] border border-black/10 text-black' : 'bg-neutral-100 text-neutral-500'}`}>
            {getIcon()}
          </div>
          <span className={`text-[10px] font-mono tracking-[0.2em] uppercase font-bold ${isActive ? 'text-black' : 'text-neutral-400'}`}>
            {segment.cardType}
          </span>
        </div>
        {isActive && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-45"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
          </span>
        )}
      </div>

      <div>
        <h3 className={`font-serif text-lg md:text-xl font-bold tracking-tight ${isActive ? 'text-black' : 'text-neutral-800'}`}>
          {segment.title}
        </h3>
      </div>

      {/* Visual Render area for weather, tasks, news etc. */}
      <div className="text-xs leading-relaxed font-sans text-neutral-700">
        {segment.cardType === "weather" && segment.data?.weatherTemp && (
          <div className="bg-[#F9F9F8] p-4 h-full rounded-xl border border-black/10 flex flex-col justify-between my-1">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-3xl font-serif italic font-bold text-black">{segment.data.weatherTemp}</span>
                <span className="text-xs text-neutral-500 ml-2 font-medium">{segment.data.weatherCondition}</span>
              </div>
              <Cloud className="h-7 w-7 text-black opacity-80" />
            </div>
            {segment.data.weatherHighLow && (
              <span className="text-[10px] text-neutral-400 font-mono mt-2.5 block tracking-wider">{segment.data.weatherHighLow}</span>
            )}
          </div>
        )}

        {segment.cardType === "tasks" && segment.data?.tasks && segment.data.tasks.length > 0 && (
          <div className="my-1 flex flex-col gap-2 bg-[#F9F9F8] p-4 rounded-xl border border-black/10">
            {segment.data.tasks.map((task, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <div className="mt-1 flex-shrink-0">
                  <span className="block h-1.5 w-1.5 rounded-full bg-black" />
                </div>
                <span className="text-xs text-neutral-800 font-medium">{task}</span>
              </div>
            ))}
          </div>
        )}

        {segment.cardType === "news" && (
          <div className="my-1 bg-[#F9F9F8] p-4 rounded-xl border border-black/10 flex flex-col gap-2">
            <span className="text-[9px] font-mono uppercase text-neutral-400 tracking-wider font-bold">LATEST GROUNDED TOPIC:</span>
            <div 
              className="text-xs text-neutral-800 leading-relaxed font-sans" 
              dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(segment.visualContent) }} 
            />
            {segment.data?.newsSource && (
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono mt-1">
                <Compass className="h-3 w-3 text-neutral-400" />
                <span>Source: {segment.data.newsSource}</span>
              </div>
            )}
          </div>
        )}

        {segment.cardType !== "weather" && segment.cardType !== "tasks" && segment.cardType !== "news" && (
          <div 
            className="text-xs text-neutral-700 leading-relaxed font-sans mt-0.5 space-y-1"
            dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(segment.visualContent) }}
          />
        )}
      </div>

      {isActive && (
        <div className="mt-2 bg-[#F9F9F8] p-4 rounded-xl border border-black/10 flex items-start gap-3">
          <MessageSquareQuote className="h-4 w-4 text-black/30 mt-0.5 flex-shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-mono uppercase text-black/45 tracking-widest font-bold">Currently Reading:</span>
            <p className="text-xs text-black italic font-serif leading-relaxed">
              "{segment.spokenText}"
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
