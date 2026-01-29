import { 
  Wrench, 
  CheckCircle, 
  GitBranch, 
  Scissors, 
  Rocket, 
  HeartPulse, 
  Store, 
  FileText, 
  Percent, 
  Flag,
  LucideIcon
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  'wrench': Wrench,
  'check-circle': CheckCircle,
  'git-branch': GitBranch,
  'scissors': Scissors,
  'rocket': Rocket,
  'heart-pulse': HeartPulse,
  'store': Store,
  'file-text': FileText,
  'percent': Percent,
  'flag': Flag,
};

interface StopIconProps {
  icon: string;
  className?: string;
}

export function StopIcon({ icon, className }: StopIconProps) {
  const Icon = iconMap[icon] || CheckCircle;
  return <Icon className={className} />;
}
