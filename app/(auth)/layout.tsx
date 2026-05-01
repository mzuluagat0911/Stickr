export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col px-4 py-10 md:py-14">
        <div className="mb-10 space-y-1.5 text-center">
          <p className="text-foreground text-[13px] font-semibold tracking-[-0.02em]">
            Stickr
          </p>
          <p className="text-muted-foreground text-[15px] font-normal tracking-tight">
            Cuenta · Mundiales 2026
          </p>
        </div>
        <div className="flex flex-1 flex-col justify-center pb-10">
          {children}
        </div>
      </div>
    </main>
  );
}
