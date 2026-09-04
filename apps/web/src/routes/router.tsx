import * as React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from '@/layouts/root-layout';
import { ProtectedRoute } from './protected-route';
import { FullPageSpinner } from '@/components/full-page-spinner';

function lazyPage(loader: () => Promise<{ default: React.ComponentType }>) {
  const Component = React.lazy(loader);
  return (
    <React.Suspense fallback={<FullPageSpinner />}>
      <Component />
    </React.Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // --- public ---------------------------------------------------------
      { path: '/', element: lazyPage(() => import('@/features/marketing/home-page')) },
      { path: '/catalog', element: lazyPage(() => import('@/features/marketplace/catalog-page')) },
      { path: '/catalog/category/:slug', element: lazyPage(() => import('@/features/marketplace/category-page')) },
      { path: '/catalog/:slug', element: lazyPage(() => import('@/features/marketplace/product-page')) },
      { path: '/login', element: lazyPage(() => import('@/features/auth/login-page')) },

      // --- marketplace ------------------------------------------------------
      { path: '/shop', element: lazyPage(() => import('@/features/marketplace/catalog-page')) },
      { path: '/shop/category/:slug', element: lazyPage(() => import('@/features/marketplace/category-page')) },
      { path: '/shop/product/:slug', element: lazyPage(() => import('@/features/marketplace/product-page')) },
      { path: '/cart', element: lazyPage(() => import('@/features/cart/cart-page')) },
      {
        path: '/checkout',
        element: <ProtectedRoute>{lazyPage(() => import('@/features/checkout/checkout-page'))}</ProtectedRoute>,
      },
      {
        path: '/orders',
        element: <ProtectedRoute>{lazyPage(() => import('@/features/orders/orders-list-page'))}</ProtectedRoute>,
      },
      {
        path: '/orders/:id',
        element: <ProtectedRoute>{lazyPage(() => import('@/features/orders/order-detail-page'))}</ProtectedRoute>,
      },

      // --- health (public read, some actions require auth) -----------------
      { path: '/health', element: lazyPage(() => import('@/features/health/health-hub-page')) },
      {
        path: '/health/management',
        element: <ProtectedRoute>{lazyPage(() => import('@/features/health/health-management-page'))}</ProtectedRoute>,
      },
      { path: '/health/community', element: lazyPage(() => import('@/features/health/community-page')) },
      { path: '/health/sport-ranking', element: lazyPage(() => import('@/features/health/sport-ranking-page')) },
      { path: '/health/knowledge', element: lazyPage(() => import('@/features/health/knowledge-page')) },
      { path: '/health/knowledge/:slug', element: lazyPage(() => import('@/features/health/article-detail-page')) },

      // --- partner app (/app/*) ---------------------------------------------
      { path: '/app', element: <ProtectedRoute>{lazyPage(() => import('@/features/dashboard/home-page'))}</ProtectedRoute> },
      { path: '/app/orders', element: <ProtectedRoute>{lazyPage(() => import('@/features/orders/orders-list-page'))}</ProtectedRoute> },
      { path: '/app/report', element: <ProtectedRoute>{lazyPage(() => import('@/features/report/report-page'))}</ProtectedRoute> },
      {
        path: '/app/members',
        element: (
          <ProtectedRoute permissions={['members.read']}>{lazyPage(() => import('@/features/members/members-page'))}</ProtectedRoute>
        ),
      },
      {
        path: '/app/sponsor-tree',
        element: (
          <ProtectedRoute permissions={['members.tree.read']}>
            {lazyPage(() => import('@/features/members/sponsor-tree-page'))}
          </ProtectedRoute>
        ),
      },
      {
        path: '/app/placement-tree',
        element: (
          <ProtectedRoute permissions={['members.tree.read']}>
            {lazyPage(() => import('@/features/members/placement-tree-page'))}
          </ProtectedRoute>
        ),
      },
      {
        path: '/app/fulfillment-orders',
        element: (
          <ProtectedRoute permissions={['fulfillment.read']}>
            {lazyPage(() => import('@/features/fulfillment/fulfillment-orders-page'))}
          </ProtectedRoute>
        ),
      },
      {
        path: '/app/bonuses',
        element: <ProtectedRoute permissions={['bonus.read']}>{lazyPage(() => import('@/features/bonuses/bonuses-page'))}</ProtectedRoute>,
      },
      {
        path: '/app/wallet',
        element: <ProtectedRoute permissions={['wallet.read']}>{lazyPage(() => import('@/features/wallet/wallet-page'))}</ProtectedRoute>,
      },
      {
        path: '/app/investment',
        element: <ProtectedRoute>{lazyPage(() => import('@/features/investment/investment-page'))}</ProtectedRoute>,
      },
      { path: '/app/me', element: <ProtectedRoute>{lazyPage(() => import('@/features/profile/me-page'))}</ProtectedRoute> },
      { path: '/app/profile', element: <ProtectedRoute>{lazyPage(() => import('@/features/profile/profile-page'))}</ProtectedRoute> },
      { path: '/app/addresses', element: <ProtectedRoute>{lazyPage(() => import('@/features/addresses/addresses-page'))}</ProtectedRoute> },
      { path: '/app/language', element: <ProtectedRoute>{lazyPage(() => import('@/features/language/language-page'))}</ProtectedRoute> },

      { path: '*', element: lazyPage(() => import('@/features/marketing/not-found-page')) },
    ],
  },
]);
