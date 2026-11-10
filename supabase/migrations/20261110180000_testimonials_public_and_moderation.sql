-- Testimonials: public showcase + admin moderation.
-- Run this in the Supabase SQL editor.
--
-- Details are stored by components/student-testimonial-dialog.tsx, which inserts
-- straight into public.student_testimonials with status 'pending'.
--
-- These are `security definer` so they work regardless of the RLS policies on
-- student_testimonials, the same way the other RPCs in this project behave.

-- ---------------------------------------------------------------------------
-- Public: approved testimonials only.
-- ---------------------------------------------------------------------------
create or replace function public.list_approved_testimonials()
returns table (
  id uuid,
  testimonial text,
  signature_strokes jsonb,
  created_at timestamptz,
  student_name text,
  index_number text,
  institute text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.id,
    t.testimonial,
    t.signature_strokes,
    t.created_at,
    s.name,
    s.index_number,
    s.institute
  from public.student_testimonials t
  join public.students s on s.id = t.student_id
  where t.status = 'approved'
  order by t.created_at desc
  limit 200;
$$;

revoke all on function public.list_approved_testimonials() from public;
grant execute on function public.list_approved_testimonials() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Moderation: every testimonial, pending first.
--
-- Only asks for a signed-in user, matching the /worksheets/add guard.
-- To restrict this to public.admins instead, swap the check below for:
--   if not exists (select 1 from public.admins where user_id = auth.uid()) then
--     raise exception 'You are not an admin.';
--   end if;
-- ---------------------------------------------------------------------------
create or replace function public.list_testimonials()
returns table (
  id uuid,
  testimonial text,
  signature_strokes jsonb,
  status text,
  created_at timestamptz,
  student_name text,
  index_number text,
  institute text,
  school text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to review testimonials.';
  end if;

  return query
    select
      t.id,
      t.testimonial,
      t.signature_strokes,
      t.status,
      t.created_at,
      s.name,
      s.index_number,
      s.institute,
      s.school
    from public.student_testimonials t
    join public.students s on s.id = t.student_id
    order by
      case t.status when 'pending' then 0 else 1 end,
      t.created_at desc;
end;
$$;

revoke all on function public.list_testimonials() from public;
grant execute on function public.list_testimonials() to authenticated;

-- ---------------------------------------------------------------------------
-- Moderation: move one testimonial between pending / approved / rejected.
-- ---------------------------------------------------------------------------
create or replace function public.set_testimonial_status(
  p_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned text := lower(trim(coalesce(p_status, '')));
  rec public.student_testimonials%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in to moderate testimonials.';
  end if;

  if cleaned not in ('pending', 'approved', 'rejected') then
    raise exception 'Unknown status: %', p_status;
  end if;

  update public.student_testimonials
  set status = cleaned
  where id = p_id
  returning * into rec;

  if rec.id is null then
    raise exception 'That testimonial no longer exists.';
  end if;

  return jsonb_build_object('id', rec.id, 'status', rec.status);
end;
$$;

revoke all on function public.set_testimonial_status(uuid, text) from public;
grant execute on function public.set_testimonial_status(uuid, text) to authenticated;
