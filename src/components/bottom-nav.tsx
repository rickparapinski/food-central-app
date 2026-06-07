"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBasket, CalendarDays, ShoppingCart, BarChart2, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/pantry", label: "Pantry", icon: ShoppingBasket },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/grocery", label: "Grocery", icon: ShoppingCart },
  { href: "/tracker", label: "Tracker", icon: BarChart2 },
  { href: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-3 text-xs transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={22} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
