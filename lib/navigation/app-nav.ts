import {
  BookOpen,
  Compass,
  MessageCircle,
  ShoppingBag,
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
  { href: "/discover", label: "Descubrir", Icon: Compass },
  { href: "/messages", label: "Mensajes", Icon: MessageCircle },
  { href: "/marketplace", label: "Mercado", Icon: ShoppingBag },
  { href: "/profile", label: "Mi perfil", Icon: User },
];

export function isNavActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/") return false;
  return pathname.startsWith(`${href}/`);
}
