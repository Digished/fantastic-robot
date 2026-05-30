// Product-level feature flags.
//
// When `BIRTHDAY_ONLY` is true, the app is streamlined to personal birthdays:
// the "for someone else" creation flow and all non-birthday event types are
// hidden from the UI (the code and routes stay intact). Flip to `false` to
// restore the full multi-event product.
export const BIRTHDAY_ONLY = true;
