-- Security question protects the celebrant page.
-- The creator sets the question + answer. We store only a SHA-256 hash of the
-- normalised answer (trim + lowercase), never the plaintext.

alter table public.celebrations
  add column if not exists security_question    text,
  add column if not exists security_answer_hash text;
