import type { AppConfig } from './types';
import * as Icons from './components/icons';
import { 
    NotepadApp, 
    FileExplorerApp, 
    SettingsApp, 
    CalculatorApp, 
    MaxfraAiBrowserApp, 
    CalendarApp, 
    ClipCalculatorApp,
    MaxfraOfficeSuiteApp,
    StudentDatabaseApp,
    SandyAiApp,
    RecycleBinApp
} from './apps';

export const APPS: AppConfig[] = [
  {
    id: 'notepad',
    title: 'Notepad',
    icon: (className) => <Icons.NotepadIcon className={className} />,
    component: NotepadApp,
    defaultSize: { width: 400, height: 300 },
  },
  {
    id: 'maxfraAiBrowser',
    title: 'MAXFRA AI Browser',
    icon: (className) => <Icons.MaxfraAIBrowserIcon className={className} />,
    component: MaxfraAiBrowserApp,
    isPinned: true,
    defaultSize: { width: 800, height: 600 },
  },
    {
    id: 'sandyAi',
    title: 'Sandy AI',
    icon: (className) => <Icons.SandyAiIcon className={className} />,
    component: SandyAiApp,
    defaultSize: { width: 500, height: 650 },
  },
  {
    id: 'fileExplorer',
    title: 'File Explorer',
    icon: (className) => <Icons.FileExplorerIcon className={className} />,
    component: FileExplorerApp,
    isPinned: true,
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: (className) => <Icons.SettingsIcon className={className} />,
    component: SettingsApp,
  },
  {
    id: 'studentDatabase',
    title: 'Student Database',
    icon: (className) => <Icons.StudentDatabaseIcon className={className} />,
    component: StudentDatabaseApp,
    isPinned: true,
    defaultSize: { width: 1024, height: 768 },
  },
  {
    id: 'calculator',
    title: 'Calculator',
    icon: (className) => <Icons.CalculatorIcon className={className} />,
    component: CalculatorApp,
    defaultSize: { width: 320, height: 480 },
  },
  {
    id: 'calendar',
    title: 'Maxfra Appointment Book',
    icon: (className) => <Icons.CalendarIcon className={className} />,
    component: CalendarApp,
    isPinned: true,
    defaultSize: { width: 900, height: 700 },
  },
  {
    id: 'clipCalculator',
    title: 'Clip Calculator',
    icon: (className) => <Icons.ClipIcon className={className} />,
    component: ClipCalculatorApp,
    defaultSize: { width: 500, height: 750 },
  },
  {
    id: 'maxfraOfficeSuite',
    title: 'Maxfra Office Suite',
    icon: (className) => <Icons.MaxfraOfficeSuiteIcon className={className} />,
    component: MaxfraOfficeSuiteApp,
    isPinned: true,
    defaultSize: { width: 950, height: 700 },
  },
  {
    id: 'recycleBin',
    title: 'Recycle Bin',
    icon: (className) => <Icons.TrashIcon className={className} />,
    component: RecycleBinApp,
    defaultSize: { width: 600, height: 400 },
  },
];