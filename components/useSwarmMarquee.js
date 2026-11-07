import { useEffect, useState } from "react";

/**
 * Starts a marquee only after the Swarm has constructed and revealed its
 * original region. Before the region is built the marquee is motionless,
 * allowing the swarm blueprint capture to be deterministic.
 */
export default function useSwarmMarquee(ref) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const checkReveal = (event) => {
      const element = ref.current;
      if (!element) return;
      const app = window.__swarmRebuild?.app;
      if (app?.complete || app?.engine?.flocking) {
        setPlaying(true);
        return;
      }
      if (!app?.engine?.started) return;
      const currentBoundary = event?.detail?.until ?? app.revealUntil;
      if (!Number.isFinite(currentBoundary)) return;
      const endOfRegion = element.getBoundingClientRect().bottom + window.scrollY;
      // Allow a small anti-aliasing tolerance for the blueprint clipping edge.
      if (currentBoundary >= endOfRegion - 4) setPlaying(true);
    };

    const onLanguageChange = () => {
      // The Swarm will rebuild a new snapshot in the selected language.
      // Freeze the logos again before the snapshot is taken.
      if (!window.__swarmRebuild?.app?.complete) setPlaying(false);
    };

    const onComplete = () => setPlaying(true);
    window.addEventListener("portfolio:swarm-reveal-progress", checkReveal);
    window.addEventListener("portfolio:swarm-complete", onComplete);
    window.addEventListener("portfolio:language-changed", onLanguageChange);
    checkReveal();

    // If Swarm fails to load, do not leave the site's own marquees disabled.
    const recover = window.setTimeout(() => {
      if (!window.__swarmRebuild?.app) setPlaying(true);
    }, 21000);

    return () => {
      clearTimeout(recover);
      window.removeEventListener("portfolio:swarm-reveal-progress", checkReveal);
      window.removeEventListener("portfolio:swarm-complete", onComplete);
      window.removeEventListener("portfolio:language-changed", onLanguageChange);
    };
  }, [ref]);

  return playing;
}
