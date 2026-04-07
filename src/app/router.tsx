import { createBrowserRouter, Navigate } from 'react-router-dom'

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

// ── Public / auction catalogue pages ─────────────────────────────────────────
import AuctionListPage from '../features/auctions/pages/AuctionListPage'
import AuctionDetailPage from '../features/auctions/pages/AuctionDetailPage'

// ── Bidder portal pages ───────────────────────────────────────────────────────
import BidderDashboard from '../features/bidder/pages/BidderDashboard'
import BidderProfile from '../features/bidder/pages/BidderProfile'
import BidderKyc from '../features/bidder/pages/BidderKyc'
import BidderHistory from '../features/bidder/pages/BidderHistory'

// ── Organisation portal pages ─────────────────────────────────────────────────
import OrgDashboard from '../features/org/pages/OrgDashboard'
import OrgAuctions from '../features/org/pages/OrgAuctions'
import OrgBidders from '../features/org/pages/OrgBidders'

// ── Admin panel pages ─────────────────────────────────────────────────────────
import AdminDashboard from '../features/admin/pages/AdminDashboard'
import AdminUsers from '../features/admin/pages/AdminUsers'
import AdminOrganizations from '../features/admin/pages/AdminOrganizations'
import AdminAuctions from '../features/admin/pages/AdminAuctions'
import AdminAuctionDetail from '../features/admin/pages/AdminAuctionDetail'
import AdminKycQueue from '../features/admin/pages/AdminKycQueue'
import AdminPayments from '../features/admin/pages/AdminPayments'

// ── Public catalogue page ─────────────────────────────────────────────────────
import CataloguePage from '../features/auctions/pages/CataloguePage'

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
              { index: true,     element: <BidderDashboard /> },
              { path: 'profile', element: <BidderProfile /> },
              { path: 'kyc',     element: <BidderKyc /> },
              { path: 'history', element: <BidderHistory /> },
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
              { index: true,      element: <OrgDashboard /> },
              { path: 'auctions', element: <OrgAuctions /> },
              { path: 'bidders',  element: <OrgBidders /> },
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
              { index: true,                  element: <AdminDashboard /> },
              { path: 'users',                element: <AdminUsers /> },
              { path: 'organizations',        element: <AdminOrganizations /> },
              { path: 'auctions',             element: <AdminAuctions /> },
              { path: 'auctions/new',         element: <AdminAuctionDetail /> },
              { path: 'auctions/:id',         element: <AdminAuctionDetail /> },

              { path: 'kyc',                  element: <AdminKycQueue /> },
              { path: 'payments',             element: <AdminPayments /> },
            ],
          },
        ],
      },
    ],
  },

  // ── Catch-all — show branded 404 page ──────────────────────────────────────
  { path: '*', element: <ErrorPage /> },
])
