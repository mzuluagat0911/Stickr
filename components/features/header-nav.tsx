"use client";

import Link from "next/link";

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

type UserLite = {
  id: string;
  email?: string;
};

type ProfileLite = {
  username: string;
  avatar_url: string | null;
} | null;

export function HeaderNav({
  user,
  profile,
}: {
  user: UserLite | null;
  profile: ProfileLite;
}) {
  if (!user) {
    return (
      <header className="flex items-center justify-end gap-2 px-4 py-3">
        <ThemeToggle />
        <Button variant="ghost" asChild>
          <Link href="/login">Iniciar sesión</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Registrarse</Link>
        </Button>
      </header>
    );
  }

  const label = profile?.username ?? user.email?.split("@")[0] ?? "Usuario";
  const initial = label.slice(0, 2).toUpperCase();

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-3">
      <Link href="/album" className="font-semibold">
        Stickr
      </Link>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              data-testid="user-menu-trigger"
              className="flex items-center gap-2 rounded-full px-2"
            >
              <Avatar className="size-8">
                {profile?.avatar_url ? (
                  <AvatarImage src={profile.avatar_url} alt="" />
                ) : null}
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[10rem] truncate sm:inline">
                {label}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/profile">Mi perfil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/album/settings">Configuración</Link>
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
