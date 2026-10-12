# Relatório e Práticas de Cibersegurança — Orça +

Este documento detalha o modelo de ameaças, controles defensivos e padrões criptográficos implementados no **Orça +** para proteção dos dados dos usuários e integridade da infraestrutura.

---

## 1. Filosofia de Segurança e Privacidade

O Orça + segue o princípio de **mínima coleta de dados** (*privacy by design*):
* **Não solicita nem armazena dados bancários sensíveis**: A aplicação não solicita senhas de banco, números de cartão de crédito, códigos CVV ou tokens PIX. O usuário registra apenas descrições e valores de suas despesas para controle pessoal.
* **Isolamento de Contas**: Todas as consultas e mutações de dados no banco são estritamente filtradas pelo identificador autenticado da sessão (`userId`).

---

## 2. Autenticação e Hashing de Senhas

### 2.1 Criptografia com Bcrypt
* As senhas de usuários cadastrados diretamente na plataforma são submetidas a hashing com **`bcryptjs` utilizando 10 rounds de salt** (`bcrypt.hash(password, 10)`).
* O bcrypt inclui automaticamente salts criptograficamente aleatórios de 128 bits para mitigar ataques baseados em tabelas arco-íris (*rainbow tables*).
* O custo computacional intencional do algoritmo protege contra ataques de quebra por força bruta baseados em GPU/ASIC.
* A verificação em tempo de login utiliza `bcrypt.compare`, que executa a comparação de strings com tempo constante para impedir ataques de temporização (*timing attacks*).

### 2.2 Validação Rígida no Servidor
Para evitar que clientes maliciosos ignorem validações de formulário do navegador:
* **Tamanho da Senha**: O backend rejeita senhas com menos de 6 caracteres ou mais de 72 caracteres (limite nativo de truncamento do algoritmo bcrypt, prevenindo ataques de negação de serviço por payloads gigantes).
* **Validação de E-mail**: Higienização com `trim().toLowerCase()` e verificação por expressão regular estrita antes de consultar o banco.
* **Higienização de Nomes**: Limite máximo de 100 caracteres e remoção de espaços desnecessários.

---

## 3. Gestão de Sessões e Tokens JWT

### 3.1 Tokens HMAC-SHA256 Assinados
* A sessão do usuário é gerenciada através de um token assinado com algoritmo HMAC-SHA256 utilizando uma chave secreta privada (`JWT_SECRET`).
* Cada token contém o `userId`, `email`, `name` e um timestamp de expiração (`exp`) de 30 dias.
* **Comparação em Tempo Constante (`timingSafeEqual`)**: Durante a validação da assinatura, a verificação não utiliza operadores comuns de igualdade (`===`), mas sim `crypto.timingSafeEqual` sobre buffers binários. Isso elimina completamente vazamentos de informação através de micro-variações no tempo de resposta (*side-channel timing attacks*).

### 3.2 Cookies de Sessão Blindados
Os tokens são transmitidos exclusivamente através de cookies com flags rígidas:
* **`httpOnly: true`**: Impede que scripts maliciosos injetados no navegador (XSS) consigam ler o cookie de autenticação.
* **`sameSite: "lax"`**: Mitiga ataques de falsificação de solicitação entre sites (*Cross-Site Request Forgery - CSRF*).
* **`secure: true` em Produção**: Garante que o cookie só trafegue por canais criptografados via HTTPS.

---

## 4. Rate Limiting e Proteção contra Força Bruta

Para proteger a aplicação contra ataques automatizados, scripts de scraping e tentativas exaustivas de adivinhação de senhas, foi implementado um módulo de **Rate Limiting por Janela Deslizante** em [src/lib/rate-limit.ts](file:///c:/Users/pedro/Desktop/orça%20mais/src/lib/rate-limit.ts).

### 4.1 Identificação Inteligente de IP
O limitador extrai o IP real do cliente considerando camadas de proxy reverso e balanceadores de carga:
1. `x-forwarded-for` (analisando o primeiro IP da cadeia de proxies da Vercel / Cloudflare).
2. `x-real-ip`.
3. Fallback seguro para conexões diretas.

### 4.2 Políticas por Endpoint

| Rota | Limite | Janela de Tempo | Finalidade |
| :--- | :--- | :--- | :--- |
| **`POST /api/auth/login`** | 5 requisições | 60 segundos | Bloqueia ataques de dicionário e adivinhação de credenciais. |
| **`POST /api/auth/register`** | 5 requisições | 5 minutos | Evita criação massiva de contas falsas e spam de banco. |
| **`GET /api/reports/pdf`** | 15 requisições | 60 segundos | Previne exaustão de CPU/memória pelo compilador de PDF. |
| **`POST /api/transactions`** | 60 requisições | 60 segundos | Impede bombardeio e inserção massiva de transações. |
| **`DELETE /api/transactions`**| 60 requisições | 60 segundos | Evita tentativas massivas de exclusão. |

### 4.3 Resposta Padrão HTTP 429
Quando o limite é excedido, o servidor corta o processamento imediatamente e devolve:
* Status code: `429 Too Many Requests`.
* Cabeçalho `Retry-After`: Segundos restantes para desbloqueio da janela.
* Cabeçalhos informativos: `X-RateLimit-Limit`, `X-RateLimit-Remaining: 0`, `X-RateLimit-Reset`.
* Mensagem JSON amigável: `{"error": "Muitas tentativas consecutivas. Aguarde alguns instantes antes de tentar novamente."}`.

---

## 5. Prevenção de Injeção e IDOR

### 5.1 Injeção SQL Mitigada por Design
* Todas as interações com o banco de dados PostgreSQL são realizadas através do **Prisma ORM**, que utiliza consultas parametrizadas (*prepared statements*) em todas as operações.
* Não há concatenação crua de strings em queries SQL.

### 5.2 Prevenção de IDOR (Insecure Direct Object Reference)
Em endpoints que recebem IDs de recursos na URL (como exclusão de transações ou desvinculação de chats):
```typescript
// Seguro: O banco só exclui se o registro pertencer ao usuário da sessão
await prisma.transaction.deleteMany({
  where: {
    id: transactionId,
    userId: currentUser.id, // Enforce de posse
  },
});
```
Mesmo que um invasor tente enviar o ID de uma transação de outro usuário, a query simplesmente não afeta nenhuma linha, garantindo total isolamento de dados.

---

## 6. Proteção de Variáveis de Ambiente e Infraestrutura

* O arquivo `.env` nunca é commitado no controle de versão (bloqueado em `.gitignore`).
* Nenhuma credencial privada ou chave de API carrega o prefixo `NEXT_PUBLIC_`.
* Todo o tráfego externo é forçado a utilizar criptografia SSL/TLS ponta a ponta (HTTPS) com certificado ativo.
