import "../styles/font.css";
import "../styles/scrollConstruction.css";
import GlobalStyle from "../styles/globalStyle";
import LayoutTemplate from "../components/LayoutTemplate";
import ScrollConstruction from "../components/ScrollConstruction";
import SettingsContext from "@/context/SettingsContext";

function MyApp({ Component, pageProps }) {
  return (
    <SettingsContext>
      <GlobalStyle />
      <LayoutTemplate>
        <Component {...pageProps} />
      </LayoutTemplate>
      <ScrollConstruction />
    </SettingsContext>
  );
}
export default MyApp;
