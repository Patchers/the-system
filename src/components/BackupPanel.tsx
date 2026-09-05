import { useRef, useState, type ChangeEvent } from "react"
import { BackupError, parseBackup, summariseImport } from "../db/backup"
import { todayKey } from "../lib/date"
import { exportBackup, importBackup } from "../repo/backupRepo"
import { usePanelStore } from "../store/panelStore"

/** JSON export and import. Export downloads a file; import merges last-write-wins. */
export function BackupPanel() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doExport = async () => {
    setError(null)
    setBusy(true)
    try {
      const backup = await exportBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `the-system-${todayKey()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Could not build the backup.")
    } finally {
      setBusy(false)
    }
  }

  const doImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    setBusy(true)
    try {
      const summary = await importBackup(parseBackup(await file.text()))
      usePanelStore.getState().push({ title: "RESTORE COMPLETE", lines: summariseImport(summary), tone: "success" })
    } catch (err) {
      setError(err instanceof BackupError ? err.message : "Could not read that file.")
    } finally {
      setBusy(false)
    }
  }

  const btn = "flex-1 font-heading tracking-widest border border-[var(--border)] disabled:opacity-40"

  return (
    <section className="sys-panel p-4 flex flex-col gap-3" aria-labelledby="backup-heading">
      <h2 id="backup-heading" className="text-lg">
        Backup
      </h2>
      <p className="text-sm opacity-70">
        Everything lives on this device. Export regularly. Importing merges by record, keeping whichever copy was saved last.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={doExport} disabled={busy} className={btn}>
          EXPORT
        </button>
        <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className={btn}>
          IMPORT
        </button>
      </div>
      <input ref={fileInput} type="file" accept="application/json,.json" onChange={doImport} className="hidden" aria-label="Choose a backup file" />
      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
    </section>
  )
}
