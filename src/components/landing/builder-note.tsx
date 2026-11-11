// PLACEHOLDER COPY: the quote and both names below are stand-ins. Replace them with your own words.
const QUOTE =
  "We kept watching freelancers lose an afternoon a week to invoices, then lose sleep over who had paid. We wanted an assistant that does the typing and the chasing, and never touches money without a person saying yes.";

const BUILDERS = [
  { name: "First Last", role: "Role, Orbyn" },
  { name: "First Last", role: "Role, Orbyn" },
];

export function BuilderNote() {
  return (
    <section id="team" className="note">
      <div className="grid-12">
        <h2 className="col-span-12 text-[length:var(--step-lead)] text-[var(--ink-soft)] md:col-span-3">Why we built it</h2>
        <figure className="col-span-12 mt-6 md:col-span-9 md:mt-0">
          <blockquote className="font-display">{QUOTE}</blockquote>
          <figcaption>
            {BUILDERS.map((builder, i) => (
              <div key={i}>
                <span className="font-medium">{builder.name}</span>
                <span className="text-[var(--ink-soft)]">{builder.role}</span>
              </div>
            ))}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
