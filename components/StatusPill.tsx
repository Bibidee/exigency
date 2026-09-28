export default function StatusPill({ value }: { value: string }) {
  const v = value.toUpperCase();
  const tone = /CONFIRMED|FINAL|ACTIVE|ISSUED|OPEN/.test(v) ? "good" : /PENDING|ASSESS|WAIT|ELIGIBLE/.test(v) ? "warn" : /DENIED|EXPIRED|CONFLICT|NOT_CONFIRMED|NO_AUTHORITY/.test(v) ? "bad" : "neutral";
  return <span className={`status-pill ${tone}`}>{value.replaceAll("_", " ")}</span>;
}
