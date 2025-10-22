import React, { useState, useCallback, useRef, useEffect } from 'react';
import Desktop from './components/Desktop';
import Taskbar from './components/Taskbar';
import StartMenu from './components/StartMenu';
import Window from './components/Window';
import { APPS } from './constants';
import type { WindowState, FSNode, FileData, DirectoryNode } from './types';

const BACKGROUNDS = {
  default: `
<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" style="stop-color:#0078D7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#002050;stop-opacity:1" />
    </radialGradient>
    <g id="eyelash-top-left">
      <path d="M 80 80 Q 40 70, 10 50" stroke="white" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M 80 80 Q 50 50, 30 20" stroke="white" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M 80 80 Q 70 40, 50 10" stroke="white" stroke-width="7" stroke-linecap="round" fill="none"/>
    </g>
    <g id="eyelash-top-right">
      <path d="M 20 80 Q 60 70, 90 50" stroke="white" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M 20 80 Q 50 50, 70 20" stroke="white" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M 20 80 Q 30 40, 50 10" stroke="white" stroke-width="7" stroke-linecap="round" fill="none"/>
    </g>
    <g id="eyelash-bottom-left">
      <path d="M 80 20 Q 40 30, 10 50" stroke="white" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M 80 20 Q 50 50, 30 80" stroke="white" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M 80 20 Q 70 60, 50 90" stroke="white" stroke-width="7" stroke-linecap="round" fill="none"/>
    </g>
    <g id="eyelash-bottom-right">
      <path d="M 20 20 Q 60 30, 90 50" stroke="white" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M 20 20 Q 50 50, 70 80" stroke="white" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M 20 20 Q 30 60, 50 90" stroke="white" stroke-width="7" stroke-linecap="round" fill="none"/>
    </g>
  </defs>
  <rect width="1920" height="1080" fill="url(#grad1)" />
  
  <g transform="translate(860, 160) scale(1.5)">
    <use href="#eyelash-top-left" x="0" y="0" />
    <use href="#eyelash-top-right" x="100" y="0" />
    <use href="#eyelash-bottom-left" x="0" y="100" />
    <use href="#eyelash-bottom-right" x="100" y="100" />
  </g>

  <text x="960" y="80" font-family="'Segoe UI', sans-serif" font-size="48" fill="white" text-anchor="middle" font-weight="300">
    Maxfra Academy OS
  </text>
  <text x="960" y="130" font-family="'Segoe UI', sans-serif" font-size="32" fill="white" text-anchor="middle" font-weight="500">
    1.0 Special Edition
  </text>
</svg>`,
  sunset: `
<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sunsetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4a0e63;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#e13680;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ffcc80;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#sunsetGrad)" />
  <text x="960" y="100" font-family="'Segoe UI', sans-serif" font-size="48" fill="white" text-anchor="middle" font-weight="300" style="text-shadow: 1px 1px 3px rgba(0,0,0,0.5);">
    Maxfra Academy OS
  </text>
  <text x="960" y="150" font-family="'Segoe UI', sans-serif" font-size="32" fill="white" text-anchor="middle" font-weight="500" style="text-shadow: 1px 1px 3px rgba(0,0,0,0.5);">
    1.0 Special Edition
  </text>
</svg>`,
  matrix: `
<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="matrixGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" />
      <stop offset="100%" stop-color="#0d2a0d" />
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#matrixGrad)" />
  <text x="960" y="100" font-family="'Segoe UI', sans-serif" font-size="48" fill="#34d399" text-anchor="middle" font-weight="300" style="text-shadow: 0 0 5px #34d399;">
    Maxfra Academy OS
  </text>
  <text x="960" y="150" font-family="'Segoe UI', sans-serif" font-size="32" fill="#34d399" text-anchor="middle" font-weight="500" style="text-shadow: 0 0 5px #34d399;">
    1.0 Special Edition
  </text>
</svg>`,
};

const initialFileSystem: DirectoryNode = {
    type: 'directory',
    name: 'root',
    children: [
        { type: 'directory', name: 'Documents', children: [
            { type: 'file', name: 'resume.txt', content: 'This is a resume.' },
        ]},
        { type: 'directory', name: 'Pictures', children: [] },
        { type: 'directory', name: 'Recycle Bin', children: [] },
        { type: 'file', name: 'system.config', content: 'Initial system configuration.' },
    ]
};

interface OsWindowState {
    windows: WindowState[];
    activeWindowId: string | null;
}

