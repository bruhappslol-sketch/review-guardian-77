import { Link } from "@tanstack/react-router";
import { BookOpen, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/80">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3 text-foreground">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground shadow-sm">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold leading-tight">Hodnotenie učiteľov</span>
            <span className="hidden text-xs text-muted-foreground sm:block">Keď učitelia hodnotia teba, hodnoť úprimne aj ty.</span>
          </span>
        </Link>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/recenzia" search={{ teacher: "" }}>
            <PenLine aria-hidden="true" />
            <span className="hidden sm:inline">Napíš recenziu</span>
            <span className="sm:hidden">Recenzia</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}