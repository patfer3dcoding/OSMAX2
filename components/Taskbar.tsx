import React, { useState, useEffect } from 'react';
import type { WindowState, AppConfig } from '../types';
import { APPS } from '../constants';
import * as Icons from './icons';

interface TaskbarProps {
  windows: WindowState[];
  activeWindowId: string | null;
  toggleStartMenu: () => void;
  openApp: (appId: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
}

const Taskbar: React.FC<TaskbarProps> = ({ windows, activeWindowId, toggleStartMenu, openApp, focusWindow, minimizeWindow }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTaskbarIconClick = (appId: string) => {
    const appWindows = windows.filter(w => w.appId === appId);

    if (appWindows.length === 0) {
      // Case 1: App is not open, so open it.
      openApp(appId);
    } else {
      // Case 2: App has one or more windows. Find the most recently used one.
      const topWindow = appWindows.sort((a, b) => b.zIndex - a.zIndex)[0];

      // If the top-most window of this app is the currently active window and not minimized, then minimize it.
      if (topWindow.id === activeWindowId && !topWindow.isMinimized) {
        minimizeWindow(topWindow.id);
      } else {
        // Otherwise, focus the top-most window (which will also un-minimize it).
        focusWindow(topWindow.id);
      }
    }
  };
  
  const pinnedApps = APPS.filter(app => app.isPinned);

  // Get a unique list of open app IDs
  const openAppIds = [...new Set(windows.map(w => w.appId))];
  
  // Get the AppConfig for open apps that are not pinned
  const openAppIcons = APPS.filter(app => openAppIds.includes(app.id) && !app.isPinned);
  
  const taskbarApps = pinnedApps.concat(openAppIcons);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gray-900/80 backdrop-blur-xl flex items-center justify-between text-white z-50">
      <div className="flex items-center h-full">
        <button onClick={toggleStartMenu} className="px-4 h-full hover:bg-white/10 transition-colors">
          <Icons.StartIcon />
        </button>
        <div className="w-px h-6 bg-white/20"></div>
        
        {taskbarApps.map(app => {
          const appWindows = windows.filter(w => w.appId === app.id);
          const isOpen = appWindows.length > 0;
          // An app is "active" on the taskbar if any of its windows is the currently active window and not minimized.
          const isActive = isOpen && appWindows.some(w => w.id === activeWindowId && !w.isMinimized);
          
          return (
            <button
              key={app.id}
              onClick={() => handleTaskbarIconClick(app.id)}
              className={`px-4 h-full flex items-center justify-center relative hover:bg-white/10 transition-colors ${isActive ? 'bg-white/20' : ''}`}
            >
              {app.icon('w-7 h-7')}
              {isOpen && <div className={`absolute bottom-0 h-1 w-6 rounded-full ${isActive ? 'bg-blue-400' : 'bg-gray-400'}`}></div>}
            </button>
          );
        })}
      </div>
      
      <div className="px-4 text-sm text-center">
        <div>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div>{time.toLocaleDateString()}</div>
      </div>
    </div>
  );
};

export default Taskbar;