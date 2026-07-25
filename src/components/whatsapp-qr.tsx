import { useEffect, useState } from "react";
import { toString } from "qrcode";

export function WhatsAppQr({ link }: { link: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    toString(link, { type: "svg", margin: 2, width: 256, color: { dark: "#000", light: "#fff" } })
      .then((s) => {
        if (!cancelled) setSvg(s);
      })
      .catch(() => setSvg(null));
    return () => {
      cancelled = true;
    };
  }, [link]);

  if (!svg) return null;
  return (
    <div
      className="rounded-xl border bg-white p-4 inline-block"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
