"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TOTAL_PLAYERS = 4;
const TIMEOUT_OPTIONS = [3000, 5000, 7000, 10000] as const;
const DEFAULT_TIMEOUT = 3000;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type GameState = "idle" | "playing" | "failed" | "success";

export default function Home() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [locked, setLocked] = useState(false);
  const [timeoutMs, setTimeoutMs] = useState<number>(DEFAULT_TIMEOUT);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIMEOUT);
  const [paused, setPaused] = useState(false);

  const startAudioRef = useRef<HTMLAudioElement | null>(null);
  const failAudioRef = useRef<HTMLAudioElement | null>(null);
  const successAudioRef = useRef<HTMLAudioElement | null>(null);
  const pausedRef = useRef(false);

  const playSound = useCallback((ref: React.RefObject<HTMLAudioElement | null>) => {
    const audio = ref.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {
      /* 파일 없음/자동재생 차단은 조용히 무시 */
    });
  }, []);

  const stopSound = useCallback((ref: React.RefObject<HTMLAudioElement | null>) => {
    const audio = ref.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
    const audio = startAudioRef.current;
    if (!audio) return;
    if (paused) {
      if (!audio.paused) audio.pause();
    } else if (
      gameState === "playing" &&
      audio.currentTime > 0 &&
      audio.duration > 0 &&
      audio.currentTime < audio.duration
    ) {
      audio.play().catch(() => {});
    }
  }, [paused, gameState]);

  const withLock = useCallback(
    (fn: () => void) => {
      if (locked) return;
      setLocked(true);
      fn();
      setTimeout(() => setLocked(false), 250);
    },
    [locked],
  );

  const handleStart = useCallback(() => {
    withLock(() => {
      setPaused(false);
      setCurrentPlayer(1);
      setGameState("playing");
    });
  }, [withLock]);

  const handlePass = useCallback(() => {
    withLock(() => {
      setPaused(false);
      if (currentPlayer >= TOTAL_PLAYERS) {
        stopSound(startAudioRef);
        playSound(successAudioRef);
        setGameState("success");
      } else {
        setCurrentPlayer((n) => n + 1);
      }
    });
  }, [currentPlayer, playSound, stopSound, withLock]);

  const handleFail = useCallback(() => {
    withLock(() => {
      setPaused(false);
      stopSound(startAudioRef);
      playSound(failAudioRef);
      setGameState("failed");
    });
  }, [playSound, stopSound, withLock]);

  const handleReset = useCallback(() => {
    withLock(() => {
      setPaused(false);
      stopSound(startAudioRef);
      stopSound(failAudioRef);
      stopSound(successAudioRef);
      setCurrentPlayer(1);
      setGameState("idle");
      setTimeLeft(timeoutMs);
    });
  }, [stopSound, timeoutMs, withLock]);

  const handleTogglePause = useCallback(() => {
    if (gameState !== "playing") return;
    setPaused((p) => !p);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== "playing") {
      setTimeLeft(timeoutMs);
      return;
    }
    const startedAt = Date.now();
    let pausedAt: number | null = null;
    let pausedAccum = 0;
    setTimeLeft(timeoutMs);
    playSound(startAudioRef);

    const tick = setInterval(() => {
      if (pausedRef.current) {
        if (pausedAt === null) pausedAt = Date.now();
        return;
      }
      if (pausedAt !== null) {
        pausedAccum += Date.now() - pausedAt;
        pausedAt = null;
      }
      const remaining = timeoutMs - (Date.now() - startedAt - pausedAccum);
      if (remaining <= 0) {
        clearInterval(tick);
        setTimeLeft(0);
        stopSound(startAudioRef);
        playSound(failAudioRef);
        setGameState("failed");
      } else {
        setTimeLeft(remaining);
      }
    }, 50);
    return () => clearInterval(tick);
  }, [gameState, currentPlayer, playSound, stopSound, timeoutMs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (gameState === "idle" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        handleStart();
      } else if (gameState === "playing") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handlePass();
        } else if (e.key === "Escape" || e.key === "Backspace") {
          e.preventDefault();
          handleFail();
        } else if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          handleTogglePause();
        }
      } else if (
        (gameState === "failed" || gameState === "success") &&
        (e.key === " " || e.key === "Enter")
      ) {
        e.preventDefault();
        handleReset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameState, handleStart, handlePass, handleFail, handleReset, handleTogglePause]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center w-full px-6 py-10">
      <audio ref={startAudioRef} src={`${BASE_PATH}/sounds/start.mp3`} preload="auto" />
      <audio ref={failAudioRef} src={`${BASE_PATH}/sounds/fail.mp3`} preload="auto" />
      <audio ref={successAudioRef} src={`${BASE_PATH}/sounds/success.mp3`} preload="auto" />

      {gameState === "idle" && (
        <section className="flex flex-col items-center gap-12 text-center">
          <h1 className="text-6xl sm:text-8xl font-black tracking-tight bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 bg-clip-text text-transparent drop-shadow-lg">
            지락실 게임
          </h1>
          <p className="text-zinc-400 text-lg">
            4명이 모두 통과하면 성공!
          </p>
          <div className="flex flex-col items-center gap-3">
            <span className="text-zinc-500 uppercase tracking-widest text-xs">
              제한 시간
            </span>
            <div className="flex gap-2">
              {TIMEOUT_OPTIONS.map((ms) => {
                const selected = timeoutMs === ms;
                return (
                  <button
                    key={ms}
                    onClick={() => setTimeoutMs(ms)}
                    className={`rounded-full px-5 py-2 text-base font-bold transition-colors ${
                      selected
                        ? "bg-amber-400 text-zinc-950"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {ms / 1000}초
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={handleStart}
            disabled={locked}
            className="group relative rounded-full bg-gradient-to-br from-amber-400 to-orange-600 px-16 py-8 text-3xl sm:text-4xl font-black text-zinc-950 shadow-2xl shadow-orange-500/40 transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            <span className="relative">시작</span>
          </button>
          <p className="text-xs text-zinc-600">
            Space/Enter: 시작
          </p>
        </section>
      )}

      {gameState === "playing" && (
        <section className="flex flex-col items-center gap-10 w-full max-w-3xl">
          <div className="flex flex-col items-center gap-3">
            <span className="text-zinc-500 uppercase tracking-widest text-sm">
              Player
            </span>
            <div className="text-8xl sm:text-9xl font-black text-white tabular-nums">
              {currentPlayer}
              <span className="text-zinc-600 text-5xl sm:text-6xl">
                {" "}
                / {TOTAL_PLAYERS}
              </span>
            </div>
            <div className="mt-2 flex flex-col items-center gap-2 w-full max-w-md">
              <div
                className={`text-7xl sm:text-8xl font-black tabular-nums transition-colors ${
                  paused
                    ? "text-zinc-500"
                    : timeLeft <= 1000
                      ? "text-rose-500 animate-pulse"
                      : timeLeft <= 2000
                        ? "text-amber-400"
                        : "text-emerald-400"
                }`}
              >
                {(timeLeft / 1000).toFixed(1)}
              </div>
              {paused && (
                <span className="text-sm font-bold uppercase tracking-widest text-zinc-400">
                  ⏸ 일시정지
                </span>
              )}
              <div className="h-3 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-75 ${
                    timeLeft <= 1000
                      ? "bg-rose-500"
                      : timeLeft <= 2000
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                  }`}
                  style={{ width: `${(timeLeft / timeoutMs) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              {Array.from({ length: TOTAL_PLAYERS }).map((_, i) => {
                const idx = i + 1;
                const status =
                  idx < currentPlayer
                    ? "pass"
                    : idx === currentPlayer
                      ? "now"
                      : "todo";
                return (
                  <div
                    key={idx}
                    className={`h-3 w-16 rounded-full transition-colors ${
                      status === "pass"
                        ? "bg-emerald-500"
                        : status === "now"
                          ? "bg-amber-400 animate-pulse"
                          : "bg-zinc-800"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 w-full">
            <button
              onClick={handlePass}
              disabled={locked}
              className="rounded-3xl bg-gradient-to-br from-emerald-400 to-green-600 px-10 py-12 text-4xl sm:text-5xl font-black text-zinc-950 shadow-2xl shadow-emerald-500/30 transition-all duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {currentPlayer >= TOTAL_PLAYERS ? "성공" : "통과"}
            </button>
            <button
              onClick={handleFail}
              disabled={locked}
              className="rounded-3xl bg-gradient-to-br from-rose-500 to-red-700 px-10 py-12 text-4xl sm:text-5xl font-black text-white shadow-2xl shadow-rose-500/30 transition-all duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              실패
            </button>
          </div>

          <button
            onClick={handleTogglePause}
            disabled={locked}
            className={`rounded-full px-8 py-3 text-lg font-bold transition-colors disabled:opacity-60 ${
              paused
                ? "bg-amber-400 text-zinc-950 hover:bg-amber-300"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            {paused ? "▶ 재개" : "⏸ 일시정지"}
          </button>

          <p className="text-xs text-zinc-600">
            Space/Enter: 통과 · Esc: 실패 · P: 일시정지
          </p>
        </section>
      )}

      {gameState === "failed" && (
        <section className="fixed inset-0 flex flex-col items-center justify-center gap-10 bg-black">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-70"
            style={{ backgroundImage: `url(${BASE_PATH}/images/napd.jpg)` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70" />
          <div className="relative flex flex-col items-center gap-8">
            <h2 className="text-8xl sm:text-9xl font-black text-rose-500 drop-shadow-[0_0_40px_rgba(244,63,94,0.6)] animate-pulse">
              실패!
            </h2>
            <p className="text-2xl text-zinc-300">
              {currentPlayer}번 플레이어에서 게임 종료
            </p>
            <button
              onClick={handleReset}
              disabled={locked}
              className="rounded-full bg-white px-10 py-5 text-2xl font-bold text-zinc-950 shadow-2xl transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-60"
            >
              다시 시작
            </button>
          </div>
        </section>
      )}

      {gameState === "success" && (
        <section className="flex flex-col items-center gap-10 text-center">
          <div className="text-9xl animate-bounce">🎉</div>
          <h2 className="text-7xl sm:text-8xl font-black bg-gradient-to-br from-emerald-300 via-amber-300 to-rose-400 bg-clip-text text-transparent">
            성공!
          </h2>
          <p className="text-2xl text-zinc-300">
            4명 모두 통과했어요
          </p>
          <button
            onClick={handleReset}
            disabled={locked}
            className="rounded-full bg-gradient-to-br from-amber-400 to-orange-600 px-10 py-5 text-2xl font-bold text-zinc-950 shadow-2xl shadow-orange-500/40 transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            다시 시작
          </button>
        </section>
      )}
    </main>
  );
}
