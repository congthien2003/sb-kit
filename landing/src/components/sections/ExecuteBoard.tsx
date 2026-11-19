'use client';

import { useEffect, useRef } from 'react';
import type { mountExecutionBoard } from './execution-board-scene';

export const stepDurationMs = 2000;
export type Playback = { position: number; startedAt: number };
export type BoardStep = { approval: boolean };

export default function ExecuteBoard({ steps, playback }: { steps: BoardStep[]; playback: Playback }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<ReturnType<typeof mountExecutionBoard> | null>(null);
  const clock = useRef(playback);

  useEffect(() => {
    clock.current = playback;
    boardRef.current?.refresh();
  }, [playback]);

  useEffect(() => {
    const host = hostRef.current;
    const section = host?.closest('article');
    if (!host || !section || typeof IntersectionObserver === 'undefined') return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let nearby = false;
    let generation = 0;
    let loading = false;
    let unavailable = false;

    function release() {
      generation++;
      loading = false;
      boardRef.current?.dispose();
      boardRef.current = null;
    }

    function onLoss() {
      unavailable = true;
      release();
    }

    async function sync() {
      if (motion.matches) {
        release();
        return;
      }
      if (!host || !nearby || unavailable || loading || boardRef.current) return;
      const current = ++generation;
      loading = true;
      try {
        const { mountExecutionBoard: mount } = await import('./execution-board-scene');
        if (current !== generation || !nearby || motion.matches) return;
        boardRef.current = mount(host, steps, () => clock.current, stepDurationMs, onLoss);
      } catch {
        if (current === generation) onLoss();
      } finally {
        if (current === generation) loading = false;
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      nearby = entry.isIntersecting;
      void sync();
    }, { rootMargin: '280px 0px' });
    observer.observe(section);
    motion.addEventListener('change', sync);
    return () => {
      observer.disconnect();
      motion.removeEventListener('change', sync);
      release();
    };
  }, [steps]);

  return <div ref={hostRef} className="kit-execution-board" aria-hidden="true" />;
}
