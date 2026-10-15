import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

const PageBreadcrumbs = ({ items = [], className = '' }) => (
  <nav aria-label="Breadcrumb" className={`flex w-full min-w-0 max-w-full flex-nowrap items-center gap-0.5 overflow-hidden whitespace-nowrap text-[10px] font-bold text-slate-500 sm:gap-1 sm:text-xs ${className}`}>
    <Link to="/" className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 transition hover:bg-cyan-50 hover:text-cyan-700">
      <Home className="h-3.5 w-3.5" /> Home
    </Link>
    {items.map((item, index) => (
      <span key={`${item.label}-${index}`} className={`inline-flex min-w-0 items-center gap-0.5 sm:gap-1 ${index === items.length - 1 ? 'flex-1' : 'shrink-0'}`}>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
        {item.to && index < items.length - 1 ? (
          <Link to={item.to} className="max-w-[6.5rem] truncate rounded-md px-1 py-1 transition hover:bg-cyan-50 hover:text-cyan-700 sm:max-w-[12rem] sm:px-1.5">{item.label}</Link>
        ) : <span className="max-w-[7rem] truncate px-1 py-1 text-slate-700 sm:max-w-[12rem] sm:px-1.5">{item.label}</span>}
      </span>
    ))}
  </nav>
)

export default PageBreadcrumbs
