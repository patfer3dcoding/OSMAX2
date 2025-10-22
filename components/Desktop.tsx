import React from 'react';
import type { AppConfig } from '../types';

const DesktopSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-black/20 backdrop-blur-md p-4 rounded-lg min-w-[300px] transition-all hover:bg-black/30">
        <h2 className="text-white text-lg font-semibold mb-3 px-2 [text-shadow:1px_1px_2px_#000]">{title}</h2>
        <div className="flex flex-wrap gap-2 justify-center pt-2">
            {children}
        </div>
    </div>
);

const AppButton: React.FC<{ app: AppConfig; openApp: (id: string) => void }> = ({ app, openApp }) => (
    <button
        onDoubleClick={() => openApp(app.id)}
        className="flex flex-col items-center p-3 rounded hover:bg-white/10 w-28 transition-colors"
    >
        {app.icon('w-12 h-12')}
        <span className="text-white text-sm mt-2 text-center shadow-black [text-shadow:1px_1px_2px_var(--tw-shadow-color)]">{app.title}</span>
    </button>
);

const Desktop: React.FC<{ apps: AppConfig[]; openApp: (appId: string) => void; }> = ({ apps, openApp }) => {
  
  const getApp = (id: string) => apps.find(app => app.id === id);

  const sections: Record<string, string[]> = {
      "School Database": ['studentDatabase', 'calendar'],
      "Productivity Suite": ['maxfraOfficeSuite'],
      "Financial Tools": ['clipCalculator', 'calculator'],
      "System Utilities": ['fileExplorer', 'notepad', 'settings', 'recycleBin'],
      "Internet": ['maxfraAiBrowser', 'sandyAi'],
  };
  
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="flex flex-wrap gap-6 justify-center">
        {Object.entries(sections).map(([title, appIds]) => (
          <DesktopSection key={title} title={title}>
            {appIds.map(id => {
              const app = getApp(id);
              return app ? <AppButton key={id} app={app} openApp={openApp} /> : null;
            })}
          </DesktopSection>
        ))}
      </div>
    </div>
  );
};

export default Desktop;