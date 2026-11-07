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
    const showPage = () => {
      document.documentElement.classList.remove("swarm-preparing");
      if (window.__swarmFirstPaintFailsafe) clearTimeout(window.__swarmFirstPaintFailsafe);
    };

    // The React language state changes instantly but the Swarm uses an immutable
    // snapshot. Rebuild that snapshot after translation has been committed.
    const handleLanguageChange = () => {
      const swarm = window.__swarmRebuild;
      if (!swarm?.app || swarm.app.complete) return;
      // Keep the original site covered while replacing the old-language scene.
      document.documentElement.classList.add("swarm-preparing");
      requestAnimationFrame(() => {
        if (disposed) return showPage();
        if (swarm.app && !swarm.app.complete) swarm.restart();
        else showPage();
      });
    };
    window.addEventListener("portfolio:language-changed", handleLanguageChange);

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
      script.addEventListener("error", () => {
        console.error("[portfolio] Swarm script could not be loaded");
        showPage();
      }, { once: true });
      document.body.appendChild(script);
    }

    return () => {
      disposed = true;
      window.removeEventListener("portfolio:language-changed", handleLanguageChange);
      if (script) script.removeEventListener("load", start);
      showPage();
      if (window.__swarmRebuild && window.__swarmRebuild.app) window.__swarmRebuild.stop(false);
    };
  }, [router.pathname]);

  return null;
}
