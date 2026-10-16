'use client'

import { useActionState } from 'react'
import { login } from './actions'

const field =
  'h-10 rounded-full border border-[var(--color-gray-300)] bg-[var(--color-gray-background)] px-4 text-sm text-[var(--color-gray-1200)] outline-none focus:border-[var(--color-gray-600)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null)

  return (
    <form action={action} className="mx-auto flex w-full max-w-sm flex-col gap-3 p-6">
      <h1 className="text-lg text-[var(--color-gray-1200)]">Admin login</h1>
      <input className={field} name="email" type="email" placeholder="Email" required />
      <input className={field} name="password" type="password" placeholder="Password" required />
      <button
        disabled={pending}
        className="mt-2 h-10 rounded-full bg-[var(--color-gray-1200)] text-sm text-[var(--color-gray-background)] disabled:opacity-40"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
      {state?.message && <p className="text-sm text-red-500">{state.message}</p>}
    </form>
  )
}