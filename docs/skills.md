# Mapa de Competências Demonstradas — Orça +

Este documento mapeia as competências de engenharia de software demonstradas durante a concepção, arquitetura, desenvolvimento e publicação do projeto **Orça +**.

---

## 1. Engenharia Front-end Moderna

| Competência | Evidência no Projeto | Detalhes |
|---|---|---|
| **Next.js 16 & React 19** | `src/app/`, `src/components/` | Utilização do Next.js App Router com Server Components e Client Components onde há reatividade, Suspense boundaries para carregamento progressivo e layouts aninhados. |
| **TypeScript Estrito** | Toda a base de código | Interfaces tipadas para transações, estatísticas, usuários, payloads de sessão, filtros e opções de relatórios, garantindo segurança de tipos de ponta a ponta. |
| **Visualização de Dados (Recharts)** | `src/app/dashboard/page.tsx` | Implementação de gráficos de rosca (*donut chart*), evolução diária em barras com cálculo de média móvel e tooltips customizados para leitura rápida de finanças. |
| **Design System & Acessibilidade** | `src/app/globals.css`, `src/app/page.tsx` | Criação de tema monocromático minimalista de alto contraste, sem poluição visual, com estados de foco visíveis, botões táteis adequados para toque em telas móveis e preservação estrita de cores funcionais (receita/despesa). |
| **Responsividade Mobile-first** | Todas as telas da aplicação | Tabelas com rolagem lateral no mobile e cabeçalho fixo no desktop; seletores de meses roláveis no celular e expandidos no desktop; cards flexíveis com Tailwind CSS. |

---

## 2. Engenharia Back-end & Integrações

| Competência | Evidência no Projeto | Detalhes |
|---|---|---|
| **Arquitetura de Webhooks** | `src/app/api/telegram/webhook/route.ts` | Endpoint HTTPS assíncrono para captura e processamento contínuo de mensagens da Telegram Bot API 24/7, com tratamento de mensagens e cliques em teclados inline (*callback queries*). |
| **Parsing Determinístico de Texto** | `code-samples/typescript/parse-message.ts` | Motor de expressões regulares otimizado para o padrão monetário brasileiro (`R$`, vírgulas, pontos e centavos), extraindo dados com latência de milissegundos sem dependência de serviços externos. |
| **Geração de PDF no Servidor** | `src/lib/pdf-report.ts` | Compilação programática de documentos PDF contábeis com `jsPDF`, renderizando buffers em memória sem exigir navegadores pesados (*headless*), reduzindo o uso de memória em 95%. |
| **Rate Limiting em Memória** | `src/lib/rate-limit.ts` | Implementação de limitador de requisições por janela deslizante (*sliding window*) com extração de IP real de proxies e resposta padrão HTTP 429 (`Retry-After`). |
| **OAuth 2.0 / Google Integration** | `src/app/api/auth/google/` | Fluxo completo de autorização OAuth 2.0 com redirecionamento seguro, troca de `authorization_code` por tokens e sincronização de perfil. |

---

## 3. Banco de Dados & Modelagem Relacional

| Competência | Evidência no Projeto | Detalhes |
|---|---|---|
| **Modelagem Relacional (Prisma ORM)** | `prisma/schema.prisma` | Modelos `User`, `TelegramChat`, `Transaction` e `Category` com integridade referencial, índices em chaves estrangeiras e datas (`createdAt`, `date`). |
| **Agregações & Cálculos Financeiros** | `src/app/api/dashboard/stats/route.ts` | Uso de agregações atômicas (`_sum`, `count`, agrupamento por categoria) para calcular saldo líquido, despesas e receitas mensais diretamente no motor do banco. |
| **Prevenção de Injeção SQL** | Prisma ORM | Todas as consultas utilizam *prepared statements* parametrizados nativamente, blindando a aplicação contra SQL Injection. |
| **Prevenção de IDOR** | `src/app/api/transactions/route.ts` | Cláusulas `where: { id, userId }` em mutações para garantir que nenhum usuário consiga excluir ou modificar transações de terceiros. |

---

## 4. Cibersegurança & Práticas Defensivas

| Competência | Evidência no Projeto | Detalhes |
|---|---|---|
| **Criptografia de Senhas** | `src/lib/auth.ts` | Hashing com `bcryptjs` em 10 salt rounds e validação estrita no servidor (mínimo 6 e máximo 72 caracteres). |
| **Timing-Safe HMAC Signatures** | `src/lib/auth.ts` | Verificação de tokens JWT utilizando `crypto.timingSafeEqual` sobre buffers, eliminando vulnerabilidades a ataques de temporização (*side-channel timing attacks*). |
| **Hardening de Cookies** | `src/app/api/auth/login/route.ts` | Cookies com `httpOnly: true` (proteção contra roubo via XSS), `sameSite: "lax"` (mitigação de CSRF) e `secure: true` em ambiente HTTPS. |
| **Auditoria e Proteção de Endpoints** | `docs/security.md` | Bloqueio de rotas administrativas e auditoria de vazamento de variáveis de ambiente. |

---

## 5. DevOps, Infraestrutura & Qualidade

| Competência | Evidência no Projeto | Detalhes |
|---|---|---|
| **CI/CD & Deploy Contínuo** | Repositório & Vercel | Pipeline automatizado onde commits na branch `master` disparam builds otimizados com Turbopack e publicação em ambiente de alta disponibilidade. |
| **Gerenciamento de DNS & Domínio** | `orçamais.online` | Configuração de registros A e CNAME para apontamento de domínio próprio com punycode (`xn--ora-mais-yza.online`) e emissão automática de certificados SSL/TLS Let's Encrypt. |
| **Compilação e Zero Warnings** | `npx next build` | Build 100% livre de erros e advertências em TypeScript e Next.js Turbopack. |
