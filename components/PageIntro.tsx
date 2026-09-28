export default function PageIntro({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return (
    <header className="page-intro">
      <div><span className="kicker">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div>
      {action ? <div>{action}</div> : null}
    </header>
  );
}
