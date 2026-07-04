import { Link } from 'react-router-dom'
import { MessageCircleMore, MapPin, PhoneCall } from 'lucide-react'

const WHATSAPP_NUMBER = '917304930375'
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello Sir, I need help with Innovative Science 2.')}`

const Contactpage = () => {
  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ffffff_50%,#f0fdf4_100%)] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            <MessageCircleMore className="h-3.5 w-3.5" />
            Contact Sir
          </div>
          <h1 className="mt-4 font-serif text-4xl tracking-tight text-slate-950 sm:text-5xl">
            Let us help you learn better
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Use WhatsApp to contact Sir directly. The page no longer asks for your name, email, subject, or message.
          </p>

          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            <MessageCircleMore className="h-4 w-4" />
            Contact Sir on WhatsApp
          </a>

          <Link
            to="/feedback"
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white px-5 py-3.5 text-sm font-black text-emerald-700 transition hover:bg-emerald-50"
          >
            Leave website feedback
          </Link>
        </div>

        <div className="grid gap-4 self-start rounded-[2rem] border border-emerald-100 bg-emerald-50/80 p-6 shadow-sm sm:p-8">
          <div>
            <h2 className="font-serif text-3xl text-slate-950">Reach us</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Questions are usually answered by Rethish Sir. You can also use this page for school-related support or platform feedback.
            </p>
          </div>

          <ContactCard icon={PhoneCall} title="Phone" value="+91 73049 30375" />
          <ContactCard icon={MessageCircleMore} title="WhatsApp" value="+91 73049 30375" />
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
