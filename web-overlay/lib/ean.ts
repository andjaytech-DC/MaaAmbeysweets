/** Generate a valid EAN-13 (prefix 890 = India-style, but any internal range works for in-store labels). */
export function generateEan13(): string {
  const body = "890" + Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
  const sum = body.split("").reduce((s, d, i) => s + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return body + ((10 - (sum % 10)) % 10);
}
