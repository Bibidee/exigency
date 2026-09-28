export default function Panel({ title, eyebrow, children, className = "" }: { title?: string; eyebrow?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || eyebrow) && <header className="panel-head">{eyebrow && <span>{eyebrow}</span>}{title && <h2>{title}</h2>}</header>}
      {children}
    </section>
  );
}
