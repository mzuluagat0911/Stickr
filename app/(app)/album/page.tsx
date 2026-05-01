import { Button } from "@/components/ui/button";

export default function AlbumPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mi Álbum</h1>
        <p className="text-muted-foreground mt-2 max-w-lg text-base leading-relaxed">
          Próximamente vas a poder marcar tus 980 figuritas
        </p>
      </div>
      <Button type="button" disabled>
        Ver catálogo
      </Button>
      <p className="text-muted-foreground text-sm">
        El catálogo se habilitará en una próxima versión.
      </p>
    </div>
  );
}
