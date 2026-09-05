/** Stand-in for tabs whose build step has not been reached yet. */
export function PendingScreen({ name }: { name: string }) {
  return (
    <section className="sys-panel p-5">
      <h1 className="text-2xl">{name}</h1>
      <p className="opacity-70 mt-2">This section has not been unlocked yet.</p>
    </section>
  )
}
