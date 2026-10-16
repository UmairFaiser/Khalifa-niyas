import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import EntryForm from '../EntryForm'

export default async function AddMarksPage() {
  const supabase = createClient(await cookies())

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <EntryForm />
}