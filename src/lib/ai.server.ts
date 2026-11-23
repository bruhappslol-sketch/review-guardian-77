import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export async function expandReviewText(body: string, rating: number, teacher: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Chýba kľúč pre umelú inteligenciu.");
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
      return res;
    },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions:
      "Si redaktor školskej nástenky. Prepíš recenziu žiaka na učiteľa podrobnejšie a zrozumiteľnejšie, po slovensky. Zachovaj pôvodný názor, tón a fakty, nič si nevymýšľaj, odstráň vulgarizmy a urážky. Max 1000 znakov. Vráť iba nový text recenzie bez úvodu.",
    messages: [
      { role: "user", content: `Učiteľ: ${teacher}\nHodnotenie: ${rating}/10\nRecenzia:\n${body}` },
    ],
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const text = (await result.text).trim();
  if (!text) throw new Error("Umelá inteligencia nevrátila žiadny text.");
  return text.slice(0, 1000);
}
