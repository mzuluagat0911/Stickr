export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative z-10 flex min-h-[calc(100dvh-4rem)] flex-1 flex-col overflow-hidden">
      <div className="relative mx-auto flex w-full max-w-lg min-w-0 flex-1 flex-col justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] md:px-6 md:py-14">
        <div className="w-full rounded-[1.75rem] bg-white px-5 py-8 text-zinc-900 shadow-[0_25px_60px_-12px_rgb(0_0_0_/_0.35)] ring-1 ring-black/10 sm:rounded-[2rem] sm:px-8 sm:py-10 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-white/10">
          <div className="mb-8 space-y-2 text-center sm:mb-9">
            <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-zinc-500 uppercase sm:text-[0.7rem] sm:tracking-[0.28em] dark:text-zinc-400">
              Colección digital oficial
            </p>
            <p className="text-[0.7rem] font-bold tracking-[0.12em] text-[#d02670] uppercase sm:text-xs dark:text-[#ff6ba8]">
              FIFA World Cup 2026 · Stickr
            </p>
            <p className="text-3xl font-black tracking-tight text-balance text-zinc-950 sm:text-4xl dark:text-white">
              Stickr
            </p>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Cuenta · Mundiales 2026
            </p>
          </div>
          <div className="flex flex-col">{children}</div>
        </div>
      </div>
    </main>
  );
}
