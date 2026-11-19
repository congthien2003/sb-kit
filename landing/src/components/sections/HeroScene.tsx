'use client';

import { ArrowDownRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { heroSkills } from '@/config/hero-skills';
import type { mountSkillDock } from './skill-dock-scene';

function openDemo(index: number) {
  const id = heroSkills[index].target;
  const target = document.getElementById(id);
  if (!target) return;
  if (window.location.hash === '#' + id) {
    target.scrollIntoView({ block: 'start' });
  } else {
    window.location.hash = id;
  }
  target.focus({ preventScroll: true });
}

export default function HeroScene({ instruction }: { instruction: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof mountSkillDock> | null>(null);
  const navigationTimer = useRef<number | null>(null);
  const [highlighted, setHighlighted] = useState<number | null>(null);

  const highlight = useCallback((index: number | null) => {
    scene.current?.highlight(index);
    setHighlighted(index);
  }, []);

  const activate = useCallback((index: number) => {
    if (navigationTimer.current !== null) return;
    if (!scene.current?.eject(index)) {
      openDemo(index);
      return;
    }
    setHighlighted(index);
    navigationTimer.current = window.setTimeout(() => {
      navigationTimer.current = null;
      openDemo(index);
      scene.current?.reset();
      setHighlighted(null);
    }, 220);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let version = 0;

    function releaseScene() {
      scene.current?.dispose();
      scene.current = null;
    }

    async function syncMotion() {
      const current = ++version;
      releaseScene();
      if (motion.matches) return;
      try {
        const { mountSkillDock: mount } = await import('./skill-dock-scene');
        if (current !== version || !host) return;
        scene.current = mount(host, { highlight, activate, lost: releaseScene });
      } catch {
        // The server-rendered dock and its ordinary links remain available.
        if (current === version) releaseScene();
      }
    }

    void syncMotion();
    motion.addEventListener('change', syncMotion);
    return () => {
      version++;
      motion.removeEventListener('change', syncMotion);
      if (navigationTimer.current !== null) window.clearTimeout(navigationTimer.current);
      navigationTimer.current = null;
      releaseScene();
    };
  }, [activate, highlight]);

  return (
    <figure className="kit-hero-art">
      <div ref={hostRef} className="kit-scene" aria-hidden="true">
        <div className="kit-dock-poster">
          <div className="kit-dock-poster-base" />
          {heroSkills.map(({ name }) => (
            <div className="kit-dock-poster-module" key={name}><span>{name}</span></div>
          ))}
        </div>
      </div>
      <figcaption className="kit-dock-caption">
        <p>{instruction}</p>
        <nav aria-label={instruction} className="kit-dock-links">
          {heroSkills.map(({ name, target }, i) => (
            <a key={target} href={'#' + target}
              data-highlight={highlighted === i || undefined}
              onPointerEnter={(event) => { if (event.pointerType !== 'touch') highlight(i); }}
              onPointerLeave={() => highlight(null)}
              onFocus={() => highlight(i)}
              onBlur={() => highlight(null)}
              onClick={(event) => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                activate(i);
              }}
            >
              <span>{name}</span><ArrowDownRight size={14} aria-hidden="true" />
            </a>
          ))}
        </nav>
      </figcaption>
    </figure>
  );
}
