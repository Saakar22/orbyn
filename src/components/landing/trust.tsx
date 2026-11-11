const ITEMS = [
  {
    title: "Human-in-the-loop approvals",
    body: "Orbyn can draft anything, but issuing an invoice or scheduling a reminder waits for you. Each approval is signed by the server, so it cannot be faked or replayed from the browser.",
  },
  {
    title: "Verified PayPal captures only",
    body: "An invoice turns paid only after PayPal confirms the capture to the server, and each capture is counted once. The assistant cannot mark anything paid on its own.",
  },
  {
    title: "Sandbox-safe demo data",
    body: "Every demo gets its own private workspace. Seeded records are labelled as demo data, and payments run in PayPal's sandbox, so no real money moves.",
  },
];

/**
 * Explanations open on hover and on keyboard focus (each item is focusable). On touch screens they
 * are always open. The text is always in the DOM, so screen readers get it either way.
 */
export function Trust() {
  return (
    <section id="trust" className="trust">
      <div className="grid-12">
        <h2 className="col-span-12 text-[length:var(--step-lead)] text-[var(--ink-soft)] md:col-span-6">
          Three rules the product is built around.
        </h2>
        <ul className="trust-list col-span-12">
          {ITEMS.map((item) => (
            <li key={item.title} tabIndex={0}>
              <h3 className="font-display">{item.title}</h3>
              <div className="trust-body">
                <p>{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
