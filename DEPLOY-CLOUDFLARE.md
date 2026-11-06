# Deploy do portfólio original — Cloudflare Pages

O conteúdo do ZIP do portfólio Next.js de Glayson Visgueira está preservado. As informações, imagens, currículo, links e visual permanecem originais, para personalização posterior.

A animação de construção pertence ao próprio site, em lib/scrollConstruction.js, com estilos em styles/scrollConstruction.css e montagem em components/ScrollConstruction.jsx. Não existe tela de entrada separada nem dependência de extensão do Chrome. A construção ocorre nos elementos originais; descer retoma, subir pausa e os cursores acompanham o ponteiro; após concluída, permanecem acompanhando o mouse. Pressionar Esc libera todas as tarefas. O sistema respeita preferência de movimento reduzido.

## Cloudflare Pages

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
2. Escolha o repositório GitHub Miguel-Creative/Meu-Portifolio, branch main.
3. Configuração:
   - Framework preset: Next.js (Static HTML Export) ou None
   - Build command: npm run build:cloudflare
   - Build output directory: out
   - Node.js version (environment variable): NODE_VERSION=22
   - NPM_CONFIG_LEGACY_PEER_DEPS=true
4. Salve e publique, depois abra a URL *.pages.dev. Não use o Worker antigo da Acme, pois ele não aponta para este repositório.

O arquivo .npmrc no repositório já inclui legacy-peer-deps=true para compatibilidade. O comando de build é Next.js 12: next build && next export. A configuração de imagens define loader akamai para permitir exportação estática, sem trocar as imagens do template.

## Teste no Chrome sem extensão

Após gerar o site com npm run build:cloudflare:
node scripts/check-export.mjs

O teste abre os arquivos estáticos em um servidor local, verifica as tarefas de construção, scroll descendente, pausa ascendente, retomada descendente e conclusão sem elementos ocultos. A execução requer Chrome ou Edge instalado no Windows.

## Crédito e licença

O design original pertence a seus respectivos autores. O README original permanece neste repositório. A construção por cursores foi implementada especificamente para o site e é uma interpretação independente das interações vistas em Swarm, por Joel Califa (https://github.com/califa/swarm-site), e em Swarm Rebuild; não utiliza o código ou a extensão de terceiros. O arquivo rea-main.zip é uma ferramenta de engenharia reversa, não um componente necessário ao portfólio.
