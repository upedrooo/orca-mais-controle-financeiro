/**
 * Orça + — Amostra de Código: Rate Limiter por Janela Deslizante (Sliding Window)
 * 
 * Implementação em memória, leve e independente de bibliotecas externas,
 * projetada para mitigar ataques de força bruta, scraping e abuso de endpoints.
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Armazenamento em memória indexado por chave (ex: "auth:login:192.168.1.1")
const store = new Map<string, RateLimitRecord>();

// Limpeza automática de registros expirados a cada 5 minutos
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (timer && typeof timer.unref === "function") {
    timer.unref();
  }
}

export interface RateLimitOptions {
  limit: number;    // Quantidade máxima permitida de requisições
  windowMs: number; // Duração da janela em milissegundos
}

/**
 * Extrai o IP real do cliente considerando proxies, Cloudflare e Vercel
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Valida se a requisição está dentro do limite estipulado.
 * Se o limite for excedido, devolve uma resposta HTTP 429 formatada.
 */
export function checkRateLimit(
  req: NextRequest,
  prefix: string,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetTime: number; response?: NextResponse } {
  const ip = getClientIp(req);
  const key = `${prefix}:${ip}`;
  const now = Date.now();

  const record = store.get(key);

  // Primeira requisição ou janela expirada: inicia novo ciclo
  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    store.set(key, newRecord);
    return {
      allowed: true,
      remaining: options.limit - 1,
      resetTime: newRecord.resetTime,
    };
  }

  // Limite excedido: corta o processamento e devolve HTTP 429
  if (record.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    const response = NextResponse.json(
      {
        error: "Muitas tentativas consecutivas. Aguarde alguns instantes antes de tentar novamente.",
        retryAfter: retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(options.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(record.resetTime / 1000)),
        },
      }
    );
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      response,
    };
  }

  // Dentro do limite: incrementa contador
  record.count += 1;
  return {
    allowed: true,
    remaining: options.limit - record.count,
    resetTime: record.resetTime,
  };
}
