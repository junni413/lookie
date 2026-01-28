export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Layout grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Top: summary */}
        <section className="col-span-12">
          <div className="h-48 rounded-lg border bg-card" />
        </section>

        {/* Left: zone */}
        <section className="col-span-12 lg:col-span-8">
          <div className="h-96 rounded-lg border bg-card" />
        </section>

        {/* Right: issue */}
        <section className="col-span-12 lg:col-span-4">
          <div className="h-96 rounded-lg border bg-card" />
        </section>
      </div>
    </div>
  );
}
