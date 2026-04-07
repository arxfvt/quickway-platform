import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom'
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react'

export default function ErrorPage() {
  const error = useRouteError()

  const is404 = isRouteErrorResponse(error) && error.status === 404
  const title = is404 ? 'Page Not Found' : 'Something Went Wrong'
  const message = is404
    ? "The page you're looking for doesn't exist or has been moved."
    : 'An unexpected error occurred. Please try again or go back home.'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-light flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={24} className="text-amber-dark" />
        </div>
        <p className="text-4xl font-bold text-slate-200 mb-2">{is404 ? '404' : 'Oops'}</p>
        <h1 className="text-lg font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-sm text-slate-500 mb-7">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={13} /> Go Back
          </button>
          <Link
            to="/"
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl bg-brand text-white hover:bg-brand-dark transition-colors"
          >
            <Home size={13} /> Home
          </Link>
        </div>
      </div>
    </div>
  )
}
