import Document, { Html, Head, Main, NextScript } from "next/document";
import { ServerStyleSheet } from "styled-components";

const firstPaintCSS = `
  html.swarm-preparing #__next {
    opacity: 0 !important;
    pointer-events: none !important;
  }
  html.swarm-preparing,
  html.swarm-preparing body {
    background-color: #101114 !important;
  }
`;

const preboot = `
(function () {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.documentElement.classList.add("swarm-preparing");
    // Fail open if a script/CDN/browser error prevents the Swarm from mounting.
    window.__swarmFirstPaintFailsafe = setTimeout(function () {
      document.documentElement.classList.remove("swarm-preparing");
    }, 20000);

    // Mobile and desktop audio can only be unlocked by a real gesture.
    // Preserve that gesture even if it arrives before the Swarm script loads.
    var unlock = function () {
      var swarm = window.__swarmRebuild;
      if (swarm && swarm.app && swarm.app.sfx) {
        swarm.app.sfx.resume();
        return;
      }
      if (!window.__swarmEarlyAudioContext) {
        var Context = window.AudioContext || window.webkitAudioContext;
        if (Context) window.__swarmEarlyAudioContext = new Context({ latencyHint: "interactive" });
      }
      if (window.__swarmEarlyAudioContext && window.__swarmEarlyAudioContext.state === "suspended") {
        window.__swarmEarlyAudioContext.resume().catch(function () {});
      }
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("touchstart", unlock, { capture: true, passive: true });
    document.addEventListener("keydown", unlock, true);
  } catch (_) {
    document.documentElement.classList.remove("swarm-preparing");
  }
})();
`;


export default class MyDocument extends Document {
	static async getInitialProps(ctx) {
		const sheet = new ServerStyleSheet();
		const originalRenderPage = ctx.renderPage;

		try {
			ctx.renderPage = () =>
				originalRenderPage({
					enhanceApp: (App) => (props) => sheet.collectStyles(<App {...props} />),
				});

			const initialProps = await Document.getInitialProps(ctx);
			return {
				...initialProps,
				styles: [initialProps.styles, sheet.getStyleElement()],
			};
		} finally {
			sheet.seal();
		}
	}
  render() {
    return (
      <Html lang="pt-BR">
        <Head>
          <style id="swarm-first-paint" dangerouslySetInnerHTML={{ __html: firstPaintCSS }} />
          <script id="swarm-preboot" dangerouslySetInnerHTML={{ __html: preboot }} />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }

}
