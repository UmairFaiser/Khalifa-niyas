export default function LandingPage() {
  return (
    <main className="min-h-dvh">
      <div className="flex flex-col mt-20">
        <h1 className="text-center my-auto font-[450] text-5xl tracking-tighter">
          <span className="rounded-full bg-gray-400 pb-1.5 border-shadow-border px-5 py-1">
            testimonials
          </span>
        </h1>
        <p className="text-center text-lg mt-4 tracking-[-0.22px] [word-spacing:0.09em]">
          See what students say about our classes
        </p>
      </div>
      <section>
        <div className="grid place-items-center mt-10">
          <div className="h-50 w-2xl shadow-border rounded-lg bg-preview-bg"></div>
        </div>
      </section>
    </main>
  );
}
