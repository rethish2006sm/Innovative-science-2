import { useState } from 'react'
import { Mail, MapPin, PhoneCall, Send } from 'lucide-react'
import { apiRequest } from '../api'

const Contactpage = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)

  const submitForm = async (event) => {
    event.preventDefault()
    setIsSending(true)
    setStatus('')
    setError('')

    try {
      const data = await apiRequest('/api/contact', {
        method: 'POST',
        body: JSON.stringify(form),
      })

      setStatus(data.message || 'Your message was sent successfully.')
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ffffff_50%,#f0fdf4_100%)] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            <Mail className="h-3.5 w-3.5" />
            Contact the team
          </div>
          <h1 className="mt-4 font-serif text-4xl tracking-tight text-slate-950 sm:text-5xl">
            Let us help you learn better
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Send a message if you need support, want to suggest a feature, or have a question about chapters, tests, classes, or reports.
          </p>

          <form onSubmit={submitForm} className="mt-8 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Your name"
                value={form.name}
                onChange={(value) => setForm({ ...form, name: value })}
              />
              <Field
                label="Your Email address"
                type="email"
                value={form.email}
                onChange={(value) => setForm({ ...form, email: value })}
              />
            </div>
            <Field
              label="Subject"
              value={form.subject}
              onChange={(value) => setForm({ ...form, subject: value })}
            />
            <label className="grid gap-2 text-sm font-bold text-slate-600">
              Message
              <textarea
                required
                rows={7}
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
              />
            </label>

            {status && (
              <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                {status}
              </p>
            )}
            {error && (
              <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSending}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {isSending ? 'Sending...' : 'Send message'}
            </button>
          </form>
        </div>

        <div className="grid gap-4 self-start rounded-[2rem] border border-emerald-100 bg-emerald-50/80 p-6 shadow-sm sm:p-8">
          <div>
            <h2 className="font-serif text-3xl text-slate-950">Reach us</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Questions are usually answered by Rethish Sir. You can also use this page for school-related support or platform feedback.
            </p>
          </div>

          <ContactCard icon={PhoneCall} title="Phone" value="+91 73049 30375" />
          <ContactCard icon={Mail} title="Email" value="innovativesci2@gmail.com" />
          <ContactCard icon={MapPin} title="Location" value="Mumbai, Maharashtra" />

          <div className="rounded-3xl border border-white/70 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Response style</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              We try to keep replies short, clear, and action-oriented so students can get back to practice quickly.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

const Field = ({ label, value, onChange, type = 'text' }) => (
  <label className="grid gap-2 text-sm font-bold text-slate-600">
    {label}
    <input
      required
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
    />
  </label>
)

const ContactCard = ({ icon: Icon, title, value }) => (
  <div className="flex items-start gap-3 rounded-3xl border border-white/70 bg-white p-4">
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{title}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  </div>
)

export default Contactpage
