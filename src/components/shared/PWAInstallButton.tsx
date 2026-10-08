import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Smartphone, Download, X, Share2, PlusSquare, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed and running standalone, hide the button
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Android / Chromium / Desktop Install Button */}
      {isInstallable && (
        <button
          onClick={install}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          title="Install MediaServe app on your phone"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      )}

      {/* iOS Safari Guide Button (since iOS doesn't support beforeinstallprompt) */}
      {isIOS && (
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-amber-300 text-xs font-medium rounded-xl transition-all cursor-pointer"
          title="Install on iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Install on iPhone</span>
        </button>
      )}

      {/* Fallback button for mobile users */}
      {!isInstallable && !isIOS && (
        <button
          onClick={() => setShowIOSGuide(true)}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          title="Install as Android / iOS App"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Get Mobile App</span>
        </button>
      )}

      {/* Guided Installation Modal for iOS and Mobile Users */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Install on Your Phone</h3>
                  <p className="text-[11px] text-slate-400">Android & iOS Home Screen App</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl">
                <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg shrink-0 mt-0.5">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">1. Tap the Share button</div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    On iPhone Safari, tap the box with arrow pointing up (Share icon) at the bottom.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl">
                <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg shrink-0 mt-0.5">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">2. Select &ldquo;Add to Home Screen&rdquo;</div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Scroll down the menu options and tap &ldquo;Add to Home Screen&rdquo;.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-white">3. Tap &ldquo;Add&rdquo;</div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    MediaServe will install directly onto your home screen and run standalone with full offline caching!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
