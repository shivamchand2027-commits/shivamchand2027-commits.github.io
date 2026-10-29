// Explicit operations sync. DB is canonical for auth/payment/interest state.
import { PostgresStore } from "../server/postgres.mjs";
import { SheetStore } from "../server/store.mjs";
import { visible } from "../server/core.mjs";
if (!process.env.DATABASE_URL || !process.env.INVESTOR_SHEET_ID)
  throw Error("Both private stores must be configured");
const db = new PostgresStore(process.env.DATABASE_URL),
  sheet = new SheetStore(process.env.INVESTOR_SHEET_ID);
try {
  const mode = process.argv[2];
  if (mode === "export-operations") {
    for (const tab of [
      "Investors",
      "Interests",
      "SourceQueue",
      "Orders",
      "Access",
      "Events",
    ]) {
      const rows = await db.all(tab);
      for (const row of rows) await sheet.put(tab, row);
      console.log(tab + ": " + rows.length + " records exported");
    }
  } else if (mode === "import-reviewed-startups") {
    const rows = await sheet.all("Startups"),
      ids = new Set();
    for (const r of rows) {
      if (!r.id || ids.has(r.id))
        throw Error("Missing or duplicate startup IDs");
      ids.add(r.id);
      if (r.publication === "approved" && !visible(r))
        throw Error(
          "Approved startup lacks valid current publication evidence: " + r.id,
        );
    }
    await db.transaction(async () => {
      const old = await db.all("Startups");
      for (const r of old)
        if (!ids.has(r.id))
          await db.put("Startups", { ...r, publication: "removed" });
      for (const r of rows) await db.put("Startups", r);
    });
    console.log(rows.length + " reviewed startup records synchronized");
  } else throw Error("Choose export-operations or import-reviewed-startups");
} finally {
  await db.close();
}
