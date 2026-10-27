'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { saveEntry, searchStudents } from './actions'

type Student = { id: string; name: string; index_number: string | null; institute: string }

const INSTITUTES = ['maxicon', 'sigma', 'sasik', 'farade', 'online']

const field =
  'h-10 rounded-full border border-[var(--color-gray-300)] bg-[var(--color-gray-background)] px-4 text-sm text-[var(--color-gray-1200)] outline-none focus:border-[var(--color-gray-600)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]'
const label = 'text-sm text-gray-900'

export default function EntryForm() {
  const [worksheet, setWorksheet] = useState('')
  const [query, setQuery] = useState('')
  const [marks, setMarks] = useState('')
  const [student, setStudent] = useState<Student | null>(null)
  const [results, setResults] = useState<Student[]>([])
  const [active, setActive] = useState(0)
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [pending, startTransition] = useTransition()

  // new-student mode: the extra fields expand inside this same form
  const [isNew, setIsNew] = useState(false)
  const [phone, setPhone] = useState('')
  const [institute, setInstitute] = useState('')
  const [indexNumber, setIndexNumber] = useState('')

  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const marksRef = useRef<HTMLInputElement>(null)

  const showList = !student && !isNew && query.trim().length >= 2
  const addRowIndex = results.length // the "Add new student" row sits after the results

  const canSubmit =
    worksheet.trim() !== '' &&
    marks !== '' &&
    (student !== null ||
      (isNew && query.trim().length >= 2 && phone.trim() !== '' && institute !== ''))

  // debounced autocomplete
  useEffect(() => {
    if (student || isNew || query.trim().length < 2) {
      setResults([])
      return
    }
    let stale = false
    const t = setTimeout(async () => {
      const r = await searchStudents(query)
      if (!stale) {
        setResults(r)
        setActive(0)
      }
    }, 200)
    return () => {
      stale = true
      clearTimeout(t)
    }
  }, [query, student, isNew])

  function pick(s: Student) {
    setStudent(s)
    setQuery(s.name)
    setResults([])
    setIsNew(false)
    marksRef.current?.focus()
  }

  function chooseNew() {
    setStudent(null)
    setIsNew(true)
    setResults([])
    setTimeout(() => phoneRef.current?.focus(), 0)
  }

  function useExistingInstead() {
    setIsNew(false)
    setPhone('')
    setInstitute('')
    setIndexNumber('')
    nameRef.current?.focus()
  }

  function onNameKey(e: React.KeyboardEvent) {
    if (!showList) return
    const total = results.length + 1 // results + add row
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % total) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => (i - 1 + total) % total) }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (active === addRowIndex) chooseNew()
      else if (results[active]) pick(results[active])
    }
    if (e.key === 'Escape') setResults([])
  }

  function resetEntry() {
    // keep the worksheet number so you can enter the next student straight away
    setStudent(null)
    setIsNew(false)
    setQuery('')
    setMarks('')
    setPhone('')
    setInstitute('')
    setIndexNumber('')
    setResults([])
    nameRef.current?.focus()
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const typedName = query.trim()
    startTransition(async () => {
      const res = await saveEntry({
        worksheet: Number(worksheet),
        marks: Number(marks),
        studentId: student?.id,
        newStudent: isNew
          ? { name: typedName, phone, institute, indexNumber }
          : undefined,
      })

      if (!res.ok) {
        setStatus({ ok: false, message: res.message })
        return
      }

      const who = student?.name ?? typedName
      setStatus({
        ok: true,
        message: res.studentCreated
          ? `${who} added to students and ${marks}/10 saved.`
          : res.studentExisted
          ? `${who} was already registered, so I used that record. ${marks}/10 saved.`
          : `${who}: ${marks}/10 saved.`,
      })
      resetEntry()
    })
  }

  return (
    <form onSubmit={submit} className="mx-auto my-auto flex w-full max-w-md flex-col gap-3 p-6">
      <label className={`${label}`}>Worksheet number</label>
      <input
        className={field}
        inputMode="numeric"
        value={worksheet}
        onChange={e => setWorksheet(e.target.value)}
        placeholder="e.g. 4"
      />

      <div className="flex items-center justify-between">
        <label className={label}>{isNew ? 'New student name' : 'Student'}</label>
        {isNew && (
          <button
            type="button"
            onClick={useExistingInstead}
            className="text-xs text-gray-900 underline"
          >
            Search existing instead
          </button>
        )}
      </div>

      <div className="relative">
        <input
          ref={nameRef}
          className={`${field} w-full`}
          value={query}
          onChange={e => { setQuery(e.target.value); setStudent(null) }}
          onKeyDown={onNameKey}
          placeholder={isNew ? 'Full name' : 'Type a name or index number'}
          autoComplete="off"
        />

        {showList && (
          <ul className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-gray-300 bg-gray-background shadow-shadow-custom)]">
            {results.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); pick(s) }}
                  className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                    i === active ? 'bg-color-gray-100' : ''
                  }`}
                >
                  <span className="text-gray-1200">{s.name}</span>
                  <span className="text-xs text-gray-900">
                    {s.index_number ?? '—'} · {s.institute}
                  </span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); chooseNew() }}
                className={`w-full border-t border-gray-300 px-4 py-2 text-left text-sm text-gray-1200 ${
                  active === addRowIndex ? 'bg-gray-100' : ''
                }`}
              >
                ＋ Add “{query.trim()}” as new student
              </button>
            </li>
          </ul>
        )}
      </div>

      {isNew && (
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-300 p-4">
          <label className={label}>Phone number</label>
          <input
            ref={phoneRef}
            className={field}
            inputMode="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="07X XXX XXXX"
          />

          <label className={label}>Institute</label>
          <select
            className={`${field}`}
            value={institute}
            onChange={e => setInstitute(e.target.value)}
          >
            <option value="" disabled>Select institute</option>
            {INSTITUTES.map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>

          <label className={label}>Index number (optional)</label>
          <input
            className={field}
            value={indexNumber}
            onChange={e => setIndexNumber(e.target.value)}
          />
        </div>
      )}

      <label className={label}>Marks (out of 10)</label>
      <input
        ref={marksRef}
        className={field}
        type="number"
        min={0}
        max={10}
        step={0.5}
        value={marks}
        onChange={e => setMarks(e.target.value)}
        placeholder="0 – 10"
      />

      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="mt-2 h-10 rounded-full bg-gray-1200 text-sm text-gray-background disabled:opacity-40 transition-transform duration-200 ease-out active:scale-[0.97] cursor-pointer"
      >
        {pending ? 'Saving…' : isNew ? 'Add student & save marks' : 'Save marks'}
      </button>

      {status && (
        <p className={`text-sm ${status.ok ? 'text-green-600' : 'text-red-500'}`} role="status">
          {status.message}
        </p>
      )}
    </form>
  )
}