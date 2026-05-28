"use client";

export type AddressDraft = {
  label: string;
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  phone: string;
};

export const BLANK_ADDRESS: AddressDraft = {
  label: "",
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  country: "Nigeria",
  phone: "",
};

export function AddressFormFields({
  draft,
  onChange,
}: {
  draft: AddressDraft;
  onChange: (updates: Partial<AddressDraft>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="label">
          Label{" "}
          <span className="text-ink/40 font-normal text-xs">(optional)</span>
        </label>
        <input
          className="field"
          value={draft.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Home, Office…"
          maxLength={40}
        />
      </div>
      <div className="space-y-1.5">
        <label className="label">Full name</label>
        <input
          className="field"
          value={draft.fullName}
          onChange={(e) => onChange({ fullName: e.target.value })}
          placeholder="Recipient's full name"
          maxLength={80}
        />
      </div>
      <div className="space-y-1.5">
        <label className="label">Street address</label>
        <input
          className="field"
          value={draft.line1}
          onChange={(e) => onChange({ line1: e.target.value })}
          placeholder="House number and street name"
          maxLength={100}
        />
      </div>
      <div className="space-y-1.5">
        <label className="label">
          Apt, floor, etc.{" "}
          <span className="text-ink/40 font-normal text-xs">(optional)</span>
        </label>
        <input
          className="field"
          value={draft.line2}
          onChange={(e) => onChange({ line2: e.target.value })}
          placeholder=""
          maxLength={100}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="label">City</label>
          <input
            className="field"
            value={draft.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="Lagos"
            maxLength={60}
          />
        </div>
        <div className="space-y-1.5">
          <label className="label">State</label>
          <input
            className="field"
            value={draft.state}
            onChange={(e) => onChange({ state: e.target.value })}
            placeholder="Lagos State"
            maxLength={60}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="label">Country</label>
        <input
          className="field"
          value={draft.country}
          onChange={(e) => onChange({ country: e.target.value })}
          maxLength={60}
        />
      </div>
      <div className="space-y-1.5">
        <label className="label">
          Phone{" "}
          <span className="text-ink/40 font-normal text-xs">(optional)</span>
        </label>
        <input
          className="field"
          type="tel"
          value={draft.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="+234 800 000 0000"
          maxLength={24}
        />
      </div>
    </div>
  );
}
