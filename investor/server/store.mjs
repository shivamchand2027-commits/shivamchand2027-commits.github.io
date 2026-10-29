import { google } from "googleapis";
import { safeCell } from "./core.mjs";
export const COLUMNS = {
  Investors: [
    "id",
    "subject",
    "name",
    "email",
    "phone",
    "firm",
    "country",
    "amount",
    "currency",
    "role",
    "whatsappSelfDeclared",
    "consentVersion",
    "createdAt",
    "updatedAt",
  ],
  Interests: [
    "id",
    "requestId",
    "userId",
    "startupId",
    "name",
    "email",
    "phone",
    "firm",
    "country",
    "amount",
    "currency",
    "role",
    "whatsappSelfDeclared",
    "consentVersion",
    "createdAt",
    "status",
  ],
  Startups: [
    "id",
    "name",
    "industry",
    "country",
    "stage",
    "summary",
    "ask",
    "askCurrency",
    "origin",
    "sourceUrl",
    "sourceExcerpt",
    "sourcePermission",
    "raisingStatus",
    "lastVerifiedAt",
    "expiresAt",
    "publicationConsent",
    "consentRef",
    "publication",
  ],
  SourceQueue: [
    "id",
    "name",
    "sourceUrl",
    "sourceExcerpt",
    "observedAt",
    "contentHash",
    "status",
    "reason",
  ],
  Orders: [
    "id",
    "userId",
    "providerOrderId",
    "amount",
    "currency",
    "createdAt",
    "state",
    "paymentId",
    "billingMode",
    "termsVersion",
  ],
  Access: [
    "id",
    "userId",
    "paymentId",
    "startsAt",
    "endsAt",
    "status",
    "providerSubscriptionId",
  ],
  Events: ["id", "type", "providerRef", "createdAt", "result"],
  Settings: ["key", "value"],
};
export class SheetStore {
  constructor(id) {
    this.id = id;
    this.api = google.sheets({
      version: "v4",
      auth: new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      }),
    });
  }
  async all(tab) {
    const r = await this.api.spreadsheets.values.get({
      spreadsheetId: this.id,
      range: `'${tab}'!A:Z`,
    });
    const rows = r.data.values || [];
    if (!rows.length) return [];
    return rows
      .slice(1)
      .map((row) =>
        Object.fromEntries(rows[0].map((h, i) => [h, row[i] ?? ""])),
      );
  }
  async put(tab, row) {
    const rows = await this.all(tab),
      i = rows.findIndex((x) => x.id === row.id),
      cols = COLUMNS[tab];
    await this.api.spreadsheets.values.update({
      spreadsheetId: this.id,
      range: `'${tab}'!A${i < 0 ? rows.length + 2 : i + 2}`,
      valueInputOption: "RAW",
      requestBody: { values: [cols.map((k) => safeCell(row[k]))] },
    });
    return row;
  }
}
export class MemoryStore {
  constructor() {
    this.rows = Object.fromEntries(Object.keys(COLUMNS).map((t) => [t, []]));
  }
  async all(t) {
    return this.rows[t].map((r) => ({ ...r }));
  }
  async put(t, r) {
    const i = this.rows[t].findIndex((x) => x.id === r.id);
    if (i < 0) this.rows[t].push({ ...r });
    else this.rows[t][i] = { ...r };
    return r;
  }
}
