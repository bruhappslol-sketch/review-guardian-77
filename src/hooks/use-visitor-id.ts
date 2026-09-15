import { useEffect, useState } from "react";

/**
 * Stabilné ID návštevníka v localStorage — na rozlíšenie lajkov per zariadenie.
 * Hydratácia bezpečná: hodnota sa použije až po pripojení komponentu.
 */
export function useVisitorId() {
  const [visitorId, setVisitorId] = useState<string | null>(null);

  useEffect(() => {
    const KEY = "nastenka-visitor-id";
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(KEY, id);
    }
    setVisitorId(id);
  }, []);

  return visitorId;
}
