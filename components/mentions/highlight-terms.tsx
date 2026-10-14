import { stripVietnameseDiacritics } from "@/lib/common/strip-vietnamese-diacritics";

function plain(text: string) {
  return stripVietnameseDiacritics(text).toLocaleLowerCase("vi");
}

/** Marks matched terms in the text, ignoring case and diacritics. */
export function HighlightTerms({ text, terms }: { text: string; terms: string[] }) {
  const needles = terms.map(plain).filter(Boolean);
  if (needles.length === 0) return <>{text}</>;

  // Diacritic stripping keeps string length for Vietnamese NFC text, so offsets line up.
  const haystack = plain(text);
  const ranges: [number, number][] = [];
  for (const needle of needles) {
    let from = 0;
    for (let index = haystack.indexOf(needle, from); index !== -1; index = haystack.indexOf(needle, from)) {
      ranges.push([index, index + needle.length]);
      from = index + needle.length;
    }
  }
  if (ranges.length === 0 || haystack.length !== text.length) return <>{text}</>;

  ranges.sort((a, b) => a[0] - b[0]);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start < cursor) continue;
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={start} className="rounded bg-primary/20 px-0.5 text-inherit">
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}
