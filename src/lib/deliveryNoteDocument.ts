import { formatDisplayDate, formatDisplayDateTime } from "@/lib/formatDate";
import { formatMoney } from "@/lib/reportExport";
import {
  BusinessSettings,
  businessDetailLines,
  businessDisplayName,
  fetchBusinessSettings,
} from "@/lib/businessSettings";
import { jsPDF } from "jspdf";

export type DeliveryNoteDoc = {
  deliveryNumber: string;
  status?: string;
  route?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  transportCost?: number;
  customerSignature?: string | null;
  notes?: string | null;
  deliveredAt?: string | null;
  createdAt?: string | null;
  order?: {
    orderNumber?: string;
    total?: number;
    notes?: string | null;
    items?: Array<{
      productName?: string;
      quantity?: number;
      unitPrice?: number;
      totalPrice?: number;
      size?: string | null;
    }>;
  } | null;
};

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function noteHtml(delivery: DeliveryNoteDoc, business?: BusinessSettings | null) {
  const companyName = businessDisplayName(business);
  const details = businessDetailLines(business);
  const items = delivery.order?.items || [];
  const rows =
    items.length === 0
      ? `<tr><td colspan="4" style="padding:10px;color:#666">No line items</td></tr>`
      : items
          .map(
            (i) => `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(i.productName || "Item")}${
              i.size ? ` <span style="color:#666;font-size:11px">(${escapeHtml(i.size)})</span>` : ""
            }</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${Number(i.quantity || 0)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${escapeHtml(formatMoney(Number(i.unitPrice || 0)))}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${escapeHtml(formatMoney(Number(i.totalPrice || 0)))}</td>
          </tr>`
          )
          .join("");

  const companyBlock = `
    <div style="text-align:center;margin-bottom:18px">
      <div style="font-size:20px;font-weight:700">${escapeHtml(companyName)}</div>
      ${details.map((l) => `<div style="font-size:12px;color:#555">${escapeHtml(l)}</div>`).join("")}
    </div>`;

  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>Delivery Note ${escapeHtml(delivery.deliveryNumber)}</title>
<style>
  body { font-family: sans-serif; padding: 28px 28px 48px; color: #111; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th { text-align: left; border-bottom: 2px solid #222; padding: 8px; font-size: 12px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; margin: 16px 0; }
  .sig { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .sig-line { border-top: 1px solid #333; padding-top: 6px; font-size: 12px; margin-top: 40px; }
  @media print { body { padding-bottom: 40px; } }
</style></head><body>
  ${companyBlock}
  <h1 style="font-size:18px;margin:0 0 4px">Delivery Note</h1>
  <div style="font-size:13px;color:#444;margin-bottom:12px">
    <strong>${escapeHtml(delivery.deliveryNumber)}</strong>
    ${delivery.status ? ` · ${escapeHtml(delivery.status)}` : ""}
    ${delivery.order?.orderNumber ? ` · Order ${escapeHtml(delivery.order.orderNumber)}` : ""}
  </div>
  <div class="meta">
    <div><strong>Customer</strong><br/>${escapeHtml(delivery.customerName || "—")}<br/>${escapeHtml(delivery.customerPhone || "")}</div>
    <div><strong>Deliver to</strong><br/>${escapeHtml(delivery.deliveryAddress || "—")}</div>
    <div><strong>Route / Driver</strong><br/>${escapeHtml(delivery.route || "—")}<br/>${escapeHtml(
      [delivery.driverName, delivery.driverPhone].filter(Boolean).join(" · ") || "Unassigned"
    )}</div>
    <div><strong>Date</strong><br/>${escapeHtml(
      formatDisplayDate(delivery.deliveredAt || delivery.createdAt || new Date())
    )}
    ${
      delivery.transportCost
        ? `<br/>Transport: ${escapeHtml(formatMoney(Number(delivery.transportCost)))}`
        : ""
    }</div>
  </div>
  <table>
    <thead><tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${
    delivery.order?.total != null
      ? `<p style="text-align:right;margin-top:12px;font-weight:700">Order total: ${escapeHtml(
          formatMoney(Number(delivery.order.total))
        )}</p>`
      : ""
  }
  ${
    delivery.notes
      ? `<p style="margin-top:16px;font-size:12px;color:#555"><strong>Notes:</strong> ${escapeHtml(
          delivery.notes
        )}</p>`
      : ""
  }
  <div class="sig">
    <div class="sig-line">Received by${
      delivery.customerSignature
        ? `: ${escapeHtml(delivery.customerSignature)}`
        : " (name / signature)"
    }</div>
    <div class="sig-line">Driver / Date</div>
  </div>
  <p style="margin-top:28px;font-size:11px;color:#888">Generated ${escapeHtml(
    formatDisplayDateTime(new Date())
  )}</p>
</body></html>`;
}

export function printDeliveryNote(
  delivery: DeliveryNoteDoc,
  business?: BusinessSettings | string | null
) {
  const w = window.open("", "_blank");
  if (!w) throw new Error("Pop-up blocked. Allow pop-ups to print.");
  const biz: BusinessSettings =
    typeof business === "string" ? { businessName: business } : business || {};
  w.document.write(noteHtml(delivery, biz));
  w.document.close();
  w.focus();
  w.print();
}

export async function printDeliveryNoteWithBusiness(delivery: DeliveryNoteDoc) {
  const business = await fetchBusinessSettings();
  printDeliveryNote(delivery, business);
}

export function downloadDeliveryNotePdf(
  delivery: DeliveryNoteDoc,
  business?: BusinessSettings | string | null
) {
  const biz: BusinessSettings =
    typeof business === "string" ? { businessName: business } : business || {};
  const companyName = businessDisplayName(biz);
  const details = businessDetailLines(biz);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 16;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(companyName, margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  details.forEach((line) => {
    doc.text(line, margin, y);
    y += 4;
  });
  doc.setTextColor(0);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Delivery Note", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `${delivery.deliveryNumber}${delivery.status ? ` · ${delivery.status}` : ""}${
      delivery.order?.orderNumber ? ` · Order ${delivery.order.orderNumber}` : ""
    }`,
    margin,
    y
  );
  y += 8;

  const left = [
    `Customer: ${delivery.customerName || "—"}`,
    delivery.customerPhone || "",
    `Address: ${delivery.deliveryAddress || "—"}`,
  ].filter(Boolean);
  const right = [
    `Route: ${delivery.route || "—"}`,
    `Driver: ${delivery.driverName || "Unassigned"}`,
    delivery.driverPhone || "",
    `Date: ${formatDisplayDate(delivery.deliveredAt || delivery.createdAt || new Date())}`,
  ].filter(Boolean);
  left.forEach((line, i) => doc.text(line, margin, y + i * 5));
  right.forEach((line, i) => doc.text(line, 110, y + i * 5));
  y += Math.max(left.length, right.length) * 5 + 6;

  doc.setFont("helvetica", "bold");
  doc.text("Item", margin, y);
  doc.text("Qty", 110, y);
  doc.text("Unit", 130, y);
  doc.text("Amount", 160, y);
  y += 2;
  doc.setDrawColor(180);
  doc.line(margin, y, 194, y);
  y += 5;
  doc.setFont("helvetica", "normal");

  const items = delivery.order?.items || [];
  if (!items.length) {
    doc.setTextColor(100);
    doc.text("No line items", margin, y);
    doc.setTextColor(0);
    y += 6;
  } else {
    items.forEach((i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const name = `${i.productName || "Item"}${i.size ? ` (${i.size})` : ""}`;
      const nameLines = doc.splitTextToSize(name, 90);
      doc.text(nameLines, margin, y);
      doc.text(String(Number(i.quantity || 0)), 110, y);
      doc.text(formatMoney(Number(i.unitPrice || 0)), 130, y);
      doc.text(formatMoney(Number(i.totalPrice || 0)), 160, y);
      y += Math.max(nameLines.length * 5, 6);
    });
  }

  if (delivery.order?.total != null) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text(`Order total: ${formatMoney(Number(delivery.order.total))}`, 120, y);
  }
  if (delivery.transportCost) {
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Transport: ${formatMoney(Number(delivery.transportCost))}`, 120, y);
  }
  if (delivery.notes) {
    y += 10;
    doc.setFontSize(9);
    const noteLines = doc.splitTextToSize(`Notes: ${delivery.notes}`, 178);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 4 + 8;
  } else {
    y += 16;
  }

  y = Math.max(y, 240);
  doc.setFontSize(10);
  doc.line(margin, y, 90, y);
  doc.line(110, y, 194, y);
  y += 5;
  doc.setFontSize(9);
  doc.text(
    delivery.customerSignature
      ? `Received by: ${delivery.customerSignature}`
      : "Received by (name / signature)",
    margin,
    y
  );
  doc.text("Driver / Date", 110, y);
  y += 14;
  doc.setTextColor(120);
  doc.text(`Generated ${formatDisplayDateTime(new Date())}`, margin, y);

  doc.save(`${delivery.deliveryNumber.replace(/\//g, "-") || "delivery-note"}.pdf`);
}

export async function downloadDeliveryNotePdfWithBusiness(delivery: DeliveryNoteDoc) {
  const business = await fetchBusinessSettings();
  downloadDeliveryNotePdf(delivery, business);
}
