/**
 * Centralized icon system for @hikai/ui
 * 
 * All icons are re-exported from lucide-react to maintain consistency
 * across all apps in the monorepo. Apps should import icons from
 * @hikai/ui instead of directly from lucide-react.
 * 
 * Usage in apps:
 * import { ChevronDown, SearchIcon } from "@hikai/ui";
 */

// Navigation & Arrows
export {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowDownLeft,
} from "lucide-react";

// Actions & States
export {
  Check,
  X,
  Plus,
  Minus,
  Edit,
  Trash2,
  Save,
  Copy,
  Download,
  Upload,
  RefreshCw,
  RotateCcw,
  RotateCw,
} from "lucide-react";

// UI Elements
export {
  Circle,
  Square,
  Triangle,
  Star,
  Heart,
  Eye,
  EyeOff,
  Search,
  Filter,
  Menu,
  MoreHorizontal,
  MoreVertical,
  Grid,
  List,
} from "lucide-react";

// Communication & Social
export {
  Mail,
  Phone,
  MessageCircle,
  Send,
  Bell,
  BellOff,
  Share,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

// Files & Documents
export {
  File,
  FileText,
  Folder,
  FolderOpen,
  Image,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Paperclip,
} from "lucide-react";

// Settings & Configuration
export {
  Settings,
  Cog,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
} from "lucide-react";

// User & Account
export {
  User,
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  Crown,
  Key,
  LogOut,
  LogIn,
} from "lucide-react";

// Feedback & Status
export {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  HelpCircle,
  Lightbulb,
  Zap,
} from "lucide-react";

// Time & Calendar
export {
  Calendar,
  Clock,
  Timer,
  CalendarDays,
  CalendarPlus,
} from "lucide-react";

// Layout & Design
export {
  Layout,
  Sidebar,
  PanelLeft,
  PanelRight,
  Maximize,
  Minimize,
  Expand,
  Shrink,
  Move,
} from "lucide-react";

// Media & Entertainment
export {
  Play,
  Pause,
  Square as Stop,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Camera,
  Video,
  VideoOff,
} from "lucide-react";

// Theme & Appearance
export {
  Sun,
  Moon,
  Monitor,
  Palette,
  Contrast,
} from "lucide-react";

// Semantic aliases for better developer experience
export { X as CloseIcon } from "lucide-react";
export { Menu as HamburgerIcon } from "lucide-react";
export { Search as SearchIcon } from "lucide-react";
export { User as ProfileIcon } from "lucide-react";
export { Settings as SettingsIcon } from "lucide-react";
export { Home as HomeIcon } from "lucide-react";
export { ChevronDown as DropdownIcon } from "lucide-react";
export { Check as CheckmarkIcon } from "lucide-react";
export { AlertCircle as ErrorIcon } from "lucide-react";
export { CheckCircle as SuccessIcon } from "lucide-react";
export { Info as InfoIcon } from "lucide-react";
export { AlertTriangle as WarningIcon } from "lucide-react";
export { RefreshCw as Refresh } from "lucide-react";

// Export useful types
export type { LucideIcon, LucideProps } from "lucide-react";

// Additional icons that might be needed - add as required
export {
  Home,
  Building,
  Globe,
  Wifi,
  WifiOff,
  Bluetooth,
  Battery,
  BatteryLow,
  Signal,
  Smartphone,
  Laptop,
  Monitor as DesktopIcon,
  Tablet,
  Watch,
  Headphones,
  Speaker,
  PrinterIcon as Printer,
  ScanLine as Scanner,
  Database,
  Server,
  Cloud,
  CloudOff,
  HardDrive,
  Cpu,
  MemoryStick,
  Gamepad2,
  Router,
  Type,
  // New icons for landing page
  Rocket,
  Target,
  TrendingUp,
  Users2,
  Sparkles,
  FlameKindling,
  BookOpen,
  MessageSquare,
  Languages,
} from "lucide-react";