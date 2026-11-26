import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { TosContent } from "@/components/tos-content";

export const Route = createFileRoute("/podmienky")({
  head: () => ({
    meta: [
      { title: "Terms of Service (ToS) | Školská nástenka" },
      { name: "description", content: "Podmienky používania Školskej nástenky na hodnotenie učiteľov." },
      { property: "og:title", content: "Terms of Service | Školská nástenka" },
      { property: "og:description", content: "Podmienky, s ktorými súhlasíš podpisom pri prvej návšteve." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background paper-dots">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-4xl font-semibold">Terms of Service (ToS)</h1>
        <div className="cozy-card p-6"><TosContent /></div>
      </main>
    </div>
  ),
});
