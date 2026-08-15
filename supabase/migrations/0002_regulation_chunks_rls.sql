-- Enable Row Level Security on public.regulation_chunks (see security review A01).
-- Read access stays public; writes require the service-role key (which bypasses RLS).
alter table public.regulation_chunks enable row level security;

create policy "regulation_chunks_read" on public.regulation_chunks
  for select using (true);

revoke insert, update, delete on public.regulation_chunks from anon, authenticated;
