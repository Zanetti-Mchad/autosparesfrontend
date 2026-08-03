import { fetchApi } from "@/lib/apiConfig";

export type BusinessSettings = {
  businessName?: string | null;
  businessTagLine?: string | null;
  location?: string | null;
  telephone?: string | null;
  email?: string | null;
  tin?: string | null;
  logoUrl?: string | null;
};

export const DEFAULT_BUSINESS_NAME = "Business";

/** Load business profile from Settings (businessName, contact, TIN, etc.). */
export async function fetchBusinessSettings(): Promise<BusinessSettings> {
  try {
    const res = await fetchApi("/settings/business").catch(() =>
      fetchApi("/settings/view")
    );
    const data = res?.data ?? res ?? {};
    return {
      businessName: data.businessName || null,
      businessTagLine: data.businessTagLine || null,
      location: data.location || null,
      telephone: data.telephone || null,
      email: data.email || null,
      tin: data.tin || null,
      logoUrl: data.logoUrl || data.logo || null,
    };
  } catch {
    return {};
  }
}

export function businessDisplayName(biz?: BusinessSettings | null) {
  return (biz?.businessName || "").trim() || DEFAULT_BUSINESS_NAME;
}

/** Extra header lines under the business name (tagline, address, phone, email, TIN). */
export function businessDetailLines(biz?: BusinessSettings | null): string[] {
  if (!biz) return [];
  return [
    biz.businessTagLine,
    biz.location,
    biz.telephone ? `Tel: ${biz.telephone}` : null,
    biz.email ? `Email: ${biz.email}` : null,
    biz.tin ? `TIN: ${biz.tin}` : null,
  ].filter((line): line is string => Boolean(line && String(line).trim()));
}
