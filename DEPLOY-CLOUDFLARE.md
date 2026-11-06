# Portfólio original + construção progressiva por cursores

Este repositório mantém o template Next.js de Glayson Visgueira fornecido no arquivo "Meu Portifolio.zip", sem trocar sua Home, seu layout, sua navegação ou seus conteúdos. As informações pessoais, imagens de projetos, arquivos de currículo e links do template estão preservados para serem personalizados depois.

## Interação

A construção acontece dentro do DOM real do site, sem uma tela de entrada ou uma cópia que desaparece. O motor lib/scrollConstruction.js é uma implementação independente do efeito visual de cursores de ferramentas de design, adaptada para a rolagem:

- Na entrada, os cursores começam a construir os elementos visíveis da Home.
- Ao rolar para baixo, liberam as tarefas visíveis (caixas, textos, imagens, cartões) e as executam.
- Ao rolar para cima, congelam o andamento e passam a acompanhar o mouse, sem apagar o que já foi concluído.
- Ao descer novamente, retomam as tarefas ainda pendentes.
- Depois da conclusão, os cursores permanecem flutuando em torno do ponteiro.
- A camada de cursores não intercepta cliques. Links e botões revelados continuam reais.
- Pressionar Esc conclui os elementos pendentes para não atrapalhar a navegação.
- Respeita prefers-reduced-motion e usa menos cursores no celular.

O motor é original, sem importar scripts de uma extensão do Chrome. A experiência segue os princípios comportamentais do Swarm de Joel Califa e do Swarm Rebuild. Código de projetos de terceiros sem permissão de redistribuição não foi copiado.

## Desenvolvimento local

Recomenda-se Node.js 22.

1. Execute npm install (o arquivo .npmrc contém legacy-peer-deps=true para compatibilidade com as dependências antigas).
2. Execute npm run dev; development em http://localhost:3000.
3. Execute npm run build:cloudflare para exportar a pasta out/.

Teste automatizado com Chrome instalado no Windows: node scripts/check-scroll.mjs.

## Cloudflare Pages (GitHub)

Crie um projeto Pages, selecione este repositório e configure:

- Branch: main
- Framework: Next.js (Static HTML Export), ou escolha None com os mesmos parâmetros
- Build command: npm run build:cloudflare
- Build output directory: out
- Variáveis de ambiente: NODE_VERSION=22 e NPM_CONFIG_LEGACY_PEER_DEPS=true

A publicação no GitHub não cria automaticamente um novo site na Cloudflare. O primeiro deploy precisa apontar para esse repositório.

## Créditos

O conteúdo visual de origem foi disponibilizado em um ZIP do projeto glaysonvisgueira_next-js (README original preservado). Referência conceitual para os cursores: Swarm — Joel Califa (https://github.com/califa/swarm-site) e a extensão Swarm Rebuild. Esta integração reproduz comportamento, sem reutilizar a implementação de terceiros. rea-main.zip é a biblioteca de análise REA, não um componente do site, e não faz parte do deploy.
