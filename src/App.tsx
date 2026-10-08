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
import { WhatsAppNotificationModal } from './components/shared/WhatsAppNotificationModal';
import { InactivityWarningModal } from './components/shared/InactivityWarningModal';
import { DirectConfirmationModal } from './components/shared/DirectConfirmationModal';
import { Automated24HourReminderModal } from './components/shared/Automated24HourReminderModal';

const MainContent: React.FC = () => {
  const { activePortal } = useApp();

  return (
    <main className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1 min-w-0">
      {activePortal === 'team' && <TeamPortal />}
      {activePortal === 'leadership' && <LeadershipPortal />}
      {activePortal === 'admin' && <AdminPortal />}
    </main>
  );
};

const AppShell: React.FC = () => {
  const {
    isLoggedIn,
    directConfirmData,
    closeDirectConfirmModal,
    automatedReminderModalOpen,
    setAutomatedReminderModalOpen,
    pending24HourDuties,
  } = useApp();

  if (!isLoggedIn) {
    return (
      <div className="w-full min-h-screen overflow-x-hidden bg-slate-950">
        <LoginPage />
        <ToastNotification />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      <Navbar />
      <MainContent />
      
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 py-4 sm:py-6 px-3 sm:px-8 text-center text-xs text-slate-500 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
          <div>
            <span className="font-semibold text-slate-400">MediaServe</span> · COP Akweteyman Worship Center (AKWC) Media Ministry
          </div>
          <div className="text-[11px] text-slate-600">
            Workflow: Create → Assign → Remind → Confirm → Monitor
          </div>
        </div>
      </footer>

      <WhatsAppNotificationModal />
      <InactivityWarningModal />

      {directConfirmData && (
        <DirectConfirmationModal
          isOpen={Boolean(directConfirmData)}
          onClose={closeDirectConfirmModal}
          assignment={directConfirmData.asg}
          program={directConfirmData.prog}
          role={directConfirmData.role}
          member={directConfirmData.member}
        />
      )}

      <Automated24HourReminderModal
        isOpen={automatedReminderModalOpen}
        onClose={() => setAutomatedReminderModalOpen(false)}
        pendingDuties={pending24HourDuties}
      />

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
