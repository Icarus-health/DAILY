import React, { useState } from "react";
import { 
  Sliders, Star, CheckCircle, MessageSquare, Shield, Info, HelpCircle, 
  Sparkles, Award, ClipboardCheck, ArrowUpRight, Zap, RefreshCw, Layers, Check, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UsabilityLabProps {
  activeLayout: "apple" | "spotify" | "google";
  onChangeLayout: (layout: "apple" | "spotify" | "google") => void;
  onRunAudit: (message: string) => void;
  auditLogs: Array<{ timestamp: string; note: string; source: string }>;
}

export default function UsabilityLab({ 
  activeLayout, 
  onChangeLayout, 
  onRunAudit, 
  auditLogs 
}: UsabilityLabProps) {
  const [activeTab, setActiveTab] = useState<"abtest" | "sus" | "checklist" | "thinking">("abtest");
  
  // SUS State (10 official questions)
  const [susAnswers, setSusAnswers] = useState<number[]>([4, 1, 5, 1, 4, 1, 5, 1, 5, 1]);
  const susQuestions = [
    "Ich denke, dass ich dieses System gerne häufig benutzen würde.",
    "Ich fand das System unnötig komplex.",
    "Ich fand das System einfach zu benutzen.",
    "Ich denke, dass ich Support brauche, um das System zu nutzen.",
    "Ich fand, dass die Funktionen gut integriert waren.",
    "Ich fand, dass es im System zu viele Inkonsistenzen gab.",
    "Ich kann mir vorstellen, dass die meisten Menschen den Umgang sehr schnell lernen.",
    "Ich fand das System sehr umständlich zu nutzen.",
    "Ich fühlte mich bei der Nutzung des Systems sehr sicher.",
    "Ich musste eine Menge lernen, bevor ich anfangen konnte."
  ];

  // Calculate SUS Score (0 - 100)
  const calculateSus = () => {
    let score = 0;
    susAnswers.forEach((ans, index) => {
      if ((index + 1) % 2 !== 0) {
        // Odd questions: (score - 1)
        score += (ans - 1);
      } else {
        // Even questions: (5 - score)
        score += (5 - ans);
      }
    });
    return score * 2.5;
  };

  const getSusGrade = (score: number) => {
    if (score >= 85) return { grade: "A+ Excellent", desc: "Weltklasse-Usability (wie Apple/Spotify Best Cases).", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    if (score >= 73) return { grade: "B Good", desc: "Gute Gebrauchstauglichkeit. Das System ist hocheffektiv und intuitiv.", color: "text-green-650 bg-green-50/50 border-green-200" };
    if (score >= 68) return { grade: "C Satisfactory", desc: "Durchschnittliche Usability. Einige Dinge könnten vereinfacht werden.", color: "text-amber-600 bg-amber-50 border-amber-200" };
    return { grade: "F Poor", desc: "Mangelhafte Gebrauchstauglichkeit. Dringender Redesign-Bedarf.", color: "text-rose-600 bg-rose-50 border-rose-200" };
  };

  const susScore = calculateSus();
  const susGrade = getSusGrade(susScore);

  // Guidelines Checklist items
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    learn: true,
    speed: true,
    clarity: true,
    structure: true,
    coherence: true,
    distraction: true,
    trust: true
  });

  const toggleCheck = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Thinking Aloud Simulation Presets
  const simulationRemarks = [
    { text: "Der 'Make It Simple' Claim wird durch das super saubere Layout sofort eingelöst.", speaker: "Tester Thomas (Creative Director)" },
    { text: "Die Audio-Playlist erinnert mich stark an Spotify - extrem vertraut und direkt spielbar.", speaker: "Testerin Sophie (Senior UX Designer)" },
    { text: "Kommando-Zentrale und To-dos in einem eleganten Stream. Keine Ablenkungen mehr.", speaker: "Tester Dr. Becker (Product Lead)" },
    { text: "Es gibt keine verwirrende Fachsprache mehr. Alles wirkt wie aus einem Guss.", speaker: "Testerin Sarah (Heuristic Expert)" }
  ];

  const handleSimulateUserNote = (rem: { text: string; speaker: string }) => {
    onRunAudit(`[${rem.speaker}]: "${rem.text}"`);
    // Pronounce the feedback using SpeechSynthesis if active
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(rem.text);
      u.lang = "de-DE";
      u.rate = 1.25;
      window.speechSynthesis.speak(u);
    }
  };

  // Consortium Roles Advisory
  const expertAdvisors = [
    {
      role: "Lead UX Architect",
      focus: "Apple-Style Elegance",
      quote: "Minimalismus ist nicht das Fehlen von Design. Es ist die perfekte Dichte an Leerraum. Die Sans-Serif Typografie gepaart mit den weichen Karten-Kanten fokussiert das Gehirn auf das Wesentliche.",
      action: "Erhöht die 'Zufriedenheit' (DIN ISO 9241)."
    },
    {
      role: "Product Audio Designer",
      focus: "Spotify-Style Immersive Player",
      quote: "Ein schwebender Audioplayer mit visualisierter Seek-Bar schafft direkte Kontrolle. Audio braucht haptische Synchronität. Der Live-Wellen-Ausschlag gibt permanentes Feedback.",
      action: "Erhöht die 'Erlernbarkeit' und Interaktion."
    },
    {
      role: "Human Factors Specialist",
      focus: "Google-Style Cognitive Usability",
      quote: "Menschen übertragen gelernte Webmuster (Mental Models) auf neue Apps. Durch die Kombination von bento-ähnlichen Widgets mit eindeutigen To-dos lösen wir kognitiven Stress auf.",
      action: "Erhöht die 'Effektivität' und eliminiert Fehler."
    }
  ];

  return (
    <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.02)] flex flex-col h-full text-left" id="usability-lab-panel">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-neutral-950 flex items-center justify-center text-white">
            <Sliders className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-sans font-bold text-sm text-neutral-900 tracking-tight flex items-center gap-1.5">
              Usability-Laboratorium 
              <span className="text-[9px] font-mono py-0.5 px-2 bg-neutral-100 rounded-full text-neutral-500 font-extrabold uppercase animate-pulse">Live</span>
            </h3>
            <span className="text-[10px] font-mono text-neutral-400 font-medium">CONSOR-MEMBER DIAGNOSTICS</span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-neutral-50 border border-neutral-200/50 p-1 rounded-full">
          {(["abtest", "sus", "checklist", "thinking"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide transition cursor-pointer ${
                activeTab === tab ? "bg-black text-white" : "text-neutral-500 hover:text-black hover:bg-neutral-100/50"
              }`}
            >
              {tab === "abtest" ? "A/B Layout" : tab === "sus" ? "SUS Rating" : tab === "checklist" ? "Prüfung" : "Think Aloud"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: A/B TESTING & VISUAL THEMES */}
          {activeTab === "abtest" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              key="abtest"
              className="flex flex-col gap-4"
            >
              <div className="p-4 bg-neutral-50/70 border border-neutral-200/40 rounded-2xl flex flex-col gap-1.5">
                <span className="text-[8px] font-mono text-neutral-405 font-black uppercase tracking-widest flex items-center gap-1">
                  <Layers className="h-3 w-3 text-neutral-500" /> A/B Usability Experimentierphase
                </span>
                <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                  Wechsle die Benutzeroberfläche und erlebe unterschiedliche Gestaltungsphilosophien der namhaften Vorbilder in Echtzeit.
                </p>
              </div>

              {/* Layout Choices */}
              <div className="grid grid-cols-1 gap-3">
                {/* 1. APPLE */}
                <button
                  onClick={() => onChangeLayout("apple")}
                  className={`p-4 rounded-2xl border text-left transition relative flex items-center justify-between group cursor-pointer ${
                    activeLayout === "apple"
                      ? "bg-[#FAF9F5] border-black shadow-sm"
                      : "bg-[#FFFFFF] border-neutral-200/70 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-black uppercase font-bold tracking-widest px-1.5 py-0.5 bg-neutral-100 rounded">Option A</span>
                      <span className="text-xs font-bold text-neutral-900 font-sans">Apple Minimalism (Sanctuary)</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-normal">
                      Serif-Kombinationen, off-white Canvas, maximale Abstände und feine Linien. Exzellent für Lesbarkeit &amp; kognitive Ruhe.
                    </p>
                  </div>
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 border ${activeLayout === "apple" ? "bg-black border-black text-white" : "border-neutral-300 group-hover:bg-neutral-100"}`}>
                    {activeLayout === "apple" && <Check className="h-3 w-3" />}
                  </div>
                </button>

                {/* 2. SPOTIFY */}
                <button
                  onClick={() => onChangeLayout("spotify")}
                  className={`p-4 rounded-2xl border text-left transition relative flex items-center justify-between group cursor-pointer ${
                    activeLayout === "spotify"
                      ? "bg-[#18181b] text-neutral-100 border-[#10b981] shadow-md"
                      : "bg-[#FFFFFF] border-neutral-200/70 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-emerald-505 uppercase font-bold tracking-widest px-1.5 py-0.5 bg-neutral-150 rounded">Option B</span>
                      <span className={`text-xs font-bold font-sans ${activeLayout === "spotify" ? "text-emerald-400" : "text-neutral-900"}`}>Spotify Dark Mode (Audio-Focus)</span>
                    </div>
                    <p className={`text-[11px] leading-normal ${activeLayout === "spotify" ? "text-neutral-400" : "text-neutral-500"}`}>
                      Kohlschwarzes Ambient-Design mit neongrünen Akzenten, hochpräzisen Signal-Badges und immersivem Audioplayer. Reduziert die visuelle Ermüdung drastisch.
                    </p>
                  </div>
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 border ${activeLayout === "spotify" ? "bg-emerald-500 border-emerald-500 text-white" : "border-neutral-300 group-hover:bg-neutral-100"}`}>
                    {activeLayout === "spotify" && <Check className="h-3 w-3 text-black" />}
                  </div>
                </button>

                {/* 3. GOOGLE */}
                <button
                  onClick={() => onChangeLayout("google")}
                  className={`p-4 rounded-2xl border text-left transition relative flex items-center justify-between group cursor-pointer ${
                    activeLayout === "google"
                      ? "bg-sky-50/20 border-sky-400/80 shadow-sm"
                      : "bg-[#FFFFFF] border-neutral-200/70 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-sky-600 uppercase font-bold tracking-widest px-1.5 py-0.5 bg-sky-50 rounded">Option C</span>
                      <span className={`text-xs font-bold font-sans ${activeLayout === "google" ? "text-sky-950" : "text-neutral-900"}`}>Google Workspace Material Split</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-normal">
                      Flache, hochstrukturierte Bento-Wand mit farbig hinterlegten Titelleisten. Extrem intuitiv, erlernbar und übersichtlich gegliedert.
                    </p>
                  </div>
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 border ${activeLayout === "google" ? "bg-sky-650 border-sky-650 text-white" : "border-neutral-300 group-hover:bg-neutral-100"}`}>
                    {activeLayout === "google" && <Check className="h-3 w-3" />}
                  </div>
                </button>
              </div>

              {/* Expert Advice Box */}
              <div className="mt-2 border-t border-neutral-100 pt-4">
                <span className="text-[9px] font-mono text-neutral-400 font-bold uppercase tracking-widest block mb-2.5">Expertengremium Feedback</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {expertAdvisors.map(adv => (
                    <div key={adv.role} className="p-3 bg-neutral-50/70 border border-neutral-105 rounded-xl text-left flex flex-col gap-1">
                      <span className="text-[9px] font-sans font-extrabold text-[#111111] leading-none">{adv.role}</span>
                      <span className="text-[8px] font-mono text-neutral-400 leading-none">{adv.focus}</span>
                      <p className="text-[9.5px] text-neutral-600 italic leading-snug font-sans mt-1.5 border-l border-neutral-300 pl-1.5">
                        "{adv.quote}"
                      </p>
                      <span className="text-[8px] font-semibold text-emerald-650 mt-1.5 block">{adv.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: SYSTEM USABILITY SCALE (SUS) */}
          {activeTab === "sus" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              key="sus"
              className="flex flex-col gap-4"
            >
              <div className="p-4 bg-neutral-55 border border-neutral-200/40 rounded-2xl">
                <h4 className="font-sans font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-neutral-800" /> System Usability Scale (SUS) Evaluierung
                </h4>
                <p className="text-[11px] text-neutral-500 leading-normal mt-1">
                  Der standardisierte SUS-Wert misst die generelle Usability als Index (0 bis 100). Bewerte deine aktuelle Erfahrung mit den Schiebereglern:
                </p>
              </div>

              {/* Live Score Header Badge */}
              <div className={`p-4 border rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 transition-colors ${susGrade.color}`}>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-mono uppercase tracking-widest font-black text-neutral-400">Errechneter Indexwert</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-sans font-extrabold leading-none">{susScore.toFixed(0)}</span>
                    <span className="text-sm font-mono font-bold">/ 100</span>
                  </div>
                  <p className="text-[10px] mt-1 leading-snug font-medium max-w-sm">{susGrade.desc}</p>
                </div>
                <div className="px-5 py-2.5 bg-white shadow-sm border border-black/10 rounded-xl text-center flex flex-col leading-none">
                  <span className="text-[8px] font-mono text-neutral-400 font-extrabold uppercase">Grade-Rating</span>
                  <span className="text-xl font-sans font-black text-neutral-950 mt-1">{susGrade.grade.split(" ")[0]}</span>
                </div>
              </div>

              {/* Slider list */}
              <div className="flex flex-col gap-3 py-1 pr-1 max-h-[250px] overflow-y-auto scrollbar-thin">
                {susQuestions.map((q, idx) => (
                  <div key={idx} className="p-3 bg-neutral-50/50 border border-neutral-200/40 rounded-xl flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-[10.5px] font-mono uppercase tracking-wide text-neutral-400 shrink-0 select-none">Q{(idx + 1).toString().padStart(2, '0')}:</span>
                      <p className="text-[11px] text-neutral-750 font-sans font-medium select-none">{q}</p>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[9px] text-neutral-400 font-mono select-none">Stimme nicht zu</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={susAnswers[idx]}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          const copy = [...susAnswers];
                          copy[idx] = val;
                          setSusAnswers(copy);
                        }}
                        className="flex-1 accent-black h-1 bg-neutral-200 rounded appearance-none cursor-pointer"
                      />
                      <span className="text-[9px] text-neutral-400 font-mono select-none">Stimme voll zu</span>
                      <span className="text-xs font-mono font-extrabold w-4 text-center text-neutral-850 select-none bg-neutral-100 py-0.5 rounded px-1">{susAnswers[idx]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 3: GUIDELINES CHECKLIST */}
          {activeTab === "checklist" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              key="checklist"
              className="flex flex-col gap-3"
            >
              <div className="p-4 bg-neutral-50/50 border border-neutral-200/40 rounded-2xl">
                <h4 className="font-sans font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                  <ClipboardCheck className="h-4 w-4 text-neutral-800" /> DIN ISO 9241 &amp; Marketing-Checkliste
                </h4>
                <p className="text-[11px] text-neutral-500 leading-normal mt-1">
                  Bewerte, ob das Redesign die Anforderungen aus deiner Usability-Definition erfüllt. Jedes Häkchen sichert den Verbleib der Probanden und maximiert die Conversion-Rate.
                </p>
              </div>

              {/* Checklist Group */}
              <div className="flex flex-col gap-2">
                {[
                  { key: "clarity", title: "Eindeutigkeit & Soforterfassbarkeit der Inhalte", desc: "Verstehen Nutzer*innen Sinn und Zweck innerhalb der ersten 3 Sekunden?", score: "Zufriedenheit 100%" },
                  { key: "structure", title: "Klare bento-ähnliche Navigation & Struktur", desc: "Gute Orientierung ohne kognitiven Überlauf. Wichtigste Info steht ganz oben.", score: "Bounce-Rate sinkt" },
                  { key: "coherence", title: "Kohärente Farb- und Schriftsprache ('Make It Simple')", desc: "Kein Clutter, einheitliche Symbole aus lucide, keine Margin-Verzierung.", score: "Vertrauen steigt" },
                  { key: "distraction", title: "Reduzierte Designelemente verhindern Fehler", desc: "Fokussiert voll auf das Generieren und Anhören des Podcasts bzw. Briefs.", score: "Höhere Conversions" },
                  { key: "speed", title: "Gefühlte & reale Schnelligkeit bei der Generierung", desc: "Fließende Status-Phasen verringern die wahrgenommene Wartezeit im UI.", score: "ISO-Norm konform" },
                  { key: "learn", title: "Erlernbarkeit des Systems ohne Handbuch", desc: "Auch unerfahrene Benutzer starten den Briefing-Prozess sofort.", score: "Traffic-Verdopplung" },
                  { key: "trust", title: "Glaubwürdiger, geschützter Datenzugriff", desc: "Firebase Anbindung / lokaler fiktiver Sandbox-Simulator zur Sicherheit.", score: "SEO-Ranking optimiert" },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => toggleCheck(item.key)}
                    className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                      checklist[item.key] 
                        ? "bg-emerald-50/10 border-emerald-200 text-neutral-850" 
                        : "bg-white border-neutral-200 text-neutral-400"
                    }`}
                  >
                    <div className={`mt-0.5 h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 transition ${
                      checklist[item.key] ? "bg-black border-black text-white" : "border-neutral-300 bg-neutral-50"
                    }`}>
                      {checklist[item.key] && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`text-xs font-bold leading-tight ${checklist[item.key] ? "text-neutral-900" : "text-neutral-500"}`}>{item.title}</span>
                        <span className="text-[8px] font-mono uppercase bg-neutral-100 text-neutral-500 py-0.5 px-2 rounded-full font-black shrink-0">{item.score}</span>
                      </div>
                      <p className="text-[10.5px] text-neutral-550 leading-normal mt-0.5 font-medium">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 4: THINKING ALOUD SIMULATOR */}
          {activeTab === "thinking" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              key="thinking"
              className="flex flex-col gap-3"
            >
              <div className="p-4 bg-neutral-50/50 border border-neutral-200/40 rounded-2xl">
                <h4 className="font-sans font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-neutral-800" /> Lautes Denken (Thinking Aloud Method)
                </h4>
                <p className="text-[11px] text-neutral-500 leading-normal mt-1">
                  Die effektivste Methode, um unbewusste Reaktionen aufzudecken. Klicke auf eine Persona, um deren ungefilterte Live-Reaktion auf das Redesign anzuhören und im System-Log zu protokollieren.
                </p>
              </div>

              {/* Grid of Simulation Triggers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {simulationRemarks.map((rem, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSimulateUserNote(rem)}
                    className="p-3 bg-[#FFFFFF] border border-neutral-200/50 hover:bg-neutral-50/50 rounded-xl text-left transition flex flex-col gap-1 cursor-pointer group active:scale-[0.99] border-l-2 border-l-black"
                  >
                    <span className="text-[9px] font-mono text-neutral-400 font-extrabold flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-500" /> {rem.speaker}
                    </span>
                    <p className="text-[11px] text-neutral-700 leading-snug font-serif italic mt-0.5 group-hover:text-black">
                      "{rem.text}"
                    </p>
                  </button>
                ))}
              </div>

              {/* Logs */}
              <div className="mt-2 border-t border-neutral-100 pt-3">
                <span className="text-[9px] font-mono text-neutral-400 font-bold uppercase tracking-widest block mb-1.5">Mitschrift Auditleitfaden ({auditLogs.length})</span>
                <div className="bg-[#FAF9F6] border border-neutral-205 rounded-xl p-3 max-h-[140px] overflow-y-auto font-mono text-[10px] text-neutral-600 flex flex-col gap-1.5">
                  {auditLogs.length === 0 ? (
                    <span className="text-neutral-400 italic">Noch keine Live-Mitschriften protokolliert.</span>
                  ) : (
                    auditLogs.map((log, lIdx) => (
                      <div key={lIdx} className="border-b border-neutral-200/40 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-[8px] text-neutral-400">{log.timestamp} • {log.source}</span>
                        <p className="text-neutral-900 leading-relaxed font-sans font-semibold mt-0.5">{log.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
