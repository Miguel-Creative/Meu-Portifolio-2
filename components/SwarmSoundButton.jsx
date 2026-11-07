import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";

const SoundButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 35px;
  height: 35px;
  margin-left: 10px;
  border: 1px solid ${({ theme }) => theme.colors.branding};
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.backgroundSecondary};
  color: ${({ theme }) => theme.colors.branding};
  cursor: pointer;
  transition: background-color 0.18s ease, opacity 0.18s ease;

  &:hover:not(:disabled), &:focus-visible {
    background: ${({ theme }) => theme.colors.branding};
    color: ${({ theme }) => theme.colors.background};
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 3px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.55;
  }

  svg {
    width: 20px;
    height: 20px;
  }

  @media (max-width: 600px) {
    width: 33px;
    height: 33px;
    margin-left: 7px;
  }
`;

const DEFAULT_STATE = {
  enabled: true,
  audible: false,
  blocked: true,
  loaded: false,
  available: true,
};

export default function SwarmSoundButton({ languageCode = "pt" }) {
  const [sound, setSound] = useState(DEFAULT_STATE);
  const en = languageCode === "en";

  const sync = useCallback(() => {
    if (typeof window === "undefined") return;
    const current = window.__swarmRebuild?.soundState?.();
    if (current) setSound(current);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("portfolio:swarm-sound-change", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("portfolio:swarm-sound-change", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [sync]);

  const toggleSound = () => {
    const swarm = window.__swarmRebuild;
    if (!swarm?.setSoundEnabled) return;
    const current = swarm.soundState();
    // If audio is enabled but blocked by autoplay policy, this first click
    // UNLOCKS it instead of turning it off.
    const enable = !current.enabled || !current.audible;
    swarm.setSoundEnabled(enable);
    sync();
  };

  const active = Boolean(sound.enabled && sound.audible);
  const title = !sound.loaded
    ? (en ? "Loading animation sound" : "Carregando som da animação")
    : !sound.available
      ? (en ? "Audio not available in this browser" : "Áudio indisponível neste navegador")
      : active
        ? (en ? "Mute animation sound" : "Desativar som da animação")
        : (en ? "Enable animation sound" : "Ativar som da animação");

  return (
    <SoundButton
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={!sound.loaded || !sound.available}
      onClick={toggleSound}
      data-testid="swarm-sound-toggle"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        {active ? (
          <>
            <path d="M15 9a4 4 0 0 1 0 6" />
            <path d="M18 6a8 8 0 0 1 0 12" />
          </>
        ) : (
          <>
            <path d="m16 9 5 6" />
            <path d="m21 9-5 6" />
          </>
        )}
      </svg>
    </SoundButton>
  );
}
