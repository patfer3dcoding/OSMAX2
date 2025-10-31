
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FolderIcon, FileIcon, ChevronLeftIcon, ChevronRightIcon, ReloadIcon, HomeIcon, PlusIcon, CloseIcon, MaxfraWordIcon, MaxfraExcelIcon, MaxfraOutlookIcon, TrashIcon, WhatsAppIcon } from '../components/icons';
import type { AppProps, FSNode, FileNode, DirectoryNode, FileData, Student } from '../types';

// --- Filesystem Utilities ---
const findNodeByPath = (root: FSNode, path: string[]): DirectoryNode | null => {
    if (root.type !== 'directory') return null;
    let currentNode: DirectoryNode = root;
    for (const part of path) {
        if (!part) continue;
        const nextNode = currentNode.children.find(child => child.name === part && child.type === 'directory') as DirectoryNode | undefined;
        if (!nextNode) return null;
        currentNode = nextNode;
    }
    return currentNode;
};

const findOrCreateDirectoryByPath = (root: DirectoryNode, path: string[]): DirectoryNode => {
    let currentNode = root;
    for (const part of path) {
        if (!part) continue;
        let nextNode = currentNode.children.find(child => child.name === part && child.type === 'directory') as DirectoryNode | undefined;
        if (!nextNode) {
            const newDir: DirectoryNode = { type: 'directory', name: part, children: [] };
            currentNode.children.push(newDir);
            currentNode = newDir;
        } else {
            currentNode = nextNode;
        }
    }
    return currentNode;
};

const saveFileToFS = (root: FSNode, path: string[], fileName: string, content: string): FSNode => {
    const newRoot = JSON.parse(JSON.stringify(root)) as FSNode;
    if (newRoot.type !== 'directory') return root;

    const directory = findOrCreateDirectoryByPath(newRoot, path);

    const existingFileIndex = directory.children.findIndex(child => child.name === fileName && child.type === 'file');
    if (existingFileIndex > -1) {
        (directory.children[existingFileIndex] as FileNode).content = content;
    } else {
        directory.children.push({ type: 'file', name: fileName, content });
    }
    
    return newRoot;
};


// --- App Components ---

export const NotepadApp: React.FC<Partial<AppProps>> = ({ file, setFs }) => {
    const [content, setContent] = useState(file?.content || '');
    const [currentFile, setCurrentFile] = useState(file);

    const handleSave = () => {
        let fileName = currentFile?.name;
        if (!fileName) {
            fileName = prompt("Save as:", "new_document.txt") || undefined;
            if (!fileName) return;
        }

        if (setFs) {
            setFs(fs => saveFileToFS(fs, [], fileName!, content));
            setCurrentFile({ name: fileName, content });
            alert("File saved!");
        }
    };
    
    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-shrink-0 p-1 bg-gray-200 border-b">
                 <button onClick={handleSave} className="px-3 py-1 bg-gray-300 hover:bg-gray-400 rounded text-sm text-black">Save</button>
            </div>
            <textarea 
                className="w-full h-full p-2 border-none resize-none focus:outline-none bg-white text-black"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start typing..."
            />
        </div>
    );
};

