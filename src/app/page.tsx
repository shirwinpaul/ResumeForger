import Link from "next/link";
import { ForgeHero } from "@/components/illustrations/ForgeHero";
import { TemplateGallery } from "@/components/landing/TemplateGallery";

const STEPS = [
  {
    icon: "💬",
    title: "Answer friendly questions",
    text: "Tell us about your studies, projects and activities in plain sentences — or import an existing resume.",
  },
  {
    icon: "✨",
    title: "Polish honestly",
    text: "AI improves your wording without inventing anything. You accept, edit or reject every suggestion.",
  },
  {
    icon: "📄",
    title: "Export & apply",
    text: "Check your ATS score, then download a real text-based PDF or Word file.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-2 md:py-20">
        <div>
          <p className="mb-3 inline-block rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary-strong">
            Free · For students · Private by design
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Forge a resume that opens doors <span aria-hidden="true">🔥📄</span>
          </h1>
          <p className="mt-4 text-lg text-muted">
            Build a clean, ATS-friendly resume through friendly questions and a live preview. Tailor it
            to a job or university programme in minutes — without ever inventing achievements.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/start?mode=guided" className="btn btn-primary text-base px-5 py-3">
              Build my resume
            </Link>
            <Link href="/start?mode=import" className="btn btn-secondary text-base px-5 py-3">
              Import my resume
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">
            No sign-up. Works without AI too — the builder, preview and exports are always free.
          </p>
        </div>
        <ForgeHero className="mx-auto w-full max-w-md" />
      </section>

      <section aria-labelledby="how-heading" className="bg-surface border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="how-heading" className="text-2xl font-bold text-center">
            How it works
          </h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card p-6">
                <div className="text-3xl" aria-hidden="true">
                  {s.icon}
                </div>
                <h3 className="mt-3 font-bold">
                  {i + 1}. {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="templates-heading" className="mx-auto w-full max-w-6xl px-4 py-14">
        <h2 id="templates-heading" className="text-2xl font-bold text-center">
          Templates
        </h2>
        <p className="mt-2 text-center text-muted">
          Shown with our fictional sample student. Switch templates anytime.
        </p>
        <TemplateGallery />
      </section>

      <section aria-labelledby="promise-heading" className="bg-primary-soft">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <h2 id="promise-heading" className="text-2xl font-bold text-center text-primary-strong">
            Our honesty promise
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            <li className="card p-5">
              <h3 className="font-bold">🚫 No invented achievements</h3>
              <p className="mt-1 text-sm text-muted">
                The AI only improves your wording. Where a number would help, it adds a placeholder
                like <span className="placeholder-chip">[number of students]</span> for you to fill — and
                our honesty check flags any new detail you didn&apos;t write.
              </p>
            </li>
            <li className="card p-5">
              <h3 className="font-bold">🔒 Private by design</h3>
              <p className="mt-1 text-sm text-muted">
                Your resumes are saved only in your browser. Your phone, email and address are removed
                before anything is sent to the AI, and nothing is stored on our server.
              </p>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
