const fs = require("fs");
const path = require("path");

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const root = path.join(__dirname, "..", "src");
const files = walk(root);
let changed = 0;

const IMPORT = "import { formatDisplayDate } from '@/lib/formatDate';";
const IMPORT_BOTH =
  "import { formatDisplayDate, formatDisplayDateTime } from '@/lib/formatDate';";

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (rel === "components/ui/chart.tsx") continue;
  if (rel === "lib/formatDate.ts") continue;

  if (!src.includes("toLocaleDateString") && !/new Date\([^)]*\)\.toLocaleString\(\)/.test(src)) {
    continue;
  }

  let next = src;

  next = next.replace(
    /row\.createdAt \|\| row\.date \|\| row\.expenseDate \? new Date\(row\.createdAt \|\| row\.date \|\| row\.expenseDate\)\.toLocaleDateString\(\) : ["']—["']/g,
    "formatDisplayDate(row.createdAt || row.date || row.expenseDate)"
  );

  next = next.replace(
    /new Date\(([^)]+)\)\.toLocaleDateString\(\)/g,
    "formatDisplayDate($1)"
  );

  next = next.replace(
    /new Date\(([^)]+)\)\.toLocaleDateString\(['"]en-US['"],\s*\{[^}]*\}\)/g,
    "formatDisplayDate($1)"
  );

  next = next.replace(
    /\$\{new Date\(\)\.toLocaleDateString\(\)\}/g,
    "${formatDisplayDate(new Date())}"
  );

  next = next.replace(
    /new Date\(([^)]+)\)\.toLocaleString\(\)/g,
    "formatDisplayDateTime($1)"
  );

  next = next.replace(
    /\$\{new Date\(\)\.toLocaleString\(\)\}/g,
    "${formatDisplayDateTime(new Date())}"
  );

  // Don't rewrite weekday short labels used for charts
  // (already skipped if only weekday option without year — those use object with only weekday)

  if (next === src) continue;

  const needsDateTime = next.includes("formatDisplayDateTime");
  const needsDate = next.includes("formatDisplayDate");

  if ((needsDate || needsDateTime) && !next.includes("@/lib/formatDate")) {
    const importLine = needsDateTime ? IMPORT_BOTH : IMPORT;
    if (/^['"]use client['"];?\r?\n/.test(next)) {
      next = next.replace(/^(['"]use client['"];?\r?\n)/, `$1${importLine}\n`);
    } else {
      next = `${importLine}\n${next}`;
    }
  } else if (
    needsDateTime &&
    next.includes("formatDisplayDate } from '@/lib/formatDate'") &&
    !next.includes("formatDisplayDateTime")
  ) {
    next = next.replace(IMPORT, IMPORT_BOTH);
  }

  fs.writeFileSync(file, next);
  changed++;
  console.log("updated", rel);
}

console.log("files changed", changed);
