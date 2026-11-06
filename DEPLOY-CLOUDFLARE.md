# Publicação do portfólio original no Cloudflare Workers

Este repositório mantém o portfólio Next.js 12 original e sua animação integrada aos elementos da página. Não é preciso atualizar o Next.js nem usar extensão do Chrome para publicar a versão estática.

## Configuração atual (Cloudflare Workers Builds)

O Worker conectado ao GitHub usa:

- **Worker name:** `meu-portifolio` (deve corresponder ao nome no painel da Cloudflare)
- **Git:** `Miguel-Creative/Meu-Portifolio`, branch `main`
- **Root directory:** `/`
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- **Output:** `out/`, configurado no `wrangler.toml`
- **Node.js:** `22`, fixado em `.node-version`

O comando `npm run build` executa `next build && next export` e gera HTML/CSS/JS estáticos. O Wrangler encontra o `wrangler.toml`, reconhece `[assets] directory = "./out"` e publica os arquivos no Worker, sem tentar configurar um runtime de Next.js.

Se o painel ainda mostrar **Framework: Next.js** ou **Output: .next** como valores detectados anteriormente, isso não altera a configuração de assets do arquivo `wrangler.toml`. O importante é que o build gere `out/` e que a publicação execute `npx wrangler deploy` na raiz do repositório.

## Como conferir

No Cloudflare Dashboard, abra **Workers & Pages → meu-portifolio → Deployments/Builds** e procure um build da branch `main` com o commit mais recente. O resultado esperado contém a execução de `next export`, o reconhecimento dos arquivos em `out/` pelo Wrangler e a confirmação de implantação.

Caso o log ainda diga que **Next.js 12 não pode ser configurado automaticamente**, confirme que o build realmente clonou o commit com o `wrangler.toml` na raiz; esse erro acontece quando o Wrangler executa a configuração automática sem encontrar um arquivo de configuração válido.

É possível testar antes de publicar com:

```sh
npm ci
npm run build
npx wrangler deploy --dry-run
```

A simulação com Wrangler 4.158.0 foi verificada em 06/11/2026: 88 arquivos reconhecidos no diretório `out`, sem erro de configuração. A simulação não é confirmação de publicação na conta Cloudflare.

## Portfólio e animação

O template original, com textos, mídia e navegação, permanece disponível. A lógica de construção por múltiplos cursores está em `lib/scrollConstruction.js`, montada por `components/ScrollConstruction.jsx` e estilizada em `styles/scrollConstruction.css`. A construção ocorre diretamente na página; rolar para baixo retoma, rolar para cima pausa, e os agentes acompanham o ponteiro quando o processo termina.

O template conserva referências ao autor original. A animação de cursores é uma interpretação independente da ideia de Swarm, de Joel Califa, e não é a extensão do Chrome.
