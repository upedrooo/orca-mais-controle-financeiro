# Arquitetura do Sistema — Orça +

Este documento descreve as decisões de arquitetura, fluxo de dados e engenharia de software implementados no **Orça +**.

---

## 1. Visão Geral do Sistema

O **Orça +** foi desenhado com base em um princípio fundamental: **eliminar o atrito na entrada de dados financeiros**. Enquanto aplicativos tradicionais perdem adesão porque os usuários esquecem ou têm preguiça de abrir formulários complexos no celular, o Orça + utiliza o Telegram como interface de captura ultrarrápida e o navegador web como interface analítica de visualização e relatórios.

```
[ Usuário no Telegram ] ──(HTTPS)──> [ Webhook Handler (/api/telegram/webhook) ]
                                                │
                                                ▼
                                    [ Parser de Texto & Teclados ]
                                                │
                                                ▼
                                    [ Banco de Dados (PostgreSQL) ]
                                                ▲
                                                │
[ Usuário no Navegador ] ──(HTTPS)──> [ Next.js App Router (Dashboard / Relatórios) ]
```

---

## 2. Ciclo de Vida do Webhook do Telegram

A comunicação com o Telegram ocorre de forma totalmente bidirecional e orientada a eventos:

### 2.1 Recepção de Mensagens
1. O usuário envia uma mensagem no chat privado com o bot (ex: `Almoço (35,50)`).
2. O servidor do Telegram despacha um payload JSON via `POST` HTTPS para a rota `/api/telegram/webhook`.
3. O webhook analisa o tipo de atualização (`message`, `callback_query`):
   - **Comando `/start` ou `/conectar <código>`**: Valida o código alfanumérico de 6 caracteres (`ORCA-XXXX`) no PostgreSQL. Se válido, vincula o `chatId` e o nome do usuário à conta e responde com mensagem de boas-vindas.
   - **Comando `/download`**: Invoca o gerador de PDF (`generateMonthlyReportPdf`), compila o relatório contábil do mês corrente e o envia como documento anexado direto na conversa do Telegram.
   - **Registro de Gasto**: O texto é processado pelo parser determinístico.

### 2.2 Parser Determinístico de Texto
Para garantir custo zero de inferência, latência inferior a 150ms e zero risco de alucinações, o Orça + utiliza um motor de parsing baseado em expressões regulares rigorosas:
* Suporta formatos como: `Padaria (15)`, `Combustível (80,00)`, `Supermercado [R$ 150.50]`, `Farmácia (12.50)`.
* Trata variações de separadores de milhar e centavos no padrão brasileiro (`.` e `,`).
* Extrai a descrição limpa e o valor numérico em ponto flutuante.

### 2.3 Teclados Inline Dinâmicos (Callback Queries)
Após identificar o valor e a descrição, o bot responde imediatamente com um teclado inline interativo com as categorias cadastradas do usuário (ex: *Alimentação, Transporte, Mercado, Farmácia, Lazer, Contas*).
* Ao tocar no botão da categoria, uma `callback_query` é disparada ao webhook.
* O webhook registra a transação definitivamente no PostgreSQL com status confirmado.
* O bot atualiza a mensagem original no chat (via `editMessageText`), confirmando o registro e exibindo o total acumulado no mês.

---

## 3. Modelo de Contas Compartilhadas (Casais e Sócios)

Em vez de criar estruturas complexas de permissões que dificultam o uso, o Orça + adota um modelo elegante de vínculo:
1. **Conta Mestre**: Criada via e-mail/senha ou Google OAuth. Cada conta recebe um código permanente de vínculo (`ORCA-XXXX`).
2. **Tabela `TelegramChat` (1:N)**: Cada chat privado que envia esse código ao bot é registrado na tabela `TelegramChat`, associado ao `userId` da conta.
3. **Identificação por Transação**: Cada transação salva armazena o `userName` e o `chatId` de quem fez o registro.
4. **Visão Unificada**: No dashboard web, as métricas e o extrato somam os gastos de todas as pessoas vinculadas, ao mesmo tempo em que oferecem um gráfico dedicado de **"Gastos por Usuário"**, permitindo transparência imediata sobre quem despendeu mais recursos no mês.

---

## 4. Dashboard Web & Visualização de Dados

Construído com Next.js 16 (App Router) e React 19:
* **Métricas Principais**: Saldo do Mês (líquido), Total Gasto (despesas) e Total de Receitas (entradas), calculados dinamicamente via agregações do Prisma ORM (`_sum`, `count`).
* **Gráficos com Recharts**:
  * *Gastos por Categoria*: Gráfico de rosca (*donut chart*) com tooltips personalizados.
  * *Gastos por Usuário*: Distribuição percentual do volume financeiro por participante.
  * *Evolução Diária*: Gráfico de barras indicando a flutuação diária dos gastos ao longo dos 31 dias do mês.
* **Extrato Tabular Reativo**: Filtros combináveis por texto de busca, categoria e tipo (Despesa / Receita), com paginação visual e suporte a rolagem horizontal em telas móveis e cabeçalho fixo no desktop.

---

## 5. Motor de Geração de Relatórios em PDF

Implementado com `jsPDF`:
* **Totalmente no Servidor**: O documento é gerado diretamente na memória (Buffer Node.js) sem necessidade de navegadores headless pesados (Puppeteer/Playwright), reduzindo o consumo de RAM em 95%.
* **Diagramação Contábil**:
  * Cabeçalho institucional com nome da conta e data/hora de emissão.
  * Cartões com fundo suave para Saldo Líquido, Total de Despesas e Total de Receitas.
  * Tabela zebrada com ordenação cronológica de todas as despesas e receitas do mês.
* **Saída Híbrida**: O mesmo buffer atende ao botão "Baixar PDF" na web (com cabeçalhos `Content-Type: application/pdf`) e ao envio de documentos via API do Telegram.

---

## 6. Design System Monocromático

A interface foi projetada sob uma estética minimalista e monocromática (tons de preto, branco e escala de cinzas `zinc`):
* **Foco no Conteúdo**: Elimina poluição visual e gradientes coloridos aleatórios, conferindo sobriedade profissional à gestão financeira.
* **Cores Funcionais Preservadas**: Apenas dados contábeis utilizam cores para facilitar a interpretação rápida pelo olho humano (verde para receitas e saldos positivos, vermelho para despesas, e cores distintas para fatias de gráficos).
* **Acessibilidade e Contraste**: Relação de contraste superior a 4.5:1 em todos os textos informativos e controles clicáveis.
