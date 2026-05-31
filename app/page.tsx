"use client";

import { useEffect, useRef, useState } from "react";

type Translation = {
  literal: string;
  actually_means: string;
  vibe: string;
  confidence: number;
  tell: string;
  suggested_response: string;
};

const VIBE_COLORS: Record<string, string> = {
  "passive-aggressive": "bg-red-500/10 text-red-300 border-red-500/30",
  "polite-no": "bg-orange-500/10 text-orange-300 border-orange-500/30",
  "hidden-frustration": "bg-rose-500/10 text-rose-300 border-rose-500/30",
  "gentle-pushback": "bg-amber-500/10 text-amber-300 border-amber-500/30",
  "fake-enthusiasm": "bg-pink-500/10 text-pink-300 border-pink-500/30",
  "real-praise": "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  "urgency-disguised": "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30",
  "buying-time": "bg-sky-500/10 text-sky-300 border-sky-500/30",
  cya: "bg-slate-500/10 text-slate-300 border-slate-500/30",
  sincere: "bg-teal-500/10 text-teal-300 border-teal-500/30",
};

const EXAMPLES = [
  "I'll circle back on this once I have more bandwidth.",
  "Per my last email, the deadline was Friday.",
  "Interesting approach — have you considered the tradeoffs?",
  "It's fine, really. Let's just move on.",
  "We should definitely grab coffee sometime soon.",
];

type SR = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>; resultIndex: number }) => void;
  onerror: (e: { error: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

export default function Home() {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SR | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SR;
      webkitSpeechRecognition?: new () => SR;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) finalText += text;
        else interimText += text;
      }
      if (finalText) {
        setTranscript((prev) => (prev ? prev + " " : "") + finalText.trim());
      }
      setInterimTranscript(interimText);
    };

    recognition.onerror = (e) => {
      setError(`Speech error: ${e.error}`);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = async () => {
    setError(null);
    setTranslation(null);
    setTranscript("");
    setInterimTranscript("");

    if (!supported) {
      setError("Speech recognition isn't supported in this browser. Use Chrome or Edge.");
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {
      setError(
        "Microphone blocked. Click the lock icon in the URL bar → allow mic → reload. " +
          (e instanceof Error ? `(${e.message})` : "")
      );
      return;
    }

    const r = recognitionRef.current;
    if (!r) {
      setError("Speech recognition not initialized. Try reloading the page.");
      return;
    }
    try {
      r.start();
      setListening(true);
    } catch (e) {
      setError(
        "Could not start mic: " +
          (e instanceof Error ? e.message : "unknown") +
          " — try reloading."
      );
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const translate = async (text?: string) => {
    const input = (text ?? transcript).trim();
    if (!input) return;
    setLoading(true);
    setError(null);
    setTranslation(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "translation failed");
      setTranslation(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something broke");
    } finally {
      setLoading(false);
    }
  };

  const useExample = (text: string) => {
    setTranscript(text);
    setTranslation(null);
    translate(text);
  };

  const reset = () => {
    setTranscript("");
    setInterimTranscript("");
    setTranslation(null);
    setError(null);
  };

  const liveText = transcript + (interimTranscript ? " " + interimTranscript : "");
  const vibeClass = translation ? VIBE_COLORS[translation.vibe] || VIBE_COLORS.sincere : "";

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Corporate-Speak{" "}
            <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              Decoder
            </span>
          </h1>
          <p className="mt-3 text-zinc-400">
            Speak the polite version. We&apos;ll show you what they actually mean.
          </p>
        </header>

        {!supported && (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 text-sm">
            Web Speech API not supported in this browser. Use Chrome or Edge — or type below.
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur">
          <div className="flex items-center justify-between gap-4 mb-4">
            <button
              onClick={listening ? stopListening : startListening}
              disabled={!supported}
              className={`relative flex items-center gap-3 rounded-full px-6 py-3 font-medium transition-all ${
                listening
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:opacity-90 text-white disabled:opacity-30 disabled:cursor-not-allowed"
              }`}
            >
              {listening && (
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50" />
              )}
              <span className="relative">
                {listening ? "Stop listening" : "Start speaking"}
              </span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => translate()}
                disabled={loading || !transcript.trim()}
                className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                {loading ? "Decoding…" : "Decode"}
              </button>
              <button
                onClick={reset}
                className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm font-medium transition"
              >
                Reset
              </button>
            </div>
          </div>

          <textarea
            value={liveText}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Speak or type... e.g. I'll circle back on this when I have bandwidth."
            className="w-full min-h-[100px] resize-none rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 text-zinc-100 placeholder-zinc-600 focus:border-fuchsia-500/50 focus:outline-none"
          />

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Try one</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => useExample(ex)}
                  className="rounded-full border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition"
                >
                  {ex.length > 50 ? ex.slice(0, 47) + "…" : ex}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm uppercase tracking-wider text-zinc-500">What they said</h2>
              <span className="text-xs text-zinc-600">polite version</span>
            </div>
            <p className="text-lg leading-relaxed text-zinc-200 min-h-[3rem]">
              {translation?.literal || transcript || (
                <span className="text-zinc-600 italic">Waiting for input…</span>
              )}
            </p>
          </div>

          <div
            className={`rounded-2xl border p-6 transition-all ${
              translation
                ? `${vibeClass} shadow-lg shadow-fuchsia-500/5`
                : "border-zinc-800 bg-zinc-900/40"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm uppercase tracking-wider opacity-70">
                What they actually mean
              </h2>
              {translation && (
                <span className="text-xs font-mono opacity-70">
                  {translation.confidence}% sure
                </span>
              )}
            </div>
            {translation ? (
              <>
                <p className="text-lg leading-relaxed font-medium">
                  {translation.actually_means}
                </p>
                <div className="mt-4 space-y-2 text-sm opacity-80">
                  <div>
                    <span className="font-semibold">Vibe:</span>{" "}
                    <span className="font-mono">{translation.vibe}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Tell:</span>{" "}
                    <span className="italic">&ldquo;{translation.tell}&rdquo;</span>
                  </div>
                  <div className="pt-2 border-t border-current/20">
                    <span className="font-semibold">Say back:</span>{" "}
                    {translation.suggested_response}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-zinc-600 italic">
                {loading ? "Reading between the lines…" : "Hit Decode to translate."}
              </p>
            )}
          </div>
        </div>

        <footer className="mt-12 text-center text-xs text-zinc-600">
          Built with Next.js + Groq · Web Speech works in Chrome/Edge
        </footer>
      </div>
    </main>
  );
}
