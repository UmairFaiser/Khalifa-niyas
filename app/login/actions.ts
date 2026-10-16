'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(
  _prev: { message: string } | null,
  formData: FormData
) {
  const supabase = createClient(await cookies())

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  })
  if (error) return { message: error.message }

  redirect('/worksheets/add')
}