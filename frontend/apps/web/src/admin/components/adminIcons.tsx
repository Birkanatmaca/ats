import {
  AlertCircle,
  Bot,
  CalendarCheck2,
  CheckCircle2,
  CircuitBoard,
  DatabaseZap,
  Flag,
  GraduationCap,
  KeyRound,
  LifeBuoy,
  Mail,
  MessageSquare,
  Network,
  ShieldCheck
} from "lucide-react";
import type { ReactNode } from "react";

export function moduleIcon(name: string): ReactNode {
  const icons: Record<string, ReactNode> = {
    Auth: <ShieldCheck size={20} />,
    Scheduling: <CalendarCheck2 size={20} />,
    Attendance: <CheckCircle2 size={20} />,
    Guidance: <GraduationCap size={20} />,
    Billing: <DatabaseZap size={20} />
  };
  return icons[name] ?? <CircuitBoard size={20} />;
}

export function credentialIcon(key: string) {
  if (key.includes("ai")) {
    return <Bot size={20} />;
  }
  if (key.includes("sms")) {
    return <Network size={20} />;
  }
  if (key.includes("mail")) {
    return <Mail size={20} />;
  }
  return <KeyRound size={20} />;
}

export function supportTypeIcon(type: string) {
  const icons: Record<string, ReactNode> = {
    complaint: <AlertCircle size={18} />,
    suggestion: <MessageSquare size={18} />,
    report: <Flag size={18} />,
    support: <LifeBuoy size={18} />
  };
  return icons[type] ?? <LifeBuoy size={18} />;
}
