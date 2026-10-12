/**
 * Orça + — Amostra de Código: Autenticação, Hashing e Sessões Seguras
 * 
 * Implementa:
 * 1. Hashing de senhas com bcrypt (10 rounds de salt).
 * 2. Assinatura de tokens JWT compactos via HMAC-SHA256.
 * 3. Validação de assinatura com tempo constante (timingSafeEqual) contra side-channel timing attacks.
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  exp: number;
}

/**
 * Criptografa a senha antes de persistir no banco de dados
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compara a senha fornecida pelo usuário com o hash armazenado
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Assina um token de sessão compacto no formato header.body.signature
 */
export function signSessionToken(
  payload: Omit<SessionPayload, "exp">,
  secret: string
): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // Válido por 30 dias
  const fullPayload: SessionPayload = { ...payload, exp };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

/**
 * Verifica a autenticidade e validade do token de sessão.
 * Utiliza crypto.timingSafeEqual para evitar vulnerabilidades de timing attack.
 */
export function verifySessionToken(
  token: string,
  secret: string
): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`${header}.${body}`)
      .digest("base64url");

    // Comparação em tempo constante sobre buffers binários
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));

    // Verifica expiração
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