export const MaxfraAiBrowserApp: React.FC<Partial<AppProps>> = () => {
    const HOME_PAGE = 'https://www.google.com/webhp?igu=1';
    
    type Tab = {
        id: number;
        url: string;
        title: string;
        inputValue: string;
    };

    const tabIdCounter = useRef(0);

    const createNewTab = (url = HOME_PAGE): Tab => {
        tabIdCounter.current += 1;
        return {
            id: tabIdCounter.current,
            url,
            title: 'New Tab',
            inputValue: url === HOME_PAGE ? '' : url,
        };
    };

    const [tabs, setTabs] = useState<Tab[]>([createNewTab()]);
    const [activeTabId, setActiveTabId] = useState(tabs[0].id);
    const iframeRefs = useRef<Record<number, HTMLIFrameElement | null>>({});
    
    const activeTab = tabs.find(tab => tab.id === activeTabId);

    const updateActiveTab = (updates: Partial<Tab>) => {
        setTabs(prevTabs => prevTabs.map(tab => 
            tab.id === activeTabId ? { ...tab, ...updates } : tab
        ));
    };
    
    const handleAddTab = () => {
        const newTab = createNewTab();
        setTabs([...tabs, newTab]);
        setActiveTabId(newTab.id);
    };

    const handleCloseTab = (e: React.MouseEvent, tabId: number) => {
        e.stopPropagation();
        delete iframeRefs.current[tabId];
        setTabs(prevTabs => {
            const tabIndex = prevTabs.findIndex(tab => tab.id === tabId);
            let newTabs = prevTabs.filter(tab => tab.id !== tabId);
    
            if (newTabs.length === 0) {
                newTabs = [createNewTab()];
                setActiveTabId(newTabs[0].id);
            } else if (activeTabId === tabId) {
                const newActiveIndex = Math.max(0, tabIndex - 1);
                setActiveTabId(newTabs[newActiveIndex].id);
            }
            return newTabs;
        });
    };

    const handleSwitchTab = (tabId: number) => setActiveTabId(tabId);

    const handleNavigate = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!activeTab) return;
        let url = activeTab.inputValue.trim();
        if (!url) return;

        const isUrl = url.includes('.') && !url.includes(' ');
        if (isUrl) {
             if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
        } else {
            url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
        }
        
        updateActiveTab({ url, inputValue: url });
    };

    useEffect(() => {
        if (!activeTabId) return;
        const activeIframe = iframeRefs.current[activeTabId];
        if (!activeIframe) return;

        const updateTitleAndUrl = () => {
            try {
                const iframe = iframeRefs.current[activeTabId];
                if (!iframe || !iframe.contentWindow) return;

                const currentUrlInIframe = iframe.contentWindow.location.href;
                const currentTitleInIframe = iframe.contentWindow.document.title;

                setTabs(prevTabs => prevTabs.map(tab => {
                    if (tab.id === activeTabId) {
                        const newTitle = (currentTitleInIframe && tab.url !== HOME_PAGE) ? currentTitleInIframe : 'New Tab';
                        const newUrl = (currentUrlInIframe && currentUrlInIframe !== 'about:blank') ? currentUrlInIframe : tab.url;
                        
                        return { ...tab, title: newTitle, url: newUrl, inputValue: newUrl === HOME_PAGE ? '' : newUrl };
                    }
                    return tab;
                }));
            } catch (e) {
                // cross-origin, update title from url
                setTabs(prevTabs => prevTabs.map(tab => {
                    if (tab.id === activeTabId) {
                        try {
                           const domain = new URL(tab.url).hostname;
                           return { ...tab, title: domain };
                        } catch {
                           return tab; // keep old title
                        }
                    }
                    return tab;
                }));
            }
        };

        activeIframe.addEventListener('load', updateTitleAndUrl);
        
        return () => {
            activeIframe.removeEventListener('load', updateTitleAndUrl);
        };
    }, [activeTabId, tabs.length]);

    const handleRefresh = () => iframeRefs.current[activeTabId]?.contentWindow?.location.reload();
    const handleBack = () => iframeRefs.current[activeTabId]?.contentWindow?.history.back();
    const handleForward = () => iframeRefs.current[activeTabId]?.contentWindow?.history.forward();
    const handleHome = () => updateActiveTab({ url: HOME_PAGE, inputValue: '' });

    const NewTabPage = () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white text-black">
        <h1 className="text-8xl font-bold mb-8">
          <span className="text-[#4285F4]">G</span>
          <span className="text-[#DB4437]">o</span>
          <span className="text-[#F4B400]">o</span>
          <span className="text-[#4285F4]">g</span>
          <span className="text-[#0F9D58]">l</span>
          <span className="text-[#DB4437]">e</span>
        </h1>
        <form onSubmit={handleNavigate} className="w-full max-w-xl">
          <input
            type="text"
            value={activeTab?.inputValue || ''}
            onChange={e => updateActiveTab({ inputValue: e.target.value })}
            className="w-full px-5 py-3 text-lg rounded-full border-2 border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search Google or type a URL"
            autoFocus
          />
        </form>
      </div>
    );
    
    if (!activeTab) {
        return <div className="w-full h-full bg-gray-200">Loading tabs...</div>;
    }

    return (
      <div className="w-full h-full flex flex-col bg-gray-200 text-black">
        <div className="flex-shrink-0 bg-gray-300 flex items-end pt-1">
            {tabs.map(tab => (
                <div
                    key={tab.id}
                    onClick={() => handleSwitchTab(tab.id)}
                    className={`flex items-center max-w-[220px] h-9 -mb-px border-t border-l border-r ${activeTabId === tab.id ? 'bg-gray-200 border-gray-400 rounded-t-lg' : 'bg-gray-300 border-transparent hover:bg-gray-400/50 rounded-t-md'}`}
                >
                    <div className="flex items-center pl-3 pr-2 py-2 cursor-pointer grow shrink min-w-0">
                      <span className="truncate text-sm select-none">{tab.title}</span>
                    </div>
                    <button onClick={(e) => handleCloseTab(e, tab.id)} className="p-1 mr-1 rounded-full hover:bg-red-500 hover:text-white shrink-0">
                        <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
            <button onClick={handleAddTab} className="p-1 ml-1 mb-1 rounded-md hover:bg-gray-400/50">
                <PlusIcon className="w-5 h-5" />
            </button>
        </div>
        <div className="flex-shrink-0 p-1.5 bg-gray-200 flex items-center gap-1 border-b border-gray-300">
            <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-300 text-gray-700"><ChevronLeftIcon /></button>
            <button onClick={handleForward} className="p-2 rounded-full hover:bg-gray-300 text-gray-700"><ChevronRightIcon /></button>
            <button onClick={handleRefresh} className="p-2 rounded-full hover:bg-gray-300 text-gray-700"><ReloadIcon /></button>
            <button onClick={handleHome} className="p-2 rounded-full hover:bg-gray-300 text-gray-700"><HomeIcon /></button>
            <form onSubmit={handleNavigate} className="flex-grow">
                <input
                    type="text"
                    value={activeTab?.inputValue || ''}
                    onChange={e => updateActiveTab({ inputValue: e.target.value })}
                    className="w-full px-4 py-1.5 rounded-full border bg-white border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </form>
        </div>
        <div className="flex-grow relative bg-white">
          {tabs.map(tab => (
            <div key={tab.id} className="w-full h-full" style={{ display: activeTabId === tab.id ? 'block' : 'none' }}>
              {tab.url === HOME_PAGE
                ? <NewTabPage />
                : <iframe
                    ref={el => (iframeRefs.current[tab.id] = el)}
                    src={tab.url}
                    className="w-full h-full border-none"
                    title="Browser"
                    sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                  />
              }
            </div>
          ))}
        </div>
      </div>
    );
};

const useDebounce = <T,>(value: T, delay: number): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    return debouncedValue;
};

export const FileExplorerApp: React.FC<Partial<AppProps>> = ({ fs, setFs, openApp }) => {
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNode, setSelectedNode] = useState<FSNode | null>(null);
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    
    if (!fs || !setFs || !openApp) return <div className="p-4">Loading file system...</div>;
    
    const handleNavigate = (folderName: string) => {
        setSearchQuery('');
        setCurrentPath(prev => [...prev, folderName]);
        setSelectedNode(null);
    };
    const handleBack = () => {
        setSearchQuery('');
        setCurrentPath(prev => prev.slice(0, -1));
        setSelectedNode(null);
    };

    const handleOpenFile = (file: FileNode) => {
        const extension = file.name.split('.').pop();
        let fileData: FileData = file;
        let appId = 'notepad';

        if (extension === 'doc' || extension === 'docx') {
            appId = 'maxfraOfficeSuite';
            fileData = { ...file, subApp: 'word' };
        }
        if (extension === 'xls' || extension === 'xlsx') {
            appId = 'maxfraOfficeSuite';
            fileData = { ...file, subApp: 'excel' };
        }
        openApp(appId, fileData);
    };

    const searchResults = useMemo(() => {
        if (!debouncedSearchQuery) return [];
        const results: {node: FSNode, path: string[]}[] = [];
        const search = (directory: DirectoryNode, path: string[]) => {
            for (const child of directory.children) {
                if (child.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) {
                    results.push({ node: child, path: [...path, directory.name] });
                }
                if (child.type === 'directory') {
                    search(child, [...path, directory.name]);
                }
            }
        };
        const currentDirectory = findNodeByPath(fs, currentPath) || fs as DirectoryNode;
        if (currentDirectory.type === 'directory') {
            search(currentDirectory, []);
        }
        return results;
    }, [debouncedSearchQuery, fs, currentPath]);

    const handleSearchResultClick = (result: {node: FSNode, path: string[]}) => {
        if (result.node.type === 'directory') {
            const relativePath = result.path.slice(currentPath.length + 1);
            setCurrentPath([...currentPath, ...relativePath, result.node.name]);
            setSearchQuery('');
        } else {
            handleOpenFile(result.node as FileNode);
        }
    }
    
    const handleDelete = (nodeToDelete: FSNode) => {
        if (nodeToDelete.type !== 'file' || !setFs) return;
        
        if (window.confirm(`Are you sure you want to move '${nodeToDelete.name}' to the Recycle Bin?`)) {
            setFs(fs => {
                const newFs = JSON.parse(JSON.stringify(fs));
                if (newFs.type !== 'directory') return fs;

                const parentDir = findNodeByPath(newFs, currentPath);
                if (!parentDir) return fs;

                const nodeIndex = parentDir.children.findIndex(c => c.name === nodeToDelete.name);
                if (nodeIndex === -1) return fs;

                const [removedNode] = parentDir.children.splice(nodeIndex, 1) as [FileNode];
                removedNode.originalPath = currentPath;

                const recycleBinDir = findOrCreateDirectoryByPath(newFs, ['Recycle Bin']);
                recycleBinDir.children.push(removedNode);

                return newFs;
            });
            setSelectedNode(null);
        }
    };

    const currentDirectory = findNodeByPath(fs, currentPath) || fs as DirectoryNode;
    const itemsToDisplay = debouncedSearchQuery ? [] : (currentDirectory.type === 'directory' ? currentDirectory.children : []);

    return (
        <div className="w-full h-full flex flex-col bg-white text-black">
            <div className="flex items-center p-2 bg-gray-100 border-b gap-2 flex-wrap">
                <button onClick={handleBack} disabled={currentPath.length === 0} className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50">Back</button>
                 <button 
                    onClick={() => selectedNode && handleDelete(selectedNode)}
                    disabled={!selectedNode || selectedNode.type !== 'file'} 
                    className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50 disabled:bg-gray-400 flex items-center gap-1"
                >
                    <TrashIcon className="w-4 h-4"/> Delete
                </button>
                <div className="flex-grow p-2 bg-white border rounded-sm min-w-[200px]">C:\{currentPath.join('\\')}</div>
                <input 
                    type="search"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="p-2 border rounded-sm w-full sm:w-auto"
                />
            </div>
            <div className="flex-grow p-2 overflow-y-auto" onClick={() => setSelectedNode(null)}>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                    {itemsToDisplay.map(node => (
                        <div key={node.name} className={`flex flex-col items-center p-2 rounded cursor-pointer ${selectedNode?.name === node.name ? 'bg-blue-200 ring-2 ring-blue-500' : 'hover:bg-blue-100'}`}
                            onClick={(e) => { e.stopPropagation(); setSelectedNode(node); }}
                            onDoubleClick={() => node.type === 'directory' ? handleNavigate(node.name) : handleOpenFile(node as FileNode)}>
                            {node.type === 'directory' ? <FolderIcon /> : <FileIcon />}
                            <span className="text-xs mt-1 text-center break-all">{node.name}</span>
                        </div>
                    ))}
                     {searchResults.map((result, index) => (
                        <div key={`${result.node.name}-${index}`} className="flex flex-col items-center p-2 rounded hover:bg-green-100 cursor-pointer"
                            onDoubleClick={() => handleSearchResultClick(result)}>
                            {result.node.type === 'directory' ? <FolderIcon /> : <FileIcon />}
                            <span className="text-xs mt-1 text-center break-all">{result.node.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const SettingsApp: React.FC<Partial<AppProps>> = () => {
    const [currentBg, setCurrentBg] = useState(() => {
        try { return localStorage.getItem('maxfra-os-background') || 'default' }
        catch { return 'default' }
    });

    const handleBgChange = (bgId: string) => {
        try {
            localStorage.setItem('maxfra-os-background', bgId);
            setCurrentBg(bgId);
            window.dispatchEvent(new StorageEvent('storage', { key: 'maxfra-os-background', newValue: bgId }));
        } catch (e) {
            console.error("Could not set background in localStorage", e);
        }
    };
    const backgrounds = { default: 'Default Blue', sunset: 'Sunset', matrix: 'Matrix' };
    return <div className="p-6 text-black"><h3 className="text-2xl font-bold mb-4">Background</h3><div className="grid grid-cols-3 gap-4">{Object.entries(backgrounds).map(([id, name]) => <div key={id}><button onClick={() => handleBgChange(id)} className={`w-full h-24 rounded border-4 ${currentBg === id ? 'border-blue-500' : 'border-transparent'}`} style={{background: `var(--bg-${id})`}}/> <p className="text-center mt-2">{name}</p></div>)}</div><div className="mt-12 p-4 bg-gray-100 rounded-lg"><h4 className="font-bold">About</h4><p className="text-sm">Maxfra Academy OS - (c) Patrick Blanks - All Rights reserved.</p></div></div>;
};
export const CalculatorApp: React.FC<Partial<AppProps>> = () => { /* Unchanged */ return <div>Calculator</div>; };

// --- Calendar / Appointment Book App ---

const APPOINTMENTS_FILE_PATH = ['system'];
const APPOINTMENTS_FILE_NAME = 'maxfra-appointments.json';
const STUDENTS_FILE_NAME = 'maxfra-students.json';
const LOCATIONS = ['Perisur', 'Cd Brisas', 'Polanco'] as const;
const TEACHERS = ['Fernando', 'Maggi', 'Rosi'] as const;
const COURSES = ['Microblading', 'Eyelash Extensions', 'Hena', 'Lash Lifting'] as const;
const SPECIALS = ['Pickup Diploma', 'Information'] as const;
const COURSE_CAPACITY = 4;
type Location = typeof LOCATIONS[number];
type Teacher = typeof TEACHERS[number];
type Course = typeof COURSES[number];
type Special = typeof SPECIALS[number];

interface Appointment {
  id: string;
  location: Location;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  studentId: string;
  teacher: Teacher;
  type: 'Course' | 'Special';
  details: Course | Special;
}

interface GroupedAppointment {
    time: string;
    details: Course | Special;
    type: 'Course' | 'Special';
    students: { id: string, name: string }[];
    teacher: Teacher;
}


const formatDateKey = (date: Date): string => date.toISOString().slice(0, 10);

export const CalendarApp: React.FC<Partial<AppProps>> = ({ fs, setFs }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [currentView, setCurrentView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedLocation, setSelectedLocation] = useState<Location>(LOCATIONS[0]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    useEffect(() => {
        if (!fs) return;
        const dir = findNodeByPath(fs, APPOINTMENTS_FILE_PATH);
        const appointmentsFile = dir?.children.find(f => f.name === APPOINTMENTS_FILE_NAME && f.type === 'file') as FileNode | undefined;
        if (appointmentsFile) {
            try { setAppointments(JSON.parse(appointmentsFile.content)); } 
            catch (e) { console.error("Failed to parse appointments file", e); }
        }
        const studentsFile = dir?.children.find(f => f.name === STUDENTS_FILE_NAME && f.type === 'file') as FileNode | undefined;
        if (studentsFile) {
            try { setStudents(JSON.parse(studentsFile.content)); } 
            catch (e) { console.error("Failed to parse students file", e); }
        }
    }, [fs]);

    const studentsById = useMemo(() => {
        return students.reduce((acc, student) => {
            acc[student.id] = student;
            return acc;
        }, {} as Record<string, Student>);
    }, [students]);

    const saveAppointments = useCallback((newAppointments: Appointment[]) => {
        if (!setFs) return;
        setAppointments(newAppointments);
        setFs(currentFs => saveFileToFS(currentFs, APPOINTMENTS_FILE_PATH, APPOINTMENTS_FILE_NAME, JSON.stringify(newAppointments, null, 2)));
    }, [setFs]);
    
    const generateWhatsAppMessage = () => {
        let text = `*Maxfra Appointments for ${selectedLocation}*\n`;
        const dateKey = formatDateKey(currentDate)
        text += `*${currentDate.toLocaleDateString('en-CA')}*\n\n`;
        const dailyAppointments = appointments.filter(a => a.date === dateKey && a.location === selectedLocation);

        if (dailyAppointments.length > 0) {
            const groupedByTime = dailyAppointments.reduce((acc: Record<string, GroupedAppointment>, curr) => {
                const key = `${curr.time}-${curr.details}-${curr.teacher}`;
                if (!acc[key]) {
                    acc[key] = {
                        time: curr.time,
                        details: curr.details,
                        type: curr.type,
                        students: [],
                        teacher: curr.teacher
                    };
                }
                const student = studentsById[curr.studentId];
                if (student) {
                    acc[key].students.push({ id: student.id, name: `${student.firstName} ${student.paternalLastName}` });
                }
                return acc;
            }, {} as Record<string, GroupedAppointment>);
            
            (Object.values(groupedByTime) as GroupedAppointment[]).sort((a,b) => a.time.localeCompare(b.time)).forEach(app => {
                text += `*${app.time}*: ${app.details} with ${app.teacher}\n`;
                const studentNames = app.students.map(s => s.name).join(', ');
                text += `  - Students: ${studentNames}\n\n`;
            });
        } else {
            text += `No appointments scheduled for this day at ${selectedLocation}.`;
        }


        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <div className="w-full h-full flex flex-col bg-gray-50 text-black text-sm select-none">
            <header className="flex-shrink-0 p-3 bg-white border-b flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-4">
                    <div>
                        {['daily', 'weekly', 'monthly'].map(view => (
                            <button key={view} onClick={() => setCurrentView(view as any)} className={`px-4 py-2 capitalize rounded-md ${currentView === view ? 'bg-blue-600 text-white' : 'hover:bg-gray-200'}`}>{view}</button>
                        ))}
                    </div>
                     <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value as Location)} className="p-2 border rounded-md bg-white">
                        {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600">New Appointment</button>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={generateWhatsAppMessage} className="p-2 rounded-full hover:bg-gray-200" title="Share on WhatsApp">
                        <WhatsAppIcon className="w-6 h-6"/>
                    </button>
                    <div className="flex items-center gap-2">
                         <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 rounded-full hover:bg-gray-200"><ChevronLeftIcon/></button>
                         <span className="font-semibold w-32 text-center">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                         <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 rounded-full hover:bg-gray-200"><ChevronRightIcon/></button>
                    </div>
                </div>
            </header>
            <main className="flex-grow p-4 overflow-auto">
                {currentView === 'monthly' && <MonthlyView date={currentDate} setDate={setCurrentDate} setView={setCurrentView} appointments={appointments} location={selectedLocation} />}
                {currentView === 'daily' && <DailyView date={currentDate} appointments={appointments} studentsById={studentsById} location={selectedLocation} />}
                {currentView === 'weekly' && <WeeklyView date={currentDate} setDate={setCurrentDate} setView={setCurrentView} appointments={appointments} studentsById={studentsById} location={selectedLocation} />}
            </main>
            {isModalOpen && <AppointmentModal onClose={() => setIsModalOpen(false)} save={saveAppointments} appointments={appointments} students={students} date={currentDate} location={selectedLocation} />}
        </div>
    );
};

const MonthlyView = ({ date, setDate, setView, appointments, location }: { date: Date, setDate: (d: Date) => void, setView: (v: 'daily') => void, appointments: Appointment[], location: Location }) => {
    const calendarGrid = useMemo(() => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const grid: (Date | null)[] = Array(firstDay).fill(null);
        for (let i = 1; i <= daysInMonth; i++) grid.push(new Date(year, month, i));
        return grid;
    }, [date]);
    
    return (
        <>
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-600">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2 mt-2">
                {calendarGrid.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} className="border rounded-lg bg-gray-50"></div>;
                    const dayKey = formatDateKey(day);
                    const dayAppointments = appointments.filter(a => a.date === dayKey && a.location === location);
                    return (
                        <div key={dayKey} onClick={() => { setDate(day); setView('daily'); }} className="h-28 border rounded-lg p-2 cursor-pointer hover:bg-blue-50 transition-colors">
                             <span className={`font-semibold ${formatDateKey(new Date()) === dayKey ? 'text-blue-600' : ''}`}>{day.getDate()}</span>
                            {dayAppointments.length > 0 && <div className="mt-1 text-xs text-blue-700">{dayAppointments.length} appointments</div>}
                        </div>
                    );
                })}
            </div>
        </>
    );
};

const DailyView = ({ date, appointments, studentsById, location }: { date: Date, appointments: Appointment[], studentsById: Record<string, Student>, location: Location }) => {
    const timeSlots = Array.from({ length: 11 }, (_, i) => `${i + 10}:00`); // 10:00 to 20:00
    const dailyAppointments = appointments.filter(a => a.date === formatDateKey(date) && a.location === location);

    const groupedAppointments = dailyAppointments.reduce<Record<string, GroupedAppointment[]>>((acc, app) => {
        const time = app.time;
        const key = `${app.time}-${app.details}-${app.teacher}`;
        
        if (!acc[time]) acc[time] = [];

        let group = acc[time].find(g => g.details === app.details && g.teacher === app.teacher);

        if (!group) {
            group = {
                time: app.time,
                details: app.details,
                type: app.type,
                teacher: app.teacher,
                students: []
            };
            acc[time].push(group);
        }
        
        const student = studentsById[app.studentId];
        if (student) {
            group.students.push({ id: student.id, name: `${student.firstName} ${student.paternalLastName}`});
        }
        return acc;
    }, {});


    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">{date.toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h1>
            <div className="space-y-2">
                {timeSlots.map(time => (
                    <div key={time} className="flex min-h-[60px]">
                        <div className="w-20 text-right pr-4 pt-1 text-gray-500">{time}</div>
                        <div className="flex-grow border-t border-gray-200 pt-2 space-y-2">
                            {(groupedAppointments[time] || []).map((app, index) => (
                                <div key={index} className={`p-3 rounded-lg text-xs relative border-l-4 ${app.type === 'Course' ? 'bg-blue-50 border-blue-500' : 'bg-green-50 border-green-500'}`}>
                                    <p className="font-bold text-sm text-gray-800">{app.details}</p>
                                    <p className="text-gray-600 mt-1">Teacher: {app.teacher}</p>
                                    <p className="text-gray-600 mt-1">
                                        Students {app.type === 'Course' ? `(${app.students.length}/${COURSE_CAPACITY})` : ''}: {app.students.map(s => s.name).join(', ')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const WeeklyView = ({ date, setDate, setView, appointments, studentsById, location }: { date: Date, setDate: (d: Date) => void, setView: (v: 'daily') => void, appointments: Appointment[], studentsById: Record<string, Student>, location: Location }) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        return day;
    });

    return (
        <div className="grid grid-cols-5 h-full">
            {weekDays.filter(d => d.getDay() >= 2 && d.getDay() <= 6).map(day => {
                const dayKey = formatDateKey(day);
                const dayAppointments = appointments.filter(a => a.date === dayKey && a.location === location).sort((a, b) => a.time.localeCompare(b.time));
                return (
                    <div key={dayKey} className="border-r p-2 bg-white hover:bg-gray-50 transition-colors" onClick={() => { setDate(day); setView('daily'); }}>
                        <h3 className="font-bold text-center">{day.toLocaleDateString('default', { weekday: 'short' })} {day.getDate()}</h3>
                        <div className="mt-2 space-y-2 overflow-y-auto h-[calc(100%-2rem)]">
                            {dayAppointments.map(app => {
                                const student = studentsById[app.studentId];
                                const studentName = student ? `${student.firstName} ${student.paternalLastName}` : 'Unknown Student';
                                return (
                                    <div key={app.id} className={`p-1.5 rounded text-xs ${app.type === 'Course' ? 'bg-blue-100' : 'bg-green-100'}`}>
                                        <p className="font-semibold">{app.time} {app.details}</p>
                                        <p className="truncate"><span className="font-medium text-gray-600">{app.teacher}:</span> {studentName}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const AppointmentModal = ({ onClose, save, appointments, students, date, location }: { onClose: () => void, save: (apps: Appointment[]) => void, appointments: Appointment[], students: Student[], date: Date, location: Location }) => {
    const [formData, setFormData] = useState({
        studentId: students[0]?.id || '',
        location: location,
        type: 'Course' as 'Course' | 'Special',
        details: COURSES[0] as Course | Special,
        teacher: TEACHERS[0],
        date: formatDateKey(date),
        time: '10:00'
    });

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.studentId) {
            alert("Please select a student.");
            return;
        }

        const appDate = new Date(`${formData.date}T00:00:00`);
        const dayOfWeek = appDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 1) { // Sunday or Monday
            alert("Appointments can only be booked from Tuesday to Saturday.");
            return;
        }

        if (formData.type === 'Course') {
            const existing = appointments.filter(a =>
                a.location === formData.location &&
                a.date === formData.date &&
                a.time === formData.time &&
                a.teacher === formData.teacher &&
                a.details === formData.details
            ).length;
            if (existing >= COURSE_CAPACITY) {
                alert(`This course slot is full (${existing}/${COURSE_CAPACITY}).`);
                return;
            }
        }
        
        const newAppointment: Appointment = { id: Date.now().toString(), ...formData };
        save([...appointments, newAppointment]);
        onClose();
    };

    const detailOptions = formData.type === 'Course' ? COURSES : SPECIALS;
    
    useEffect(() => {
        setFormData(f => ({ ...f, details: detailOptions[0] }));
    }, [formData.type]);

    return (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg text-black w-full max-w-lg">
                <h2 className="text-xl font-bold mb-4">New Appointment</h2>
                <form onSubmit={handleAdd} className="space-y-4">
                     <select value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} required className="w-full p-2 border rounded">
                        <option value="" disabled>Select a student</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.paternalLastName}</option>)}
                    </select>
                    <select value={formData.location} onChange={e => setFormData({...formData, location: e.target.value as any})} className="w-full p-2 border rounded">{LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}</select>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full p-2 border rounded"><option value="Course">Course</option><option value="Special">Special</option></select>
                    <select value={formData.details} onChange={e => setFormData({...formData, details: e.target.value as any})} className="w-full p-2 border rounded">{detailOptions.map(d => <option key={d} value={d}>{d}</option>)}</select>
                    <select value={formData.teacher} onChange={e => setFormData({...formData, teacher: e.target.value as any})} className="w-full p-2 border rounded">{TEACHERS.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    <div className="flex gap-4">
                        <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required className="w-1/2 p-2 border rounded" />
                        <input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} required min="10:00" max="20:00" step="3600" className="w-1/2 p-2 border rounded" />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">Add</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export const ClipCalculatorApp: React.FC<Partial<AppProps>> = () => {
    const [amount, setAmount] = useState('');
    const [paymentType, setPaymentType] = useState<'contado' | 'msi'>('contado');
    const [cardType, setCardType] = useState<'visa_mc' | 'amex'>('visa_mc');
    const [msiMonths, setMsiMonths] = useState<3 | 6 | 9 | 12>(3);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (/^\d*\.?\d{0,2}$/.test(value)) {
            setAmount(value);
        }
    };

    const IVA_RATE = 0.16;
    const CONTADO_RATE = 0.036;

    const MSI_RATES = {
        visa_mc: { 3: 0.045, 6: 0.075, 9: 0.115, 12: 0.125 },
        amex:    { 3: 0.075, 6: 0.099, 9: 0.139, 12: 0.159 }
    };

    const parsedAmount = parseFloat(amount) || 0;
    let commissionRate = 0;

    if (paymentType === 'contado') {
        commissionRate = CONTADO_RATE;
    } else {
        commissionRate = MSI_RATES[cardType][msiMonths];
    }
    
    const commission = parsedAmount * commissionRate;
    const ivaOnCommission = commission * IVA_RATE;
    const totalCommission = commission + ivaOnCommission;
    const amountToReceive = parsedAmount - totalCommission;
    const clientPaysTotal = parsedAmount + (paymentType === 'msi' ? totalCommission : 0);
    const clientPaysMonthly = clientPaysTotal / msiMonths;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
    };

    return (
        <div className="w-full h-full bg-gray-50 text-black flex flex-col items-center p-6 overflow-y-auto">
            <header className="w-full max-w-md text-center">
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/81/Logo_de_Clip.svg" alt="Clip Logo" className="w-20 h-20 mx-auto mb-4"/>
                <h1 className="text-2xl font-bold text-gray-800">Calculadora de Comisiones</h1>
            </header>

            <main className="w-full max-w-md mt-6">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-2xl text-gray-500">$</span>
                    <input type="text" value={amount} onChange={handleAmountChange} placeholder="0.00" className="w-full text-5xl font-light text-center p-4 pl-10 border-0 border-b-2 border-gray-300 focus:border-blue-500 focus:ring-0 transition bg-transparent" autoFocus/>
                </div>

                <div className="mt-6">
                    <div className="flex bg-gray-200 rounded-lg p-1">
                        <button onClick={() => setPaymentType('contado')} className={`w-1/2 p-2 rounded-md font-semibold text-center transition ${paymentType === 'contado' ? 'bg-white shadow' : 'text-gray-600'}`}>De contado</button>
                        <button onClick={() => setPaymentType('msi')} className={`w-1/2 p-2 rounded-md font-semibold text-center transition ${paymentType === 'msi' ? 'bg-white shadow' : 'text-gray-600'}`}>Meses sin Intereses</button>
                    </div>
                </div>

                {paymentType === 'msi' && (
                    <div className="mt-4 animate-fade-in">
                         <div className="flex border border-gray-300 rounded-lg p-1">
                             <button onClick={() => setCardType('visa_mc')} className={`w-1/2 p-2 rounded-md text-center transition flex items-center justify-center gap-2 ${cardType === 'visa_mc' ? 'bg-gray-200' : ''}`}>
                                 <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg" alt="Mastercard" className="h-5"/>
                                 <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4"/>
                             </button>
                             <button onClick={() => setCardType('amex')} className={`w-1/2 p-2 rounded-md text-center transition flex items-center justify-center ${cardType === 'amex' ? 'bg-gray-200' : ''}`}>
                                 <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" alt="American Express" className="h-5"/>
                             </button>
                         </div>
                         <div className="grid grid-cols-4 gap-2 mt-4">
                            {[3, 6, 9, 12].map(months => (
                                <button key={months} onClick={() => setMsiMonths(months as 3|6|9|12)} className={`p-3 rounded-lg font-semibold text-center transition ${msiMonths === months ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                    {months} <span className="text-xs">meses</span>
                                </button>
                            ))}
                         </div>
                    </div>
                )}

                {parsedAmount > 0 && (
                    <div className="mt-8 bg-blue-600 text-white rounded-lg p-6 shadow-lg animate-fade-in">
                        <div className="flex justify-between items-center text-lg">
                            <span>Tu cobro</span>
                            <span className="font-semibold">{formatCurrency(parsedAmount)}</span>
                        </div>
                        {paymentType === 'msi' && (
                            <div className="mt-3 text-blue-100">
                                <div className="flex justify-between items-center text-sm">
                                    <span>El cliente paga</span>
                                    <span className="font-semibold">{formatCurrency(clientPaysTotal)}</span>
                                </div>
                                <div className="text-right text-xs">({msiMonths} pagos de {formatCurrency(clientPaysMonthly)})</div>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-sm mt-3 text-blue-200">
                            <span>Comisión Clip ({ (commissionRate * 100).toFixed(2) }% + IVA)</span>
                            <span>- {formatCurrency(totalCommission)}</span>
                        </div>
                        <hr className="my-4 border-blue-500" />
                        <div className="flex justify-between items-center text-xl">
                            <span className="font-bold">Recibes en tu cuenta</span>
                            <span className="font-bold">{formatCurrency(amountToReceive)}</span>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

// --- Student Database App ---
const SignaturePad = React.forwardRef<HTMLCanvasElement, { width: number, height: number, onEnd: (dataUrl: string) => void, initialData?: string }>(({ width, height, onEnd, initialData }, ref) => {
    const internalRef = useRef<HTMLCanvasElement>(null);
    React.useImperativeHandle(ref, () => internalRef.current!);
    
    const isDrawing = useRef(false);
    const lastPos = useRef<{x: number, y: number} | null>(null);
    
    const getPos = (e: MouseEvent | TouchEvent) => {
        const canvas = internalRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    }

    const draw = (e: MouseEvent | TouchEvent) => {
        if (!isDrawing.current) return;
        e.preventDefault(); // prevent scrolling on touch devices
        const canvas = internalRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;
        
        const pos = getPos(e);
        if (pos && lastPos.current) {
            ctx.beginPath();
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            lastPos.current = pos;
        }
    }
    
    const startDrawing = (e: MouseEvent | TouchEvent) => {
        isDrawing.current = true;
        lastPos.current = getPos(e);
    };

    const stopDrawing = () => {
        isDrawing.current = false;
        lastPos.current = null;
        if (internalRef.current) {
            onEnd(internalRef.current.toDataURL());
        }
    };
    
    useEffect(() => {
        const canvas = internalRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Clear canvas before drawing new initial data or if data is cleared
        ctx.clearRect(0, 0, width, height);

        if(initialData) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0);
            img.src = initialData;
        }

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);

        return () => {
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove', draw);
            canvas.removeEventListener('mouseup', stopDrawing);
            canvas.removeEventListener('mouseleave', stopDrawing);
            canvas.removeEventListener('touchstart', startDrawing);
            canvas.removeEventListener('touchmove', draw);
            canvas.removeEventListener('touchend', stopDrawing);
        };
    }, [initialData, width, height]);
    
    return <canvas ref={internalRef} width={width} height={height} className="bg-gray-100 border border-gray-400 rounded-md touch-none" />;
});


const emptyStudent: Omit<Student, 'id'> = { firstName: '', paternalLastName: '', maternalLastName: '', mobilePhone: ''};

export const StudentDatabaseApp: React.FC<Partial<AppProps>> = ({ fs, setFs }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<Student, 'id'>>(emptyStudent);
    const [searchQuery, setSearchQuery] = useState('');
    const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        if (!fs) return;
        const dir = findNodeByPath(fs, APPOINTMENTS_FILE_PATH);
        const file = dir?.children.find(f => f.name === STUDENTS_FILE_NAME && f.type === 'file') as FileNode | undefined;
        if (file) {
            try { setStudents(JSON.parse(file.content)); } 
            catch { console.error("Failed to parse students file"); }
        }
    }, [fs]);
    
    useEffect(() => {
        const selected = students.find(s => s.id === selectedStudentId);
        setFormData(selected || emptyStudent);
    }, [selectedStudentId, students]);

    const handleSave = () => {
        if (!setFs) return;
        if (!formData.firstName || !formData.paternalLastName || !formData.mobilePhone) {
            alert("First Name, Paternal Last Name, and Mobile Phone are required.");
            return;
        }
        
        let updatedStudents: Student[];
        if (selectedStudentId && selectedStudentId !== 'new') {
            updatedStudents = students.map(s => s.id === selectedStudentId ? { ...formData, id: selectedStudentId } : s);
        } else {
            const newStudent: Student = { ...formData, id: `student-${Date.now()}` };
            updatedStudents = [...students, newStudent];
            setSelectedStudentId(newStudent.id);
        }
        setStudents(updatedStudents);
        setFs(currentFs => saveFileToFS(currentFs, APPOINTMENTS_FILE_PATH, STUDENTS_FILE_NAME, JSON.stringify(updatedStudents, null, 2)));
        alert("Student saved successfully!");
    };
    
    const handleNewStudent = () => {
        setSelectedStudentId('new');
        setFormData(emptyStudent);
    }
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleClearSignature = () => {
        const canvas = signatureCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        setFormData(f => ({ ...f, signature: undefined }));
    };

    const filteredStudents = students.filter(s => 
        `${s.firstName} ${s.paternalLastName} ${s.maternalLastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const FormSection: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
        <fieldset className="border p-4 rounded-md mt-4">
            <legend className="px-2 font-semibold text-lg">{title}</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
        </fieldset>
    );
    const FormInput: React.FC<{label: string, name: keyof Student, value: any, required?: boolean}> = ({label, name, value, required=false}) => (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input type="text" name={name} value={value || ''} onChange={handleFormChange} required={required} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
        </div>
    )

    return (
        <div className="w-full h-full flex bg-gray-200 text-black">
            <aside className="w-1/3 flex flex-col bg-gray-50 border-r">
                <div className="p-2 border-b">
                    <input type="search" placeholder="Search students..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full p-2 border rounded"/>
                </div>
                <nav className="flex-grow overflow-y-auto">
                    {filteredStudents.map(student => (
                        <button key={student.id} onClick={() => setSelectedStudentId(student.id)} className={`w-full text-left px-4 py-3 ${selectedStudentId === student.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}>
                            {student.firstName} {student.paternalLastName}
                        </button>
                    ))}
                </nav>
                <div className="p-2 border-t">
                    <button onClick={handleNewStudent} className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded hover:bg-green-600">New Student</button>
                </div>
            </aside>
            <main className="w-2/3 p-4 overflow-y-auto">
                {selectedStudentId ? (
                    <div>
                        <FormSection title="Solicitud de Inscripción">
                            <FormInput label="Curso" name="course" value={formData.course} />
                            <FormInput label="Duración del Curso" name="courseDuration" value={formData.courseDuration} />
                            <FormInput label="Total de Clases" name="totalClasses" value={formData.totalClasses} />
                            <FormInput label="Fecha de Inicio" name="startDate" value={formData.startDate} />
                            <FormInput label="Fin de Curso" name="endDate" value={formData.endDate} />
                            <FormInput label="Fecha de Inscripción" name="registrationDate" value={formData.registrationDate} />
                            <FormInput label="Costo de Inscripción" name="registrationCost" value={formData.registrationCost} />
                            <FormInput label="Costo total del curso" name="totalCost" value={formData.totalCost} />
                            <FormInput label="Colegiatura Mensual" name="monthlyPayment" value={formData.monthlyPayment} />
                            <FormInput label="Pago de contado" name="cashPayment" value={formData.cashPayment} />
                            <FormInput label="Anticipo pago de contado" name="downPayment" value={formData.downPayment} />
                            <FormInput label="Fecha pago y restante" name="paymentDate" value={formData.paymentDate} />
                        </FormSection>
                        <FormSection title="Datos Alumna/o">
                             <FormInput label="Nombre(s)" name="firstName" value={formData.firstName} required/>
                             <FormInput label="Apellido Paterno" name="paternalLastName" value={formData.paternalLastName} required/>
                             <FormInput label="Apellido Materno" name="maternalLastName" value={formData.maternalLastName} />
                             <FormInput label="Fecha de Nacimiento" name="dob" value={formData.dob} />
                             <FormInput label="Nacionalidad" name="nationality" value={formData.nationality} />
                             <FormInput label="Sexo" name="sex" value={formData.sex} />
                             <FormInput label="Vacuna COVID-19" name="covidVaccine" value={formData.covidVaccine} />
                             <FormInput label="CURP" name="curp" value={formData.curp} />
                             <FormInput label="Domicilio (Calle y número)" name="addressStreet" value={formData.addressStreet} />
                             <FormInput label="Colonia" name="addressColonia" value={formData.addressColonia} />
                             <FormInput label="Delegación" name="addressDelegacion" value={formData.addressDelegacion} />
                             <FormInput label="C.P." name="addressCp" value={formData.addressCp} />
                             <FormInput label="Profesión" name="profession" value={formData.profession} />
                             <FormInput label="Nivel Máximo de estudios" name="educationLevel" value={formData.educationLevel} />
                             <FormInput label="Teléfono Particular" name="homePhone" value={formData.homePhone} />
                             <FormInput label="Móvil Whatsapp" name="mobilePhone" value={formData.mobilePhone} required/>
                             <FormInput label="Enfermedad o alergias" name="allergies" value={formData.allergies} />
                        </FormSection>
                        <FormSection title="Datos en Caso de Emergencia">
                            <FormInput label="Nombre Completo" name="emergencyContactName" value={formData.emergencyContactName} />
                            <FormInput label="Parentesco" name="emergencyContactRelationship" value={formData.emergencyContactRelationship} />
                            <FormInput label="Teléfono" name="emergencyContactMobilePhone" value={formData.emergencyContactMobilePhone} />
                        </FormSection>
                         <FormSection title="Firma de Alumna/o">
                             <div className="col-span-full">
                                 <SignaturePad ref={signatureCanvasRef} width={500} height={200} onEnd={(sig) => setFormData(f => ({...f, signature: sig}))} initialData={formData.signature}/>
                                 <button onClick={handleClearSignature} className="mt-2 px-3 py-1 bg-gray-300 rounded text-black">Clear</button>
                             </div>
                        </FormSection>
                        <button onClick={handleSave} className="mt-6 w-full bg-blue-600 text-white font-bold py-3 px-4 rounded hover:bg-blue-700">Save Student</button>
                    </div>
                ) : <div className="text-center text-gray-500 mt-20">Select a student or create a new one.</div>}
            </main>
        </div>
    )
};


// --- Sandy AI Chatbot ---

const SandyAvatar = () => (
    <div className="w-12 h-12 rounded-full flex-shrink-0 bg-gradient-to-br from-blue-500 to-pink-500 p-0.5 animate-pulse-slow shadow-lg">
      <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-10 h-10">
          <defs>
            <linearGradient id="sandy-face" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a7c5eb"/>
                <stop offset="100%" stopColor="#fbc2eb"/>
            </linearGradient>
            <radialGradient id="sandy-eye-grad">
                <stop offset="30%" stopColor="#fff" />
                <stop offset="100%" stopColor="#ddd" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#sandy-face)" />
          <circle cx="35" cy="45" r="5" fill="url(#sandy-eye-grad)" />
          <circle cx="65" cy="45" r="5" fill="url(#sandy-eye-grad)" />
          <path d="M 35 65 Q 50 75 65 65" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <style>{`
            @keyframes sandy-breath {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.03); }
            }
            .sandy-breath {
              animation: sandy-breath 4s ease-in-out infinite;
            }
          `}</style>
          <g className="sandy-breath" style={{ transformOrigin: '50% 50%' }}>
            <circle cx="50" cy="50" r="45" fill="transparent" />
          </g>
        </svg>
      </div>
    </div>
);

type Message = {
    role: 'user' | 'model';
    text: string;
};

export const SandyAiApp: React.FC<Partial<AppProps>> = () => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: "Hello! I'm Sandy, your AI assistant. How can I help you today?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const ai = useMemo(() => new GoogleGenerativeAI(process.env.API_KEY as string), []);

    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        
        const userMessage: Message = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const contents = messages.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            }));
            contents.push({ role: 'user', parts: [{ text: input }] });

            const model = ai.getGenerativeModel({
                model: 'gemini-2.0-flash-exp',
                tools: [{ googleSearch: {} }]
            });

            const response = await model.generateContent({
                contents
            });

            const modelMessage: Message = { role: 'model', text: response.response.text() };
            setMessages(prev => [...prev, modelMessage]);

        } catch (err) {
            console.error(err);
            setError("Sorry, I encountered an error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-gray-800 text-white">
            <header className="flex-shrink-0 p-3 bg-gray-900 border-b border-gray-700 text-center">
                <h1 className="text-lg font-semibold">Chat with Sandy</h1>
            </header>
            <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && <SandyAvatar />}
                        <div className={`max-w-md lg:max-w-2xl px-4 py-2 rounded-2xl ${msg.role === 'model' ? 'bg-blue-600 rounded-tl-none' : 'bg-gray-600 rounded-br-none'}`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3">
                        <SandyAvatar />
                        <div className="max-w-md lg:max-w-2xl px-4 py-3 rounded-2xl bg-blue-600 rounded-tl-none flex items-center gap-2">
                             <span className="w-2 h-2 bg-blue-200 rounded-full animate-pulse-fast [animation-delay:-0.3s]"></span>
                             <span className="w-2 h-2 bg-blue-200 rounded-full animate-pulse-fast [animation-delay:-0.15s]"></span>
                             <span className="w-2 h-2 bg-blue-200 rounded-full animate-pulse-fast"></span>
                        </div>
                    </div>
                )}
                 {error && <div className="text-red-400 text-center py-2">{error}</div>}
            </div>
            <div className="flex-shrink-0 p-3 bg-gray-900 border-t border-gray-700">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask Sandy anything..."
                        disabled={isLoading}
                        className="flex-grow w-full px-4 py-2 bg-gray-700 rounded-full border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="p-2 bg-blue-600 rounded-full hover:bg-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-90" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                    </button>
                </form>
            </div>
        </div>
    );
};


// --- Maxfra Office Suite ---

const useDocumentExecCommand = (editorRef: React.RefObject<HTMLElement>) => {
    const apply = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    }, [editorRef]);
    return apply;
};

const WordComponent: React.FC<Partial<AppProps>> = ({ file, setFs }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [currentFile, setCurrentFile] = useState(file);
    const applyFormat = useDocumentExecCommand(editorRef);
    const [showSaveModal, setShowSaveModal] = useState(false);

    const handleSave = (asNew = false) => {
        if (!currentFile || asNew) {
            setShowSaveModal(true);
        } else if (setFs && editorRef.current) {
            setFs(fs => saveFileToFS(fs, [], currentFile.name, editorRef.current!.innerHTML));
            alert("File saved!");
        }
    };

    const handleSaveFromModal = (fileName: string) => {
        if (setFs && editorRef.current) {
            const finalName = fileName.endsWith('.doc') ? fileName : `${fileName}.doc`;
            setFs(fs => saveFileToFS(fs, [], finalName, editorRef.current!.innerHTML));
            setCurrentFile({ name: finalName, content: editorRef.current!.innerHTML });
            setShowSaveModal(false);
            alert(`File saved as ${finalName}`);
        }
    };

    const handlePrint = () => {
        if (editorRef.current) {
            const printWindow = window.open('', '_blank');
            printWindow?.document.write(`<html><head><title>${currentFile?.name || 'Document'}</title></head><body>${editorRef.current.innerHTML}</body></html>`);
            printWindow?.document.close();
            printWindow?.print();
            printWindow?.close();
        }
    };

    const SaveModal = () => {
        const [name, setName] = useState(currentFile?.name || 'Untitled.doc');
        return (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-4 rounded text-black">
                    <h3 className="font-bold mb-2">Save Document</h3>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-1 border border-gray-400 rounded" />
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => setShowSaveModal(false)} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
                        <button onClick={() => handleSaveFromModal(name)} className="px-3 py-1 bg-blue-500 text-white rounded">Save</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col bg-gray-100 text-black">
            {showSaveModal && <SaveModal />}
            <div className="flex-shrink-0 p-1 bg-gray-200 flex items-center gap-2 border-b border-gray-300 flex-wrap">
                <div className="flex items-center gap-1">
                    <button onClick={() => handleSave()} className="p-2 rounded hover:bg-gray-300">Save</button>
                    <button onClick={() => handleSave(true)} className="p-2 rounded hover:bg-gray-300">Save As</button>
                    <button onClick={handlePrint} className="p-2 rounded hover:bg-gray-300">Print/PDF</button>
                </div>
                <div className="w-px h-5 bg-gray-400"></div>
                <div className="flex items-center gap-1">
                    <select onChange={e => applyFormat('fontName', e.target.value)} className="p-1 border-gray-300 rounded"><option>Arial</option><option>Verdana</option><option>Times New Roman</option></select>
                    <select onChange={e => applyFormat('fontSize', e.target.value)} className="p-1 border-gray-300 rounded">{[1,2,3,4,5,6,7].map(s => <option key={s} value={s}>{s*2+10}pt</option>)}</select>
                </div>
                <div className="w-px h-5 bg-gray-400"></div>
                 <div className="flex items-center gap-1">
                    <button onClick={() => applyFormat('bold')} className="p-2 rounded hover:bg-gray-300 font-bold">B</button>
                    <button onClick={() => applyFormat('italic')} className="p-2 rounded hover:bg-gray-300 italic">I</button>
                    <button onClick={() => applyFormat('underline')} className="p-2 rounded hover:bg-gray-300 underline">U</button>
                    <input type="color" onChange={e => applyFormat('foreColor', e.target.value)} className="w-6 h-6" title="Text Color"/>
                    <input type="color" onChange={e => applyFormat('hiliteColor', e.target.value)} className="w-6 h-6" title="Highlight Color"/>
                </div>
                <div className="w-px h-5 bg-gray-400"></div>
                 <div className="flex items-center gap-1">
                    <button onClick={() => applyFormat('justifyLeft')} className="p-2 rounded hover:bg-gray-300">L</button>
                    <button onClick={() => applyFormat('justifyCenter')} className="p-2 rounded hover:bg-gray-300">C</button>
                    <button onClick={() => applyFormat('justifyRight')} className="p-2 rounded hover:bg-gray-300">R</button>
                    <button onClick={() => applyFormat('insertUnorderedList')} className="p-2 rounded hover:bg-gray-300">UL</button>
                    <button onClick={() => applyFormat('insertOrderedList')} className="p-2 rounded hover:bg-gray-300">OL</button>
                </div>
            </div>
            <div ref={editorRef} contentEditable dangerouslySetInnerHTML={{ __html: file?.content || '' }} className="flex-grow p-8 bg-white overflow-y-auto focus:outline-none" />
        </div>
    );
};

type CellData = { value: string; style?: React.CSSProperties };
const ExcelComponent: React.FC<Partial<AppProps>> = ({ file, setFs }) => {
    const [grid, setGrid] = useState<CellData[][]>(() => {
        if (file?.content) {
            try { return JSON.parse(file.content); } catch { /* fallthrough */ }
        }
        return Array.from({ length: 100 }, () => Array(26).fill({ value: '' }));
    });
    const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
    const [currentFile, setCurrentFile] = useState(file);

    const handleCellChange = (row: number, col: number, value: string) => {
        const newGrid = grid.map(r => [...r]);
        newGrid[row][col] = { ...newGrid[row][col], value };
        setGrid(newGrid);
    };
    
    const applyStyle = (style: React.CSSProperties) => {
        const { row, col } = selectedCell;
        const newGrid = grid.map(r => [...r]);
        const currentStyle = newGrid[row][col].style || {};
        newGrid[row][col] = { ...newGrid[row][col], style: { ...currentStyle, ...style } };
        setGrid(newGrid);
    };

    const handleSave = () => {
        let fileName = currentFile?.name;
        if (!fileName) fileName = prompt("Save as:", "spreadsheet.xls") || undefined;
        if (!fileName || !setFs) return;
        
        const finalName = fileName.endsWith('.xls') ? fileName : `${fileName}.xls`;
        setFs(fs => saveFileToFS(fs, [], finalName, JSON.stringify(grid)));
        setCurrentFile({ name: finalName, content: JSON.stringify(grid) });
        alert("Spreadsheet saved!");
    };
    
    return (
        <div className="w-full h-full flex flex-col bg-gray-100 text-black text-sm">
            <div className="flex-shrink-0 p-1 bg-gray-200 flex items-center gap-2 border-b border-gray-300">
                <button onClick={handleSave} className="p-2 rounded hover:bg-gray-300">Save</button>
                <div className="w-px h-5 bg-gray-400"></div>
                <button onClick={() => applyStyle({ fontWeight: grid[selectedCell.row][selectedCell.col].style?.fontWeight === 'bold' ? 'normal' : 'bold' })} className="font-bold p-2 rounded hover:bg-gray-300">B</button>
                <button onClick={() => applyStyle({ fontStyle: grid[selectedCell.row][selectedCell.col].style?.fontStyle === 'italic' ? 'normal' : 'italic' })} className="italic p-2 rounded hover:bg-gray-300">I</button>
                <input type="color" onChange={e => applyStyle({ color: e.target.value })} title="Text Color" />
                <input type="color" onChange={e => applyStyle({ backgroundColor: e.target.value })} title="Cell Color" />
            </div>
            <div className="flex-grow overflow-auto">
                <table>
                    <thead><tr><th></th>{Array.from({length: 26}, (_, i) => <th key={i}>{String.fromCharCode(65+i)}</th>)}</tr></thead>
                    <tbody>
                        {grid.map((row, r) => <tr key={r}><th>{r+1}</th>{row.map((cell, c) => <td key={c}><input type="text" value={cell.value} style={cell.style} onFocus={() => setSelectedCell({row: r, col: c})} onChange={e => handleCellChange(r, c, e.target.value)} className={`w-full h-full px-1.5 py-1 box-border focus:outline-none ${selectedCell.row === r && selectedCell.col === c ? 'ring-2 ring-green-600' : ''}`} /></td>)}</tr>)}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const OutlookComponent: React.FC<Partial<AppProps>> = () => {
    const mockEmails = [{ id: 1, from: 'Patrick Blanks', subject: 'Welcome to Maxfra Office', body: 'This is the new Outlook clone.', date: '9:30 AM', read: false }];
    const [selectedEmail, setSelectedEmail] = useState(mockEmails[0]);
    return (
        <div className="w-full h-full flex bg-white text-black">
            <div className="w-56 bg-gray-100 p-2 border-r"><h2 className="text-lg font-bold p-2">Mail</h2></div>
            <div className="w-96 border-r">{mockEmails.map(email => <button key={email.id} onClick={() => setSelectedEmail(email)} className="w-full text-left p-3 border-b">{email.subject}</button>)}</div>
            <div className="flex-grow p-6">{selectedEmail ? <div><h1 className="text-2xl font-bold">{selectedEmail.subject}</h1><p>{selectedEmail.body}</p></div>: 'Select an item'}</div>
        </div>
    );
};

export const MaxfraOfficeSuiteApp: React.FC<Partial<AppProps>> = (props) => {
    type OfficeApp = 'word' | 'excel' | 'outlook';
    const [activeApp, setActiveApp] = useState<OfficeApp>('word');

    useEffect(() => {
        if (props.file?.subApp) {
            setActiveApp(props.file.subApp);
        }
    }, [props.file]);

    const renderActiveAppComponent = () => {
        switch (activeApp) {
            case 'word': return <WordComponent {...props} />;
            case 'excel': return <ExcelComponent {...props} />;
            case 'outlook': return <OutlookComponent {...props} />;
            default: return null;
        }
    };
    
    return (
        <div className="w-full h-full flex bg-gray-800 text-white">
            <div className="w-16 bg-gray-900 flex flex-col items-center py-4">
                 <button onClick={() => setActiveApp('word')} className={`p-3 rounded-lg mb-4 ${activeApp === 'word' ? 'bg-blue-600' : 'hover:bg-gray-700'}`} title="Word">
                    <MaxfraWordIcon className="w-6 h-6" />
                </button>
                 <button onClick={() => setActiveApp('excel')} className={`p-3 rounded-lg mb-4 ${activeApp === 'excel' ? 'bg-green-700' : 'hover:bg-gray-700'}`} title="Excel">
                    <MaxfraExcelIcon className="w-6 h-6" />
                </button>
                 <button onClick={() => setActiveApp('outlook')} className={`p-3 rounded-lg ${activeApp === 'outlook' ? 'bg-sky-600' : 'hover:bg-gray-700'}`} title="Outlook">
                    <MaxfraOutlookIcon className="w-6 h-6" />
                </button>
            </div>
            <div className="flex-grow">
                {renderActiveAppComponent()}
            </div>
        </div>
    );
};

export const RecycleBinApp: React.FC<Partial<AppProps>> = ({ fs, setFs }) => {
    if (!fs || !setFs || fs.type !== 'directory') {
        return <div className="p-4 text-black">Loading...</div>;
    }

    const RECYCLE_BIN_PATH = ['Recycle Bin'];
    const recycleBinDir = findNodeByPath(fs, RECYCLE_BIN_PATH);
    
    if (!recycleBinDir) {
        return <div className="p-4 text-black">Recycle Bin folder not found.</div>;
    }

    const handleRestore = (itemToRestore: FileNode) => {
        setFs(currentFs => {
            const newFs = JSON.parse(JSON.stringify(currentFs));
            if (newFs.type !== 'directory') return currentFs;

            const bin = findNodeByPath(newFs, RECYCLE_BIN_PATH);
            if (!bin) {
                console.error("Recycle Bin not found during restore.");
                return currentFs;
            }
            
            const itemIndex = bin.children.findIndex(i => i.type === 'file' && i.name === itemToRestore.name && (i as FileNode).originalPath?.join('/') === itemToRestore.originalPath?.join('/'));
            if (itemIndex === -1) return currentFs;

            const [item] = bin.children.splice(itemIndex, 1) as [FileNode];
            const originalPath = item.originalPath;

            if (!originalPath) {
                console.error("Cannot restore item without originalPath:", item);
                bin.children.splice(itemIndex, 0, item); // Put it back
                return currentFs;
            }
            
            delete item.originalPath;

            const destinationDir = findOrCreateDirectoryByPath(newFs, originalPath);
            const itemName = item.name;
            let finalName = itemName;
            let counter = 1;
            while(destinationDir.children.some(child => child.name === finalName)) {
                const parts = itemName.split('.');
                const ext = parts.pop();
                finalName = `${parts.join('.')}_restored_${counter}${ext ? '.' + ext : ''}`;
                counter++;
            }
            item.name = finalName;
            
            destinationDir.children.push(item);
            
            return newFs;
        });
    };

    const handleDelete = (itemToDelete: FileNode) => {
        if(window.confirm(`Are you sure you want to permanently delete '${itemToDelete.name}'? This action cannot be undone.`)) {
            setFs(currentFs => {
                const newFs = JSON.parse(JSON.stringify(currentFs));
                 if (newFs.type !== 'directory') return currentFs;

                const bin = findNodeByPath(newFs, RECYCLE_BIN_PATH);
                if (!bin) {
                    console.error("Recycle Bin not found during delete.");
                    return currentFs;
                }
                bin.children = bin.children.filter(i => !(i.type === 'file' && i.name === itemToDelete.name && (i as FileNode).originalPath?.join('/') === itemToDelete.originalPath?.join('/')));
                return newFs;
            });
        }
    };

    const handleEmptyTrash = () => {
        if(window.confirm('Are you sure you want to permanently delete all items in the Recycle Bin? This action cannot be undone.')) {
            setFs(currentFs => {
                const newFs = JSON.parse(JSON.stringify(currentFs));
                if (newFs.type !== 'directory') return currentFs;

                const bin = findNodeByPath(newFs, RECYCLE_BIN_PATH);
                if (!bin) {
                    console.error("Recycle Bin not found during empty.");
                    return currentFs;
                }
                bin.children = [];
                return newFs;
            });
        }
    };
    
    const items = recycleBinDir.children.filter(c => c.type === 'file') as FileNode[];

    return (
        <div className="w-full h-full flex flex-col bg-white text-black">
            <header className="flex-shrink-0 p-2 bg-gray-100 border-b flex items-center gap-2">
                <TrashIcon className="w-6 h-6" />
                <h1 className="text-lg font-semibold">Recycle Bin</h1>
                <div className="flex-grow"></div>
                <button 
                    onClick={handleEmptyTrash} 
                    disabled={items.length === 0}
                    className="px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50"
                >
                    Empty Bin
                </button>
            </header>
            <main className="flex-grow overflow-y-auto">
                {items.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">The Recycle Bin is empty.</div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 font-medium">Name</th>
                                <th className="p-3 font-medium">Original Location</th>
                                <th className="p-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={`${item.name}-${index}`} className="border-b hover:bg-gray-50">
                                    <td className="p-3 flex items-center gap-2">
                                        <FileIcon className="w-5 h-5 text-gray-600" />
                                        {item.name}
                                    </td>
                                    <td className="p-3 text-gray-600">
                                        C:\{item.originalPath?.join('\\') || 'Unknown'}
                                    </td>
                                    <td className="p-3 space-x-2">
                                        <button onClick={() => handleRestore(item)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">Restore</button>
                                        <button onClick={() => handleDelete(item)} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-red-500 transition-colors">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </main>
        </div>
    );
};
