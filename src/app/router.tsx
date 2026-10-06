import { createBrowserRouter, Navigate } from 'react-router-dom'
import type { ComponentType } from 'react'

// ── Layout ────────────────────────────────────────────────────────────────────
import AppShell from '../components/layout/AppShell'
import HomeLayout from '../components/layout/HomeLayout'
import AuthLayout from '../components/layout/AuthLayout'
import ErrorPage from '../components/layout/ErrorPage'

// ── Auth guard ────────────────────────────────────────────────────────────────
import AuthGuard from '../features/auth/components/AuthGuard'

// ── Auth pages ────────────────────────────────────────────────────────────────
import LoginPage from '../features/auth/pages/LoginPage'
import RegisterPage from '../features/auth/pages/RegisterPage'
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage'

// ── Home / landing page ───────────────────────────────────────────────────────
import HomePage from '../features/home/pages/HomePage'
import ContactPage from '../features/home/pages/ContactPage'
import { TermsPage, PrivacyPage } from '../features/home/pages/LegalPages'

// ── Public / auction catalogue pages ─────────────────────────────────────────
import AuctionListPage from '../features/auctions/pages/AuctionListPage'
import AuctionDetailPage from '../features/auctions/pages/AuctionDetailPage'

// ── Bidder / organisation / admin portal pages are lazy-loaded below with
//    page() so buyers arriving from ads don't download the staff dashboards.

// ── Public catalogue page ─────────────────────────────────────────────────────
import CataloguePage from '../features/auctions/pages/CataloguePage'

// ─────────────────────────────────────────────────────────────────────────────

const RELOAD_KEY = 'qw-chunk-reload'

/**
 * Lazy route helper: loads a page's code only when that route is opened.
 *
 * Each deploy renames these code files, so a tab opened before a deploy asks
 * for files that no longer exist. When that happens, reload once to pick up
 * the new version instead of showing the error page. The session flag stops
 * a reload loop if the file is genuinely broken.
 */
const page = (load: () => Promise<{ default: ComponentType }>) => ({
  lazy: async () => {
    try {
      const mod = await load()
      sessionStorage.removeItem(RELOAD_KEY)
      return { Component: mod.default }
    } catch (err) {
      let reloaded = false
      try { reloaded = sessionStorage.getItem(RELOAD_KEY) === '1' } catch { /* storage blocked */ }
      if (!reloaded) {
        try { sessionStorage.setItem(RELOAD_KEY, '1') } catch { /* storage blocked */ }
        window.location.reload()
        return new Promise<never>(() => {}) // keep the loader waiting while the page reloads
      }
      throw err
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  // ── Auth pages (no sidebar — full-screen centered layout) ──────────────────
  {
    path: '/login',
    element: <AuthLayout title="Sign in to Quickway" subtitle="Enter your credentials to access your account."><LoginPage /></AuthLayout>,
  },
  {
    path: '/register',
    element: <AuthLayout title="Create an account" subtitle="Join Quickway to start bidding on auctions."><RegisterPage /></AuthLayout>,
  },
  {
    path: '/forgot-password',
    element: <AuthLayout title="Reset your password" subtitle="We'll send a reset link to your email address."><ForgotPasswordPage /></AuthLayout>,
  },

  // ── Home / landing page ─────────────────────────────────────────────────────
  {
    path: '/',
    element: <HomeLayout />,
    children: [
      { index: true, element: <HomePage /> },
    ],
  },

  // ── All sidebar routes under a single AppShell layout ──────────────────────
  {
    element: <AppShell />,
    errorElement: <ErrorPage />,
    children: [
      // Public — no auth required
      { path: '/contact', element: <ContactPage /> },
      { path: '/terms',   element: <TermsPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      {
        path: '/auctions',
        children: [
          { index: true,           element: <AuctionListPage /> },
          { path: ':id',           element: <AuctionDetailPage /> },
          { path: ':id/catalogue', element: <CataloguePage /> },
        ],
      },

      // Bidder portal (role: bidder)
      {
        element: <AuthGuard allowedRoles={['bidder']} />,
        children: [
          {
            path: '/bidder',
            children: [
              { index: true,     ...page(() => import('../features/bidder/pages/BidderDashboard')) },
              { path: 'profile', ...page(() => import('../features/bidder/pages/BidderProfile')) },
              { path: 'kyc',     ...page(() => import('../features/bidder/pages/BidderKyc')) },
              { path: 'history', ...page(() => import('../features/bidder/pages/BidderHistory')) },
            ],
          },
        ],
      },

      // Organisation portal (role: org_admin)
      {
        element: <AuthGuard allowedRoles={['org_admin']} />,
        children: [
          {
            path: '/org',
            children: [
              { index: true,      ...page(() => import('../features/org/pages/OrgDashboard')) },
              { path: 'auctions', ...page(() => import('../features/org/pages/OrgAuctions')) },
              { path: 'bidders',  ...page(() => import('../features/org/pages/OrgBidders')) },
            ],
          },
        ],
      },

      // Admin panel (role: admin)
      {
        element: <AuthGuard allowedRoles={['admin']} />,
        children: [
          {
            path: '/admin',
            children: [
              { index: true,                  ...page(() => import('../features/admin/pages/AdminDashboard')) },
              { path: 'users',                ...page(() => import('../features/admin/pages/AdminUsers')) },
              { path: 'organizations',        ...page(() => import('../features/admin/pages/AdminOrganizations')) },
              { path: 'auctions',             ...page(() => import('../features/admin/pages/AdminAuctions')) },
              { path: 'auctions/new',         ...page(() => import('../features/admin/pages/AdminAuctionDetail')) },
              { path: 'auctions/:id',         ...page(() => import('../features/admin/pages/AdminAuctionDetail')) },

              { path: 'kyc',                  ...page(() => import('../features/admin/pages/AdminKycQueue')) },
              { path: 'payments',             ...page(() => import('../features/admin/pages/AdminPayments')) },
            ],
          },
        ],
      },
    ],
  },

  // ── Catch-all — show branded 404 page ──────────────────────────────────────
  { path: '*', element: <ErrorPage /> },
])
