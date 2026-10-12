/**
 * Orça + — Amostra de Código: Parser Determinístico de Mensagens
 * 
 * Extrai descrição e valor numérico a partir de mensagens enviadas no Telegram
 * seguindo o modelo "Descrição (Valor)", sem latência ou custo de IA.
 * 
 * Exemplos suportados:
 * - "Pão de queijo (10)" -> { description: "Pão de queijo", amount: 10 }
 * - "Almoço (35,50)" -> { description: "Almoço", amount: 35.5 }
 * - "Supermercado [R$ 150.25]" -> { description: "Supermercado", amount: 150.25 }
 * - "Gasolina (100 reais)" -> { description: "Gasolina", amount: 100 }
 */

export interface ParsedTransaction {
  description: string;
  amount: number;
}

export function parseDescriptionAndAmount(rawText: string): ParsedTransaction | null {
  if (!rawText || typeof rawText !== "string") return null;
  const text = rawText.trim();

  // Expressão regular que captura valores entre parênteses, colchetes ou chaves
  // Suporta: R$, reais, separadores de milhar e decimais (vírgula ou ponto)
  const pattern = /[({\[]\s*(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:reais|real)?\s*[)}\]]/i;

  const match = text.match(pattern);
  if (!match) return null;

  const rawNum = match[1];
  let cleanNum = rawNum;

  // Normalização para formato de ponto flutuante padrão (ex: 1.250,50 -> 1250.50)
  if (cleanNum.includes(".") && cleanNum.includes(",")) {
    if (cleanNum.indexOf(".") < cleanNum.indexOf(",")) {
      cleanNum = cleanNum.replace(/\./g, "").replace(",", ".");
    } else {
      cleanNum = cleanNum.replace(/,/g, "");
    }
  } else if (cleanNum.includes(",")) {
    cleanNum = cleanNum.replace(",", ".");
  }

  const amount = parseFloat(cleanNum);
  if (isNaN(amount) || amount <= 0) return null;

  // Extrai a descrição removendo o bloco do valor
  let description = text.replace(match[0], "").replace(/\s+/g, " ").trim();
  description = description.replace(/^[-:–]\s*/, "").replace(/\s*[-:–]$/, "").trim();

  // Capitalização da primeira letra para consistência visual no extrato
  if (description) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  } else {
    description = "Gasto";
  }

  return {
    description,
    amount: Number(amount.toFixed(2)),
  };
}
