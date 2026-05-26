import { jsPDF } from "jspdf";
import type { BillingQuotePreview } from "../../lib/api";

const brand = {
  primary: [15, 23, 42] as [number, number, number],
  accent: [37, 99, 235] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  border: [226, 232, 240] as [number, number, number]
};

function formatUSD(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  }).format(value);
}

function formatTRY(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

async function loadImageDataUrl(path: string): Promise<string | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadBillingQuotePdf(quote: BillingQuotePreview) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  const [wordmark, mark] = await Promise.all([
    loadImageDataUrl("/ogta-wordmark.png"),
    loadImageDataUrl("/ogta-mark.png")
  ]);

  if (wordmark) {
    doc.addImage(wordmark, "PNG", margin, y - 6, 120, 28);
  } else if (mark) {
    doc.addImage(mark, "PNG", margin, y, 28, 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...brand.primary);
    doc.text("OGTA", margin + 36, y + 20);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...brand.primary);
    doc.text("OGTA Platform", margin, y + 18);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...brand.primary);
  doc.text("Fiyat Teklifi", pageWidth - margin, y + 12, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...brand.muted);
  doc.text(quote.quoteNumber, pageWidth - margin, y + 28, { align: "right" });
  y += 52;

  doc.setDrawColor(...brand.border);
  doc.line(margin, y, pageWidth - margin, y);
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...brand.primary);
  doc.text("Teklif bilgileri", margin, y);
  doc.text("Kurum", pageWidth / 2 + 8, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...brand.muted);
  doc.text(`Düzenleme: ${formatDate(quote.issuedAt)}`, margin, y);
  doc.text(quote.institutionName, pageWidth / 2 + 8, y);
  y += 14;
  doc.text(`Geçerlilik: ${formatDate(quote.validUntil)}`, margin, y);
  if (quote.contactName) {
    doc.text(`Yetkili: ${quote.contactName}`, pageWidth / 2 + 8, y);
  }
  y += 14;
  doc.text(`${quote.termYears} yıllık · ${quote.packageName} paketi`, margin, y);
  if (quote.contactEmail) {
    doc.text(quote.contactEmail, pageWidth / 2 + 8, y);
  }
  y += 22;

  if (quote.packageFeatures.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...brand.primary);
    doc.text("Paket kapsamı", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...brand.muted);
    for (const feature of quote.packageFeatures.slice(0, 6)) {
      doc.text(`• ${feature}`, margin + 4, y);
      y += 12;
    }
    y += 8;
  }

  const tableX = margin;
  const colQty = pageWidth - margin - 220;
  const colUnit = pageWidth - margin - 130;
  const colAmount = pageWidth - margin;

  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y - 12, pageWidth - margin * 2, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...brand.primary);
  doc.text("Kalem", tableX, y);
  doc.text("Adet", colQty, y, { align: "right" });
  doc.text("Birim", colUnit, y, { align: "right" });
  doc.text("Tutar", colAmount, y, { align: "right" });
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const item of quote.lineItems) {
    doc.setTextColor(...brand.primary);
    doc.text(item.label, tableX, y, { maxWidth: colQty - tableX - 12 });
    doc.setTextColor(...brand.muted);
    doc.text(String(item.quantity), colQty, y, { align: "right" });
    doc.text(`${formatUSD(item.unitPrice)} / ${item.unitLabel}`, colUnit, y, { align: "right" });
    doc.setTextColor(...brand.primary);
    doc.text(formatUSD(item.amountUsd), colAmount, y, { align: "right" });
    y += 18;
  }

  y += 8;
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  const totalsX = pageWidth - margin - 180;
  doc.setFontSize(10);
  doc.setTextColor(...brand.muted);
  doc.text("Ara toplam", totalsX, y);
  doc.setTextColor(...brand.primary);
  doc.text(formatUSD(quote.subtotalUsd), colAmount, y, { align: "right" });
  y += 16;

  if (quote.discountUsd > 0) {
    doc.setTextColor(...brand.muted);
    doc.text(`İndirim (%${quote.discountPercent})`, totalsX, y);
    doc.setTextColor(220, 38, 38);
    doc.text(`-${formatUSD(quote.discountUsd)}`, colAmount, y, { align: "right" });
    y += 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...brand.accent);
  doc.text("Toplam (USD)", totalsX, y);
  doc.text(formatUSD(quote.totalUsd), colAmount, y, { align: "right" });
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...brand.muted);
  doc.text(`Kur: 1 USD = ${quote.usdTryRate.toFixed(2)} TRY`, totalsX, y);
  doc.setTextColor(...brand.primary);
  doc.text(formatTRY(quote.totalTry), colAmount, y, { align: "right" });
  y += 28;

  doc.setFillColor(239, 246, 255);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 54, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...brand.accent);
  doc.text(`${quote.packageName} — öğrenci başına yıllık lisans`, margin + 14, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...brand.primary);
  doc.text(
    `${quote.studentCount} öğrenci × ${formatUSD(quote.pricePerStudentUsd)} × ${quote.termYears} yıl`,
    margin + 14,
    y + 36
  );
  if (quote.minimumApplied && quote.minOrderUsd > 0) {
    doc.setFontSize(8);
    doc.setTextColor(...brand.muted);
    doc.text(`Min. sipariş: ${formatUSD(quote.minOrderUsd)}/yıl uygulandı`, margin + 14, y + 48);
    y += 10;
  }
  if (quote.pricingCustomized) {
    doc.setFontSize(8);
    doc.setTextColor(...brand.accent);
    doc.text(
      `Özel fiyatlandırma (varsayılan: ${formatUSD(quote.defaultPricePerStudentUsd)}, min ${formatUSD(quote.defaultMinOrderUsd)})`,
      margin + 14,
      y + 48
    );
  }
  doc.setFont("helvetica", "bold");
  doc.text(formatUSD(quote.totalUsd), pageWidth - margin - 14, y + 28, { align: "right" });
  y += 72;

  if (quote.notes.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...brand.primary);
    doc.text("Notlar", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...brand.muted);
    const noteLines = doc.splitTextToSize(quote.notes.trim(), pageWidth - margin * 2);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 12 + 12;
  }

  const footerY = doc.internal.pageSize.getHeight() - 56;
  doc.setDrawColor(...brand.border);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...brand.muted);
  doc.text(quote.companyName, margin, footerY + 16);
  doc.text(quote.companyEmail, margin, footerY + 28);
  doc.text("ogta.ai · Öğrenci Takip Sistemi", pageWidth - margin, footerY + 22, { align: "right" });

  doc.save(`${quote.quoteNumber}.pdf`);
}
