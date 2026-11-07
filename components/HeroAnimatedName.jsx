import React, { useEffect, useState } from "react";
import styled from "styled-components";

const Name = styled.span`
  position: relative;
  display: inline-block;
  max-width: 100%;
  vertical-align: bottom;
  line-height: 1.12;

  .name-measure {
    visibility: hidden;
    white-space: nowrap;
    user-select: none;
    pointer-events: none;
  }

  .name-ink {
    position: absolute;
    inset: 0 auto auto 0;
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    width: 100%;
  }

  .name-ink.is-typing {
    width: 0;
    border-right: 3px solid currentColor;
    animation:
      hero-name-type 1.25s steps(var(--characters), end) forwards,
      hero-name-caret 0.55s step-end infinite;
  }

  @keyframes hero-name-type {
    from { width: 0; }
    to { width: 100%; }
  }

  @keyframes hero-name-caret {
    0%, 100% { border-right-color: currentColor; }
    50% { border-right-color: transparent; }
  }

  @media (prefers-reduced-motion: reduce) {
    .name-ink.is-typing {
      width: 100%;
      border-right: 0;
      animation: none;
    }
  }
`;

/**
 * Restores the source portfolio's typewriter name animation, but waits until
 * Swarm cursors have completed drawing this exact part of the real page.
 * The full name is readable by Swarm before the animation is triggered.
 */
export default function HeroAnimatedName({ name, className }) {
  const [cycle, setCycle] = useState(0);
  const [typing, setTyping] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const start = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setDone(false);
      setTyping(true);
      setCycle((current) => current + 1);
    };
    window.addEventListener("portfolio:hero-name-built", start);
    return () => window.removeEventListener("portfolio:hero-name-built", start);
  }, []);

  useEffect(() => {
    if (!typing) return;
    const finish = setTimeout(() => {
      setTyping(false);
      setDone(true);
    }, 1550);
    return () => clearTimeout(finish);
  }, [typing, cycle]);

  return (
    <Name
      id="portfolio-hero-name"
      className={className}
      aria-label={name}
      data-typing-complete={done ? "yes" : "no"}
    >
      <span className="name-measure" aria-hidden="true">{name}</span>
      <span
        key={cycle}
        className={typing ? "name-ink is-typing" : "name-ink"}
        style={{ "--characters": Array.from(name).length }}
        aria-hidden="true"
      >{name}</span>
    </Name>
  );
}
