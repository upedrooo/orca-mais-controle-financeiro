/**
 * Orça + — Amostra de Código: Compilador Programático de Relatórios em PDF
 * 
 * Gera relatórios contábeis mensais no servidor em milissegundos usando jsPDF,
 * retornando um Buffer binário sem necessidade de navegador headless (Puppeteer).
 */

import { jsPDF } from "jspdf";

export interface TransactionSummary {
  description: string;
  category: string;
  amount: number;
  type: "EXPENSE" | "INCOME";
  date: Date | string;
  userName?: string;
}

export interface ReportOptions {
  user: { name: string; email: string; telegramCode: string };
  month: number;
  year: number;
  transactions: TransactionSummary[];
  balance: number;
  totalExpense: number;
  totalIncome: number;
}

export function generateMonthlyReportPdf(options: ReportOptions): Buffer {
  const { user, month, year, transactions, balance, totalExpense, totalIncome } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Paleta minimalista
  const darkColor: [number, number, number] = [17, 24, 39];      // #111827
  const slate500: [number, number, number] = [100, 116, 139];   // #64748b
  const slate100: [number, number, number] = [241, 245, 249];   // #f1f5f9
  const emeraldDark: [number, number, number] = [5, 150, 105];  // #059669
  const roseDark: [number, number, number] = [225, 29, 72];     // #e11d48

  // 1. Cabeçalho Institucional
  doc.setFillColor(...slate100);
  doc.roundedRect(14, 12, pageWidth - 28, 26, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...darkColor);
  doc.text("ORÇA +", 20, 23);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate500);
  doc.text("RELATÓRIO FINANCEIRO MENSAL", 20, 29);

  // Período e Conta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...darkColor);
  doc.text(`Mês ${month} de ${year}`, pageWidth - 20, 22, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...slate500);
  doc.text(`Conta: ${user.name} (${user.telegramCode})`, pageWidth - 20, 28, { align: "right" });

  // 2. Três Caixas de Destaque Financeiro (Saldo, Despesas, Receitas)
  const boxY = 44;
  const boxWidth = (pageWidth - 28 - 8) / 3;
  const boxHeight = 22;

  // Caixa 1: Saldo Líquido
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, boxY, boxWidth, boxHeight, 2.5, 2.5, "FD");
  doc.setFontSize(8);
  doc.setTextColor(...slate500);
  doc.text("SALDO DO MÊS", 18, boxY + 7);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...(balance >= 0 ? emeraldDark : roseDark));
  doc.text(balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), 18, boxY + 16);

  // Caixa 2: Total de Despesas
  const box2X = 14 + boxWidth + 4;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(box2X, boxY, boxWidth, boxHeight, 2.5, 2.5, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate500);
  doc.text("TOTAL GASTO", box2X + 4, boxY + 7);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...roseDark);
  doc.text(totalExpense.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), box2X + 4, boxY + 16);

  // Caixa 3: Total de Receitas
  const box3X = box2X + boxWidth + 4;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(box3X, boxY, boxWidth, boxHeight, 2.5, 2.5, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate500);
  doc.text("TOTAL RECEITAS", box3X + 4, boxY + 7);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...emeraldDark);
  doc.text(totalIncome.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), box3X + 4, boxY + 16);

  // 3. Extrato Tabular de Transações com Paginação Automática
  let currentY = 76;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkColor);
  doc.text(`Extrato de Movimentações (${transactions.length} registros)`, 14, currentY);

  currentY += 6;

  // Cabeçalho da Tabela
  doc.setFillColor(...slate100);
  doc.rect(14, currentY, pageWidth - 28, 7, "F");
  doc.setFontSize(8);
  doc.setTextColor(...darkColor);
  doc.text("DATA", 18, currentY + 4.8);
  doc.text("DESCRIÇÃO", 38, currentY + 4.8);
  doc.text("CATEGORIA", 110, currentY + 4.8);
  doc.text("AUTOR", 145, currentY + 4.8);
  doc.text("VALOR", pageWidth - 18, currentY + 4.8, { align: "right" });

  currentY += 7;

  // Linhas da Tabela (Zebrada)
  transactions.forEach((tx, index) => {
    // Nova página se atingir o rodapé
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 16;
    }

    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(14, currentY, pageWidth - 28, 6.5, "F");
    }

    const isIncome = tx.type === "INCOME";
    const dateFormatted = new Date(tx.date).toLocaleDateString("pt-BR");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...slate500);
    doc.text(dateFormatted, 18, currentY + 4.4);

    doc.setTextColor(...darkColor);
    doc.text(tx.description.slice(0, 36), 38, currentY + 4.4);
    doc.text(tx.category.slice(0, 18), 110, currentY + 4.4);
    doc.text((tx.userName || "Usuário").slice(0, 14), 145, currentY + 4.4);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(isIncome ? emeraldDark : darkColor));
    const formattedAmount = `${isIncome ? "+" : "-"} R$ ${tx.amount.toFixed(2)}`;
    doc.text(formattedAmount, pageWidth - 18, currentY + 4.4, { align: "right" });

    currentY += 6.5;
  });

  return Buffer.from(doc.output("arraybuffer"));
}
