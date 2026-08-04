import { exec } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";

const execAsync = promisify(exec);

const DATABASE_URL =
  process.env.BACKUP_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:vMuIausTnTiYYYzzKbMOPVOHbHCstwMj@gondola.proxy.rlwy.net:14553/railway";

const PG_DUMP =
  process.env.PG_DUMP_PATH ||
  "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe";

const BACKUP_COMMAND = `$backupFile = "backupforshopmanagement_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"; & "${PG_DUMP}" "${DATABASE_URL}" > $backupFile; Write-Output $backupFile`;

export async function POST() {
  if (process.platform !== "win32") {
    return NextResponse.json(
      {
        success: false,
        error: "Database backup is only supported on Windows with pg_dump installed.",
      },
      { status: 501 }
    );
  }

  try {
    const { stdout, stderr } = await execAsync(
      `powershell -NoProfile -Command "${BACKUP_COMMAND.replace(/"/g, '\\"')}"`,
      { cwd: process.cwd() }
    );

    const backupFile = stdout.trim() || "backup file created";

    return NextResponse.json({
      success: true,
      backupFile,
      stderr: stderr || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backup failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