const App: React.FC = () => {
    const [osWindowState, setOsWindowState] = useState<OsWindowState>({
        windows: [],
        activeWindowId: null,
    });
    const [isStartMenuOpen, setStartMenuOpen] = useState(false);
    const [backgroundId, setBackgroundId] = useState('default');
    const [fs, setFs] = useState<FSNode>(initialFileSystem);
    const zIndexCounter = useRef(10);

  useEffect(() => {
    const savedBg = localStorage.getItem('maxfra-os-background') as keyof typeof BACKGROUNDS | null;
    if (savedBg && BACKGROUNDS[savedBg]) {
        setBackgroundId(savedBg);
    }
     try {
        const savedFs = localStorage.getItem('maxfra-filesystem');
        if (savedFs) setFs(JSON.parse(savedFs));
    } catch (e) {
        console.error("Failed to load filesystem, resetting.", e);
        setFs(initialFileSystem);
    }

    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'maxfra-os-background' && e.newValue && BACKGROUNDS[e.newValue as keyof typeof BACKGROUNDS]) {
            setBackgroundId(e.newValue);
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  useEffect(() => {
    try {
        localStorage.setItem('maxfra-filesystem', JSON.stringify(fs));
    } catch (error) {
        console.error("Failed to save filesystem to localStorage", error);
    }
  }, [fs]);


  const openApp = useCallback((appId: string, file?: FileData) => {
    setOsWindowState(prev => {
      const existingWindow = prev.windows.find(w => w.appId === appId && !file);
      if (existingWindow) {
        const newZ = zIndexCounter.current + 1;
        zIndexCounter.current = newZ;
        return {
          windows: prev.windows.map(w => w.id === existingWindow.id ? { ...w, isMinimized: false, zIndex: newZ } : w),
          activeWindowId: existingWindow.id,
        };
      }
      
      const appConfig = APPS.find(app => app.id === appId);
      if (!appConfig) return prev;

      const newWindowId = `${appId}-${Date.now()}`;
      zIndexCounter.current += 1;
      
      const newWindow: WindowState = {
        id: newWindowId,
        appId: appConfig.id,
        title: file ? `${file.name} - ${appConfig.title}` : appConfig.title,
        icon: appConfig.icon,
        position: { x: 50 + prev.windows.length * 20, y: 50 + prev.windows.length * 20 },
        size: appConfig.defaultSize || { width: 640, height: 480 },
        isMinimized: false,
        isMaximized: false,
        zIndex: zIndexCounter.current,
        component: appConfig.component,
        file: file,
      };
      return {
          windows: [...prev.windows, newWindow],
          activeWindowId: newWindowId,
      };
    });
    setStartMenuOpen(false);
  }, []);

  const closeWindow = useCallback((id: string) => {
    setOsWindowState(prev => {
        const newWindows = prev.windows.filter(w => w.id !== id);
        let newActiveId = prev.activeWindowId;
        if (id === prev.activeWindowId) {
            const nextWindow = newWindows
                .filter(w => !w.isMinimized)
                .sort((a,b) => b.zIndex - a.zIndex)[0];
            newActiveId = nextWindow?.id || null;
        }
        return { windows: newWindows, activeWindowId: newActiveId };
    });
  }, []);

  const focusWindow = useCallback((id: string) => {
    setOsWindowState(prev => {
        if (id === prev.activeWindowId && !prev.windows.find(w => w.id === id)?.isMinimized) {
            return prev;
        }
        zIndexCounter.current += 1;
        const newWindows = prev.windows.map(w => w.id === id ? { ...w, zIndex: zIndexCounter.current, isMinimized: false } : w);
        return { windows: newWindows, activeWindowId: id };
    });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setOsWindowState(prev => {
        // If we are not minimizing the active window, the logic is simple.
        if (id !== prev.activeWindowId) {
            const newWindows = prev.windows.map(w => w.id === id ? { ...w, isMinimized: true } : w);
            return { ...prev, windows: newWindows };
        }

        // We are minimizing the active window. We need to find the next active one.
        const otherWindows = prev.windows.filter(w => w.id !== id);
        const nextActiveWindow = otherWindows
            .filter(w => !w.isMinimized)
            .sort((a, b) => b.zIndex - a.zIndex)[0];
        
        const newZ = zIndexCounter.current + 1;
        if (nextActiveWindow) {
          zIndexCounter.current = newZ;
        }

        const newWindows = prev.windows.map(w => {
            if (w.id === id) return { ...w, isMinimized: true }; // Minimize the target
            if (nextActiveWindow && w.id === nextActiveWindow.id) return { ...w, zIndex: newZ }; // Elevate the new active
            return w; // Return others as is
        });

        return {
            windows: newWindows,
            activeWindowId: nextActiveWindow?.id || null,
        };
    });
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setOsWindowState(prev => {
        zIndexCounter.current += 1;
        const newWindows = prev.windows.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized, zIndex: zIndexCounter.current, isMinimized: false } : w);
        return { windows: newWindows, activeWindowId: id };
    });
  }, []);

  const updateWindowPosition = useCallback((id: string, position: { x: number; y: number }) => {
    setOsWindowState(prev => ({ ...prev, windows: prev.windows.map(w => w.id === id ? { ...w, position } : w) }));
  }, []);
  
  const updateWindowSize = useCallback((id: string, position: { x: number; y: number }, size: { width: number; height: number }) => {
    setOsWindowState(prev => ({ ...prev, windows: prev.windows.map(w => w.id === id ? { ...w, position, size } : w) }));
  }, []);

  const backgroundSvg = BACKGROUNDS[backgroundId as keyof typeof BACKGROUNDS] || BACKGROUNDS.default;
  const backgroundImageUrl = `url("data:image/svg+xml;base64,${btoa(backgroundSvg)}")`;

  return (
    <div className="h-screen w-screen bg-cover bg-center" style={{ backgroundImage: backgroundImageUrl }}>
      <Desktop apps={APPS} openApp={openApp} />
      
      {osWindowState.windows.map(ws => (
        <Window
          key={ws.id}
          windowState={ws}
          onClose={closeWindow}
          onMinimize={minimizeWindow}
          onMaximize={maximizeWindow}
          onFocus={focusWindow}
          onDrag={updateWindowPosition}
          onResize={updateWindowSize}
          isActive={ws.id === osWindowState.activeWindowId}
          fs={fs}
          setFs={setFs}
          openApp={openApp}
        />
      ))}

      <StartMenu
        isOpen={isStartMenuOpen}
        apps={APPS}
        openApp={openApp}
        closeStartMenu={() => setStartMenuOpen(false)}
      />
      <Taskbar
        windows={osWindowState.windows}
        activeWindowId={osWindowState.activeWindowId}
        toggleStartMenu={() => setStartMenuOpen(prev => !prev)}
        openApp={openApp}
        focusWindow={focusWindow}
        minimizeWindow={minimizeWindow}
      />
    </div>
  );
};

export default App;