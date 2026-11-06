import styled from "styled-components";

import { Github } from "@styled-icons/bootstrap/Github/Github";

const SocialMediaContainer = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: row;

	@media (max-width: 600px) {
		width: 100%;
		//justify-content: space-between;
		margin-bottom: 20px;
	}
`;

const ButtonSocialMediaIcon = styled.a`
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 5px;
	width: 32px;
	height: 32px;
	transition: all 0.1s ease;
	border-radius: 4px;
	background-color: ${(props) => props.theme.colors.backgroundSecondary};

	&:hover {
		cursor: pointer;
		border: 2px solid ${(props) => props.theme.colors.branding};
	}

	&:active {
		opacity: 0.5;
	}

	svg {
		color: ${(props) => props.theme.colors.branding};
		width: 20px;
		height: 20px;
		transition: all 0.3s ease;

		&:hover {
			color: ${(props) => props.theme.colors.branding};
		}
	}

	@media (max-width: 600px) {
		margin-left: 3px;
		margin-right: 3px;
	}

	:hover {
		transform: scale(1.1);
	}
`;

// Show only verified links; other social profiles will be added with the owner's details.
export default function SocialNetworkRowStack() {
  return (
    <SocialMediaContainer>
      <ButtonSocialMediaIcon
        href="https://github.com/Miguel-Creative"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub de Israel Miguel"
        title="GitHub · Miguel-Creative"
      >
        <Github />
      </ButtonSocialMediaIcon>
    </SocialMediaContainer>
  );
}
