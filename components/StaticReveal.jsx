import React from "react";

/**
 * Keeps the original DOM/wrapper layout but removes competing entrance effects.
 * The Swarm renderer is the sole controller of how elements are revealed.
 */
export default function StaticReveal({ children, ...unusedAnimationProps }) {
  return <div>{children}</div>;
}
