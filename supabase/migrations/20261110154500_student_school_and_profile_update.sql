-- Run this in the Supabase SQL editor if it has not been applied yet.
-- Adds school to students and a public RPC so a student can update
-- name, phone, and school after looking themselves up by index number.

alter table public.students
  add column if not exists school text;

alter table public.students
  drop constraint if exists students_school_len;

alter table public.students
  add constraint students_school_len
  check (school is null or char_length(trim(school)) between 2 and 120);

create index if not exists students_index_number_idx
  on public.students (index_number);

create or replace function public.update_student_details(
  p_index text,
  p_name text,
  p_phone text,
  p_school text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned_index text := upper(trim(p_index));
  cleaned_name text := trim(p_name);
  cleaned_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  cleaned_school text := trim(p_school);
  rec public.students%rowtype;
begin
  if cleaned_index is null or char_length(cleaned_index) < 3 then
    raise exception 'Enter a valid index number.';
  end if;
  if cleaned_name is null or char_length(cleaned_name) < 2 then
    raise exception 'Enter the full name.';
  end if;
  if cleaned_phone !~ '^07[0-9]{8}$' then
    raise exception 'Enter a valid mobile number, like 0771234567.';
  end if;
  if cleaned_school is null or char_length(cleaned_school) < 2 then
    raise exception 'Enter the school name.';
  end if;

  update public.students
  set
    name = cleaned_name,
    phone_number = cleaned_phone,
    school = cleaned_school
  where upper(index_number) = cleaned_index
  returning * into rec;

  if rec.id is null then
    raise exception 'No student found with that index number.';
  end if;

  return jsonb_build_object(
    'index_number', rec.index_number,
    'name', rec.name,
    'phone_number', rec.phone_number,
    'school', rec.school
  );
end;
$$;

revoke all on function public.update_student_details(text, text, text, text) from public;
grant execute on function public.update_student_details(text, text, text, text) to anon, authenticated;
