-- Fix: the public pages break while an admin is signed in.
--
-- The students / student_testimonials row level security policies were only
-- granted to the `anon` role. As soon as a session exists the browser request
-- runs as `authenticated`, so every direct table query came back empty even
-- though the rows are there:
--   * index lookup + post-save fetch on /details
--   * the student list on /students
--   * the testimonial insert from the dialog
-- (everything else in the app uses security definer RPCs, which ignore RLS.)
--
-- RLS policies are OR-ed together, so these add the same public access the
-- `anon` role already has to `authenticated`. The public flow then behaves
-- identically whether or not someone is logged in. No existing policy is
-- touched or removed.
--
-- Run this in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- students: read (index lookup, /students list) + register (/)
-- ---------------------------------------------------------------------------
drop policy if exists students_authenticated_select on public.students;
create policy students_authenticated_select
  on public.students
  for select
  to authenticated
  using (true);

drop policy if exists students_authenticated_insert on public.students;
create policy students_authenticated_insert
  on public.students
  for insert
  to authenticated
  with check (true);

grant select, insert on public.students to authenticated;

-- ---------------------------------------------------------------------------
-- student_testimonials: public submission from the dialog.
-- Guarded so this file still runs if the testimonials migration has not been
-- applied yet.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.student_testimonials') is not null then
    execute 'drop policy if exists testimonials_authenticated_insert on public.student_testimonials';
    execute 'create policy testimonials_authenticated_insert on public.student_testimonials for insert to authenticated with check (status = ''pending'')';
    execute 'grant insert on public.student_testimonials to authenticated';
  end if;
end
$$;
