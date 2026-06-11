'use client';

import { ReactNode } from 'react';
import AppLayout from './layouts/AppLayout';

export default function Layout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}