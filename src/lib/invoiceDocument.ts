import { formatDisplayDate } from "@/lib/formatDate";
import { formatMoney } from "@/lib/reportExport";
import {
  BusinessSettings,
  businessDetailLines,
  businessDisplayName,
} from "@/lib/businessSettings";
import { jsPDF } from "jspdf";

export type InvoiceDoc = {
  invoiceNumber: string;
  status?: string;
  issuedAt?: string;
  dueDate?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerCompany?: string | null;
  customerAddress?: string | null;
  includeVat?: boolean;
  vatRate?: number;
  subtotal?: number;
  vatAmount?: number;
  total?: number;
  notes?: string | null;
  quote?: { quoteNumber?: string } | null;
  order?: { orderNumber?: string } | null;
  items?: Array<{
    productName?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    description?: string | null;
  }>;
};

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printInvoiceDocument(
  invoice: InvoiceDoc,
  business?: BusinessSettings | string | null
) {
  const w = window.open("", "_blank");
  if (!w) throw new Error("Pop-up blocked. Allow pop-ups to print.");

  const biz: BusinessSettings =
    typeof business === "string" ? { businessName: business } : business || {};
  const companyName = businessDisplayName(biz);
  const details = businessDetailLines(biz);

  const items = invoice.items || [];
  const rows =
    items.length === 0
      ? `<tr><td colspan="4" style="padding:10px;color:#666">No line items</td></tr>`
      : items
          .map(
            (i) => `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(i.productName || "Item")}${
              i.description ? `<div style="color:#666;font-size:11px">${escapeHtml(i.description)}</div>` : ""
            }</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${Number(i.quantity || 0)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${escapeHtml(formatMoney(Number(i.unitPrice || 0)))}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${escapeHtml(formatMoney(Number(i.totalPrice || 0)))}</td>
          </tr>`
          )
          .join("");

  const ref = invoice.quote?.quoteNumber
    ? `Quote: ${invoice.quote.quoteNumber}`
    : invoice.order?.orderNumber
      ? `Order: ${invoice.order.orderNumber}`
      : "";

  const companyBlock = `
    <div style="margin-bottom:16px">
      <div style="font-size:20px;font-weight:700">${escapeHtml(companyName)}</div>
      ${details.map((d) => `<div style="color:#555;font-size:12px">${escapeHtml(d)}</div>`).join("")}
    </div>
  `;

  w.document.write(`
    <html>
      <head>
        <title>${escapeHtml(invoice.invoiceNumber)}</title>
        <style>
          body { font-family: sans-serif; padding: 28px 28px 48px; color: #111; }
          h1 { margin: 0 0 4px; font-size: 22px; }
          .meta { color: #666; font-size: 13px; margin-bottom: 18px; }
          .grid { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
          .box h3 { margin: 0 0 6px; font-size: 13px; text-transform: uppercase; color: #666; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { text-align: left; padding: 8px; border-bottom: 2px solid #ddd; background: #f8f8f8; }
          .totals { margin-top: 16px; width: 280px; margin-left: auto; font-size: 13px; }
          .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
          .totals .grand { font-weight: 700; font-size: 15px; border-top: 1px solid #ddd; margin-top: 6px; padding-top: 8px; }
          @media print { button { display: none !important; } }
        </style>
      </head>
      <body>
        ${companyBlock}
        <h1>INVOICE</h1>
        <div class="meta">${escapeHtml(invoice.invoiceNumber)} · ${escapeHtml(formatDisplayDate(invoice.issuedAt))}${ref ? ` · ${escapeHtml(ref)}` : ""}</div>
        <div class="grid">
          <div class="box">
            <h3>Bill to</h3>
            <div><strong>${escapeHtml(invoice.customerName || "—")}</strong></div>
            ${invoice.customerCompany ? `<div>${escapeHtml(invoice.customerCompany)}</div>` : ""}
            ${invoice.customerEmail ? `<div>${escapeHtml(invoice.customerEmail)}</div>` : ""}
            ${invoice.customerPhone ? `<div>${escapeHtml(invoice.customerPhone)}</div>` : ""}
            ${invoice.customerAddress ? `<div>${escapeHtml(invoice.customerAddress)}</div>` : ""}
          </div>
          <div class="box">
            <h3>Details</h3>
            <div>Status: ${escapeHtml(invoice.status || "Issued")}</div>
            <div>Issued: ${escapeHtml(formatDisplayDate(invoice.issuedAt))}</div>
            ${invoice.dueDate ? `<div>Due: ${escapeHtml(formatDisplayDate(invoice.dueDate))}</div>` : ""}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align:right">Qty</th>
              <th style="text-align:right">Unit</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <div><span>Subtotal</span><span>${escapeHtml(formatMoney(Number(invoice.subtotal || 0)))}</span></div>
          ${
            invoice.includeVat
              ? `<div><span>VAT (${Math.round(Number(invoice.vatRate || 0) * 100)}%)</span><span>${escapeHtml(formatMoney(Number(invoice.vatAmount || 0)))}</span></div>`
              : ""
          }
          <div class="grand"><span>Total</span><span>${escapeHtml(formatMoney(Number(invoice.total || 0)))}</span></div>
        </div>
        ${invoice.notes ? `<p style="margin-top:24px;font-size:12px;color:#555"><strong>Notes:</strong> ${escapeHtml(invoice.notes)}</p>` : ""}
        <div style="margin-top:24px;padding-bottom:32px;font-size:12px;color:#444">
          <strong>Terms &amp; Conditions</strong><br/>
          Payment: Cash payment
        </div>
      </body>
    </html>
  `);
  w.document.close();
  w.focus();
  w.print();
}

