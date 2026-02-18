"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Menu,
  X,
  UserCircle2,
  Dna,
  Fingerprint,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/useCartStore";
import { useUserStore } from "@/store/useUserStore";
import { createClientComponentClient } from "@/lib/supabase-client";

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/shop" },
  { name: "About Us", href: "/about" },
  { name: "Research", href: "/research" },
  { name: "FAQ", href: "/faq" },
];

export function Navbar() {
  const router = useRouter();
  const { user, clearUser } = useUserStore((state) => state);

  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { getCartCount, setIsCartOpen } = useCartStore();
  const cartCount = getCartCount();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await createClientComponentClient().auth.signOut();
    clearUser();
    router.refresh();
    router.push("/");
  };

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-300 px-4 md:px-10 pt-6",
          isScrolled ? "pt-2" : "pt-6",
        )}
      >
        <div
          className={cn(
            "max-w-7xl mx-auto rounded-full transition-all duration-300 border border-white/20",
            isScrolled
              ? "bg-white/80 backdrop-blur-md shadow-lg py-2 px-6"
              : "bg-white py-4 px-8 shadow-md",
          )}
        >
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-accent rounded-xl flex items-center justify-center group-hover:rotate-6 transition-transform">
                <img src="/logo.png" alt="Logo" className="h-8 w-auto m-2" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                meta<span className="text-accent">peptides</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-semibold transition-colors relative py-1 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-accent after:transition-all hover:after:w-full",
                    pathname === link.href
                      ? "text-accent after:w-full"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 md:gap-3">
              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="group relative p-2 hover:bg-accent/10 rounded-full transition-colors"
              >
                <ShoppingCart className="w-5 h-5 text-foreground" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Auth Button (Login / Profile) */}
              {user?.email ? (
                <button
                  onClick={handleLogout}
                  className={cn(
                    "group flex items-center gap-2 p-2 md:pl-2 md:pr-4 rounded-full transition-all duration-300",
                    "hover:bg-red-500 hover:text-white text-red-500 bg-red-500/10",
                  )}
                >
                  <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  <span className="hidden md:block text-sm font-bold">
                    Logout
                  </span>
                </button>
              ) : (
                // Jika BELUM login, arahkan ke Auth/Login
                <Link href="/auth">
                  <button
                    className={cn(
                      "group flex items-center gap-2 p-2 md:pl-2 md:pr-4 rounded-full transition-all duration-300",
                      pathname === "/auth"
                        ? "bg-accent/20 text-accent"
                        : "hover:bg-accent/10 text-foreground",
                    )}
                  >
                    <Fingerprint className="w-5 h-5" />
                    <span className="hidden md:block text-sm font-bold">
                      Login
                    </span>
                  </button>
                </Link>
              )}

              <Link href="/contact" className="hidden lg:block">
                <Button className="rounded-full px-6 bg-foreground text-background hover:bg-foreground/90 transition-all active:scale-95">
                  Contact Us
                </Button>
              </Link>

              {/* Mobile Toggle Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full hover:bg-accent/10"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-foreground" />
                ) : (
                  <Menu className="w-6 h-6 text-foreground" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        <div
          className={cn(
            "absolute top-full left-4 right-4 mt-4 bg-white rounded-3xl shadow-xl border border-muted p-6 flex flex-col gap-4 transition-all duration-300 md:hidden origin-top",
            isMobileMenuOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none",
          )}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-lg font-medium p-3 rounded-2xl transition-colors",
                pathname === link.href
                  ? "bg-accent/10 text-accent"
                  : "text-foreground hover:bg-muted",
              )}
            >
              {link.name}
            </Link>
          ))}
          <Link
            href="/auth"
            className={cn(
              "text-lg font-medium p-3 rounded-2xl transition-colors flex items-center gap-3",
              pathname === "/auth"
                ? "bg-accent/10 text-accent"
                : "text-foreground hover:bg-muted",
            )}
          >
            <UserCircle2 className="w-6 h-6" />
            Researcher Login
          </Link>
          <hr className="border-muted my-2" />
          <Link href="/contact" className="w-full">
            <Button className="w-full rounded-2xl py-6 bg-foreground text-background text-lg">
              Contact Us
            </Button>
          </Link>
        </div>
      </nav>

      {/* Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
