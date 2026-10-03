/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { LoginPage } from './components/auth/LoginPage';
import { TeamPortal } from './components/portals/TeamPortal';
import { LeadershipPortal } from './components/portals/LeadershipPortal';
import { AdminPortal } from './components/portals/AdminPortal';
import { ToastNotification } from './components/shared/ToastNotification';

const MainContent: React.FC = () => {
  const { activePortal } = useApp();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex-1 w-full">
      {activePortal === 'team' && <TeamPortal />}
      {activePortal === 'leadership' && <LeadershipPortal />}
      {activePortal === 'admin' && <AdminPortal />}
    </main>
  );
};

const AppShell: React.FC = () => {
  const { isLoggedIn } = useApp();

  if (!isLoggedIn) {
    return (
      <>
        <LoginPage />
        <ToastNotification />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      <Navbar />
      <MainContent />
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 py-6 px-4 sm:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-400">MediaServe</span> · COP Akweteyman Worship Center (AKWC) Media Ministry
          </div>
          <div className="text-[11px] text-slate-600">
            Workflow: Create → Assign → Remind → Confirm → Monitor
          </div>
        </div>
      </footer>
      <ToastNotification />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
