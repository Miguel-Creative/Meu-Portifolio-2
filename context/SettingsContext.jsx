import React, { useEffect, useRef, useState, createContext } from "react";
import { ThemeProvider } from "styled-components";

//Lista de temas
import { darkTheme, lightTheme } from "@/styles/Theme";

//Pacotes com textos de linguagens
import ptbrJson from "@/config/localization/ptbr.json";
import enusJson from "@/config/localization/enus.json";

export const SettingsContext = createContext({});

const listaTemas = {
	dark: darkTheme,
	light: lightTheme,
};

export default function SettingsProvider({ children }) {
	const [theme, setTheme] = useState(darkTheme);
	const [changeLanguage, setLanguage] = useState(false);
	const initialized = useRef(false);

	useEffect(() => {
		document.documentElement.lang = changeLanguage ? "en" : "pt-BR";
		if (!initialized.current) {
			initialized.current = true;
			return;
		}
		// Send the event after the React translation has been committed so
		// Swarm can capture text in the new language instead of its old snapshot.
		window.dispatchEvent(new CustomEvent("portfolio:language-changed", {
			detail: { language: changeLanguage ? "en" : "pt" },
		}));
	}, [changeLanguage]);

	function changeTheme(newTheme) {
		setTheme(listaTemas[newTheme]);
	}

	function changeLanguageLocalization() {
		setLanguage((changeLanguage) => !changeLanguage);
	}

	var language = changeLanguage == true ? enusJson : ptbrJson;

	return (
		<SettingsContext.Provider value={{ changeTheme, changeLanguageLocalization, language, languageCode: changeLanguage ? "en" : "pt" }}>
			<ThemeProvider theme={theme}>{children}</ThemeProvider>
		</SettingsContext.Provider>
	);
}
