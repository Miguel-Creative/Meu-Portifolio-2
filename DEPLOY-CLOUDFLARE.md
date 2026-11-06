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

O template original, com textos, mídia e navegação, permanece disponível. O motor Swarm adaptado está em `public/swarm-rebuild.js`, carregado por `components/ScrollConstruction.jsx`. Ele captura um blueprint da página e reconstrói caixas, textos, mídias e layouts no overlay em Shadow DOM enquanto a página real permanece por baixo. Rolar para baixo continua a construção; rolar para cima pausa as tarefas e os cursores seguem o ponteiro; ao concluir, o overlay desenhado se dissolve e a página React original volta a ser exibida, com o enxame ainda acompanhando o mouse. O mecanismo antigo foi removido.

O template conserva referências ao autor original. A animação de cursores é uma interpretação independente da ideia de Swarm, de Joel Califa, e não é a extensão do Chrome.


## Teste de regressão no navegador

Após `npm run build`, execute `CHROME_PATH=/caminho/para/chrome node scripts/check-export.mjs` (Linux/macOS) ou configure a variável no Windows. O teste executa Chrome sem extensões, verifica captura completa da página, construção ao descer, pausa ao subir, retomada ao descer e restauração da página React. Para testar também a conclusão de todas as tarefas em uma varredura longa, defina `SWARM_FULL_TEST=1`.

### Direitos autorais

O arquivo `public/swarm-rebuild.js` adapta o motor do projeto Swarm Rebuild fornecido pelo proprietário do portfólio, que por sua vez credita Swarm de Joel Califa. O README da extensão afirma expressamente que partes originais dos mantenedores estão sob MIT, mas que trechos e movimentos derivados de Joel Califa **não estão automaticamente cobertos por essa licença**. Antes de distribuição/comercialização, confirme a autorização adequada. Créditos: https://github.com/califa/swarm-site e a página oficial Swarm Rebuild.
