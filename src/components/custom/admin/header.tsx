import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Package2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet } from "@/components/ui/sheet";

const Header = () => {
  return (
    <header className="sticky top-0 z-30 flex justify-between h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Link
        href="/admin/dashboard"
        className="flex items-center gap-2 text-lg font-semibold md:text-base"
      >
        <Package2 className="h-6 w-6" />
        <span className="sr-only">Pleasure Cooling Care admin</span>
      </Link>
      <Sheet>
        <nav className="min-w-0 gap-4 text-sm font-medium flex flex-row items-center overflow-x-auto whitespace-nowrap md:gap-5 lg:gap-6">
          <Link
            href="/admin/dashboard"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/bookings"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Bookings
          </Link>
          <Link
            href="/admin/services"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Services
          </Link>
          <Link
            href="/admin/service-areas"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Areas
          </Link>
          <Link
            href="/admin/technicians"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Technicians
          </Link>
          <Link
            href="/admin/finance"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Finance
          </Link>
          <Link
            href="/admin/notifications"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Messages
          </Link>
        </nav>
      </Sheet>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
          >
            <Image
              src="/moin.png"
              width={36}
              height={36}
              alt="Avatar"
              className="overflow-hidden rounded-full"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default Header;