export function downloadInvoicePdf(
  invoice: InvoiceDoc,
  business?: BusinessSettings | string | null
) {
  const biz: BusinessSettings =
    typeof business === "string" ? { businessName: business } : business || {};
  const companyName = businessDisplayName(biz);
  const details = businessDetailLines(biz);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  details.forEach((line) => {
    doc.text(line, margin, y);
    y += 4.5;
  });
  doc.setTextColor(0);
  y += 3;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", margin, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90);
  doc.text(
    `${invoice.invoiceNumber} · ${formatDisplayDate(invoice.issuedAt)}`,
    margin,
    y
  );
  y += 6;
  if (invoice.quote?.quoteNumber) {
    doc.text(`From quote: ${invoice.quote.quoteNumber}`, margin, y);
    y += 6;
  }
  doc.setTextColor(0);
  y += 2;

  doc.setFont("helvetica", "bold");
  doc.text("Bill to", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  const bill = [
    invoice.customerName,
    invoice.customerCompany,
    invoice.customerEmail,
    invoice.customerPhone,
    invoice.customerAddress,
  ].filter(Boolean) as string[];
  bill.forEach((line) => {
    doc.text(line, margin, y);
    y += 5;
  });
  y += 4;

  const items = invoice.items || [];
  doc.setFont("helvetica", "bold");
  doc.text("Item", margin, y);
  doc.text("Qty", 110, y);
  doc.text("Unit", 135, y);
  doc.text("Total", 170, y);
  y += 2;
  doc.setDrawColor(200);
  doc.line(margin, y, 196, y);
  y += 6;
  doc.setFont("helvetica", "normal");

  items.forEach((i) => {
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
    const name = doc.splitTextToSize(i.productName || "Item", 90);
    doc.text(name[0] || "", margin, y);
    doc.text(String(i.quantity || 0), 110, y);
    doc.text(formatMoney(Number(i.unitPrice || 0)), 135, y);
    doc.text(formatMoney(Number(i.totalPrice || 0)), 170, y);
    y += 7;
  });

  y += 4;
  doc.line(120, y, 196, y);
  y += 7;
  doc.text(`Subtotal: ${formatMoney(Number(invoice.subtotal || 0))}`, 120, y);
  y += 6;
  if (invoice.includeVat) {
    doc.text(
      `VAT (${Math.round(Number(invoice.vatRate || 0) * 100)}%): ${formatMoney(Number(invoice.vatAmount || 0))}`,
      120,
      y
    );
    y += 6;
  }
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${formatMoney(Number(invoice.total || 0))}`, 120, y);
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Terms & Conditions", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text("Payment: Cash payment", margin, y);
  y += 14;
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text("Thank you for your business!", margin, y);

  doc.save(`${invoice.invoiceNumber || "invoice"}.pdf`);
}
