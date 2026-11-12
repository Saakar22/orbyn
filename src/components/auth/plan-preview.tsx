import { Check } from "lucide-react";

/** Decorative loop on the auth panel: a request becomes a plan, is approved, and is verified as paid. */
export function PlanPreview() {
  return (
    <div aria-hidden>
      <p className="plan-preview-prompt">Invoice Alex $500 for website development</p>
      <div className="plan-preview">
        <div className="plan-preview-head">
          <span>Invoice INV-0028</span>
          <span className="plan-preview-state">
            <span>Draft</span>
            <span>
              <Check className="size-3" strokeWidth={3} />
              Paid, verified by PayPal
            </span>
          </span>
        </div>
        <dl>
          <dt>Client</dt>
          <dd>Alex Rivera</dd>
          <dt>For</dt>
          <dd>Website development</dd>
          <dt>Amount</dt>
          <dd>$500.00</dd>
          <dt>Due</dt>
          <dd>In 14 days</dd>
        </dl>
        <div className="plan-preview-foot">
          <span className="text-[#6d6885]">Nothing is sent until you approve.</span>
          <span className="plan-preview-approve">Approve</span>
        </div>
      </div>
    </div>
  );
}
