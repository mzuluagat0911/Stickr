export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col px-4 py-10 md:py-14">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">
            Stickr
          </p>
          <p className="text-muted-foreground text-sm font-medium tracking-tight">
            Cuenta · intercambios Mundial 2026
          </p>
        </div>
        <div className="flex flex-1 flex-col justify-center pb-10">
          {children}
        </div>
      </div>
    </main>
  );
}
