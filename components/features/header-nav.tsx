"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { signOutAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/features/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type UserLite = {
  id: string;
  email?: string;
};

type ProfileLite = {
  username: string;
  avatar_url: string | null;
} | null;

function navActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (href === "/login" || href === "/signup") {
    return pathname === href;
  }
  return pathname.startsWith(`${href}/`);
}

function HeaderNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = navActive(pathname, href);
  return (
    <Link
      href={href}
      className={cn(
        "text-muted-foreground hover:text-foreground shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        active && "bg-primary/10 text-primary ring-primary/25 ring-1",
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

export function HeaderNav({
  user,
  profile,
}: {
  user: UserLite | null;
  profile: ProfileLite;
}) {
  const pathname = usePathname();
  const router = useRouter();

  if (!user) {
    const signupActive = pathname === "/signup";
    return (
      <header className="bg-background/70 border-border/70 sticky top-0 z-20 flex items-center justify-between gap-2 border-b px-4 py-3 backdrop-blur-md">
        <Link
          href="/"
          className="text-primary shrink-0 font-semibold tracking-tight"
        >
          Stickr
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <HeaderNavLink href="/login">Iniciar sesión</HeaderNavLink>
          <Link href="/signup" aria-current={signupActive ? "page" : undefined}>
            <Button
              className={cn(
                "rounded-full",
                signupActive && "ring-primary/35 ring-2",
              )}
            >
              Registrarse
            </Button>
          </Link>
        </div>
      </header>
    );
  }

  const label = profile?.username ?? user.email?.split("@")[0] ?? "Usuario";
  const initial = label.slice(0, 2).toUpperCase();

  return (
    <header className="bg-background/70 border-border/70 sticky top-0 z-20 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link
          href="/album"
          className="text-primary font-semibold tracking-tight"
        >
          Stickr
        </Link>
        <nav
          aria-label="Principal"
          className="relative z-30 hidden md:flex md:gap-1"
        >
          <HeaderNavLink href="/album">Álbum</HeaderNavLink>
          <HeaderNavLink href="/discover">Intercambio</HeaderNavLink>
          <HeaderNavLink href="/marketplace">Compra/venta</HeaderNavLink>
          <HeaderNavLink href="/profile">Perfil</HeaderNavLink>
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger className="border-border/70 bg-background/70 flex h-8 items-center gap-2 rounded-full border px-2 text-sm font-medium outline-none">
            <Avatar className="size-8">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt="" />
              ) : null}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[10rem] truncate sm:inline">
              {label}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                router.push("/profile");
              }}
            >
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                router.push("/album/settings");
              }}
            >
              Configuración
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                router.push("/privacy");
              }}
            >
              Privacidad
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                void signOutAction();
              }}
            >
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
