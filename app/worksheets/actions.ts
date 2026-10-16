'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

const INSTITUTES = ['maxicon', 'sigma', 'sasik', 'farade', 'online']

export async function searchStudents(q: string) {
  const term = q.trim()
  if (term.length < 2) return []

  const supabase = createClient(await cookies())
  const { data, error } = await supabase.rpc('search_students', { q: term })
  if (error) console.error('search_students:', error.message)
  return data ?? []
}

type NewStudent = {
  name: string
  phone: string
  institute: string
  indexNumber: string
}

export async function saveEntry(input: {
  worksheet: number
  marks: number
  studentId?: string
  newStudent?: NewStudent
}): Promise<{ ok: boolean; message: string; studentCreated?: boolean; studentExisted?: boolean }> {
  const { worksheet, marks, studentId, newStudent } = input

  if (!Number.isInteger(worksheet) || worksheet < 1)
    return { ok: false, message: 'Enter a valid worksheet number.' }
  if (!Number.isFinite(marks) || marks < 0 || marks > 10)
    return { ok: false, message: 'Marks must be between 0 and 10.' }

  if (!studentId) {
    if (!newStudent) return { ok: false, message: 'Pick a student or add a new one.' }
    if (newStudent.name.trim().length < 2)
      return { ok: false, message: 'Enter the student’s full name.' }
    if (newStudent.phone.replace(/\D/g, '').length < 7)
      return { ok: false, message: 'Enter a valid phone number.' }
    if (!INSTITUTES.includes(newStudent.institute))
      return { ok: false, message: 'Pick an institute.' }
  }

  const supabase = createClient(await cookies())

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'You are signed out. Log in again.' }

  const { data, error } = await supabase.rpc('record_submission', {
    p_worksheet: worksheet,
    p_marks: marks,
    p_student_id: studentId ?? null,
    p_name: newStudent?.name.trim() ?? null,
    p_phone: newStudent?.phone.trim() ?? null,
    p_institute: newStudent?.institute ?? null,
    p_index: newStudent?.indexNumber.trim() || null,
  })
  if (error) return { ok: false, message: error.message }

  const r = data as { student_created: boolean; student_existed: boolean }

  revalidatePath('/worksheets')
  if (r.student_created) revalidatePath('/students')

  return {
    ok: true,
    message: 'Saved.',
    studentCreated: r.student_created,
    studentExisted: r.student_existed,
  }
}