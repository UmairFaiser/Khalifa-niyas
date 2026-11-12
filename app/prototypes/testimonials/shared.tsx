import { TestimonialSignature } from "@/components/testimonial-signature";

export type Row = {
  id: string;
  testimonial: string;
  signature_strokes: unknown;
  created_at: string;
  student_name: string;
  index_number: string | null;
  institute: string;
};

export const INSTITUTE_LABEL: Record<string, string> = {
  maxicon: "Maxicon",
  sigma: "Sigma",
  sasik: "Sasik",
  farade: "Farade",
  online: "Online",
};

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function meta(item: Row, withDate = true) {
  return [
    item.index_number,
    INSTITUTE_LABEL[item.institute] ?? item.institute,
    withDate ? formatDate(item.created_at) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// Renders the real handwritten signature when strokes exist. Sample rows
// (used only to pad the prototype) have no strokes, so they render nothing.
export function Sig({
  item,
  className = "h-11 w-auto shrink-0",
}: {
  item: Row;
  className?: string;
}) {
  if (!item.signature_strokes) return null;
  return (
    <TestimonialSignature
      strokes={item.signature_strokes}
      signer={item.student_name}
      className={className}
    />
  );
}

// Prototype-only filler so every variant is judged with a realistic amount of
// content, even while the real table has only a handful of approved rows.
export const SAMPLES: Row[] = [
  {
    id: "sample-1",
    student_name: "Kavindu Perera",
    index_number: "M-0412",
    institute: "maxicon",
    created_at: "2026-09-14T08:00:00Z",
    signature_strokes: null,
    testimonial:
      "Logic gates used to be a blur of symbols for me. Sir drew every truth table on the board until I could do them with my eyes closed. I scored 92 on the mock paper.",
  },
  {
    id: "sample-2",
    student_name: "Nethmi Fernando",
    index_number: "S-0187",
    institute: "sigma",
    created_at: "2026-09-02T08:00:00Z",
    signature_strokes: null,
    testimonial:
      "The weekly worksheets are what changed things. Short, hard, and the marking comes back fast, so I always knew exactly what to fix before the next class.",
  },
  {
    id: "sample-3",
    student_name: "Ishara Jayasinghe",
    index_number: "SK-0309",
    institute: "sasik",
    created_at: "2026-08-21T08:00:00Z",
    signature_strokes: null,
    testimonial:
      "Networking layers finally made sense when we did the Bimal and Chamal photo-sharing scenario. I still use that story to explain TCP/IP to my friends.",
  },
  {
    id: "sample-4",
    student_name: "Dilmi Wickramasinghe",
    index_number: "F-0021",
    institute: "farade",
    created_at: "2026-08-09T08:00:00Z",
    signature_strokes: null,
    testimonial:
      "Best ICT class I have attended. Calm, clear and never rushed.",
  },
  {
    id: "sample-5",
    student_name: "Sandun Rathnayake",
    index_number: "O-0654",
    institute: "online",
    created_at: "2026-07-30T08:00:00Z",
    signature_strokes: null,
    testimonial:
      "I joined online from Kandy and never felt left out. Recordings, worksheets and doubt sessions were all there. Number systems and Boolean algebra are now my strongest chapters, and I went from a C to an A in two terms.",
  },
  {
    id: "sample-6",
    student_name: "Tharushi Silva",
    index_number: "M-0377",
    institute: "maxicon",
    created_at: "2026-07-18T08:00:00Z",
    signature_strokes: null,
    testimonial:
      "Sir explains why an answer is right, not just what it is. That is why I stopped memorising and started understanding.",
  },
  {
    id: "sample-7",
    student_name: "Ravindu Gunasekara",
    index_number: "S-0245",
    institute: "sigma",
    created_at: "2026-07-05T08:00:00Z",
    signature_strokes: null,
    testimonial:
      "The leaderboard made me compete with myself every week. I wanted my name in the top three, so I actually finished every worksheet on time.",
  },
  {
    id: "sample-8",
    student_name: "Aloka Dissanayake",
    index_number: "SK-0112",
    institute: "sasik",
    created_at: "2026-06-22T08:00:00Z",
    signature_strokes: null,
    testimonial:
      "Patient with every question, even the silly ones. My parents noticed the difference in my confidence before my results even came.",
  },
];

export function withSamples(real: Row[]): Row[] {
  if (real.length >= 8) return real;
  return [...real, ...SAMPLES].slice(0, 12);
}

// Shared page chrome: kept identical across variants so only the testimonial
// presentation differs.
export function Header({ align = "center" }: { align?: "center" | "left" }) {
  return (
    <header className={align === "center" ? "text-center" : "text-left"}>
      <p className="text-xs font-mono font-semibold uppercase tracking-tight text-gray-1000">
        Testimonials
      </p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight text-gray-1200 text-wrap-balance sm:text-4xl">
        What students say
      </h1>
      <p
        className={`mt-3 max-w-xl text-sm leading-6 text-text-paragraph text-wrap-pretty ${
          align === "center" ? "mx-auto" : ""
        }`}
      >
        See what students say about our classes.
      </p>
    </header>
  );
}