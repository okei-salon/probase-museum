import {
  Award,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChartColumn,
  ChartLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Crown,
  FileText,
  Flag,
  Globe2,
  Hand,
  Heart,
  Medal,
  RefreshCw,
  Search,
  Settings,
  Star,
  Trophy,
  User,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

const iconMap = {
  award: Award,
  baseball: CircleDot,
  bell: Bell,
  book: BookOpen,
  building: Building2,
  calendar: CalendarDays,
  chart: ChartColumn,
  chartLine: ChartLine,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  clock: Clock3,
  compare: ChartColumn,
  crown: Crown,
  file: FileText,
  flag: Flag,
  globe: Globe2,
  glove: Hand,
  guide: FileText,
  heart: Heart,
  medal: Medal,
  refresh: RefreshCw,
  search: Search,
  settings: Settings,
  star: Star,
  trophy: Trophy,
  user: User,
  userRound: UserRound,
  users: Users,
} as const;

export type MuseumIconName = keyof typeof iconMap;

type MuseumIconProps = {
  name: MuseumIconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

export function MuseumIcon({
  name,
  className,
  size = 18,
  strokeWidth = 1.5,
}: MuseumIconProps) {
  const Icon = iconMap[name] as LucideIcon;

  return (
    <Icon
      className={cn("shrink-0 text-museum-gold", className)}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden
    />
  );
}
