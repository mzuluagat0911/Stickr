import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Stickr</h1>
      <p className="text-muted-foreground max-w-md text-lg">
        Intercambiá figuritas del álbum Panini Mundial 2026 con confianza.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/signup">Empezar</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">Ya tengo cuenta</Link>
        </Button>
      </div>
    </div>
  );
}
