import React from "react";

//Pages
import SobreMimPage from "./sobre-mim";
import PortfolioPage from "./portfolio";
import ExperienciaPage from "./experiencia";
import HomePage from "./homepage";
import Faq from "./faq";
import Testimonials from "./Testimonials";

//Components
import ServicesOffer from "@/components/ServicesOffer";
import FooterPage from "@/components/FooterPage";
import CarrouselTechsDivContainer from "@/components/CarrouselTechsDivContainer";
import SatisfactionIndicators from "@/components/SatisfactionIndicators";

let flagMessage = false;
export default function Index() {
	function ConsoleMessage() {
		console.log(
			"%c██   ██ ███████ ██      ██       ██████      ██████  ███████ ██    ██ ███████ ██       ██████  ██████  ███████ ██████  ██\n" +
				"%c██   ██ ██      ██      ██      ██    ██     ██   ██ ██      ██    ██ ██      ██      ██    ██ ██   ██ ██      ██   ██ ██\n" +
				"%c███████ █████   ██      ██      ██    ██     ██   ██ █████   ██    ██ █████   ██      ██    ██ ██████  █████   ██████  ██\n" +
				"%c██   ██ ██      ██      ██      ██    ██     ██   ██ ██       ██  ██  ██      ██      ██    ██ ██      ██      ██   ██   \n" +
				"%c██   ██ ███████ ███████ ███████  ██████      ██████  ███████   ████   ███████ ███████  ██████  ██      ███████ ██   ██ ██",
			"color: #FCD434;",
			"color: #FCD434;",
			"color: #FCD434;",
			"color: #FCD434;",
			"color: #FCD434;"
		);

		console.log(
			"%cProcurando o código fonte? Aqui está ele: " + "%chttps://github.com/Miguel-Creative/Meu-Portifolio\n\n" + "%cNão esqueça de deixar uma estrela! 🌟",
			"font-family: Inter, sans-serif; font-size: 1.2rem; font-weight: 500;",
			"font-family: Inter, sans-serif; font-size: 1.2rem; font-weight: 500; color: #FCD434;",
			"font-family: Inter, sans-serif; font-size: 1.2rem; font-weight: 500;"
		);
	}

	if (flagMessage == false) {
		ConsoleMessage();
		flagMessage = true;
	}

	return (
		<>
			<HomePage />
			<ServicesOffer />
			<CarrouselTechsDivContainer />
			<SobreMimPage />
			<SatisfactionIndicators />
			<CarrouselTechsDivContainer direction="left" />
			<PortfolioPage />
			<ExperienciaPage />
			{/* <Testimonials /> */}
			<Faq />
			<FooterPage />
		</>
	);
}
