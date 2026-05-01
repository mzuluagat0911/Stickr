import {
  Banknote,
  BookOpen,
  Handshake,
  MessageCircle,
  User,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/album", label: "Álbum", Icon: BookOpen },
  { href: "/discover", label: "Intercambio", Icon: Handshake },
  { href: "/messages", label: "Mensajes", Icon: MessageCircle },
  /** `\u200b` permite partir la etiqueta en bottom nav sin truncar. */
  { href: "/marketplace", label: "Compra/\u200bventa", Icon: Banknote },
  { href: "/profile", label: "Mi perfil", Icon: User },
];

export function isNavActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/") return false;
  return pathname.startsWith(`${href}/`);
}
