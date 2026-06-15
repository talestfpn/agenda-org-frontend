# AgendaOrg Frontend

Frontend Vite + React + TypeScript do AgendaOrg, sistema de apoio a padronizacao e validacao de agendas ambulatoriais da SES-PE.

## Requisitos

- Node.js 22+
- npm
- Backend rodando em http://localhost:3333/api

No Windows, se o PowerShell bloquear `npm`, use `npm.cmd`.

## Comandos

```bash
npm install --cache .npm-cache
npm run dev
```

Comandos adicionais:

```bash
npm run build
npm run test
```

## URL

- Frontend: http://localhost:5173

## Funcionalidades MVP

- Login JWT com perfis.
- Cadastros de unidade executante, profissional, item de agendamento e usuario via API.
- Registro de agenda com competencia, ofertas e validacoes principais.
- Fluxo de estados: Recebida, Validada, ComPendencia, Devolvida, Corrigida, Aprovada e EmEdicao.
- Pendencias, correcao, aprovacao, devolucao e reabertura.
- Anexo de documento original com hash e validacao estrutural.
- Painel gerencial, notificacoes, historico e auditoria.
- Relatorios gerais, relatorio de bloqueios e exportacao PDF/Excel.
- Controles de acessibilidade: pular para conteudo, A-/A+, alto contraste, foco visivel e mensagens acessiveis.

## Compliance

O backend registra acoes sensiveis em auditoria, aplica controle de acesso por perfil, guarda historico das agendas e usa validacoes de entrada. A interface segue diretrizes eMAG/WCAG em estrutura semantica, contraste, foco visivel e navegacao por teclado.
