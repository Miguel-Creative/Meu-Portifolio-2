import { useEffect } from "react";
import { useRouter } from "next/router";

/**
 * Swarm rebuilds the actual portfolio's DOM as a blueprint inside a transparent
 * shadow overlay. No splash/intro page and no Chrome extension are required.
 * The engine owns its multiplayer cursor choreography, scroll pause/resume,
 * and live-page handoff after rebuilding.
 */
export default function ScrollConstruction() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposed = false;
    const scriptId = "portfolio-swarm-engine";

    function start() {
      if (disposed || !window.__swarmRebuild) return;
      // In development, StrictMode may replay this effect.
      if (window.__swarmRebuild.app) window.__swarmRebuild.stop(false);
      const begin = () => {
        if (disposed) return;
        window.__swarmRebuild.start();
      };
      // Give styled-components and dynamic images a chance to settle.
      requestAnimationFrame(() => requestAnimationFrame(begin));
    }

    let script = document.getElementById(scriptId);
    if (window.__swarmRebuild) start();
    else if (script) script.addEventListener("load", start, { once: true });
    else {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "/swarm-rebuild.js";
      script.async = true;
      script.addEventListener("load", start, { once: true });
      script.addEventListener("error", () => console.error("[portfolio] Swarm script could not be loaded"), { once: true });
      document.body.appendChild(script);
    }

    return () => {
      disposed = true;
      if (script) script.removeEventListener("load", start);
      if (window.__swarmRebuild && window.__swarmRebuild.app) window.__swarmRebuild.stop(false);
    };
  }, [router.pathname]);

  return null;
}
