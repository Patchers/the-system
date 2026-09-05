import { todayKey } from "./lib/date"

export default function App() {
  return (
    <main className="min-h-dvh p-4 flex flex-col gap-4">
      <section className="sys-panel p-5">
        <h1 className="text-2xl">The System</h1>
        <p className="text-sm opacity-80">Day {todayKey()}</p>
      </section>
    </main>
  )
}
