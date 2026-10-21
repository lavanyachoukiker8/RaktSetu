import {
  AlertTriangle, AlertOctagon, Clock, CircleDot, Hourglass, CheckCircle2, XCircle, ShieldCheck, Ban, Truck, Package, Trash2, UserCheck, UserX,
} from 'lucide-react';

export function BloodGroupBadge({ group, size = 'md', className = '' }) {
  const s = size === 'lg' ? 'px-4 py-1.5 text-lg' : size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span className={`inline-flex items-center justify-center rounded-full bg-red-600 font-bold text-white ${s} ${className}`} aria-label={`Blood group ${group}`}>
      {group}
    </span>
  );
}

const base = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap';

const URG = {
  NORMAL: { cls: 'bg-red-100 text-red-800', Icon: Clock, label: 'Normal' },
  URGENT: { cls: 'bg-red-300 text-red-900', Icon: AlertTriangle, label: 'Urgent' },
  CRITICAL: { cls: 'bg-red-700 text-white animate-pulse-soft', Icon: AlertOctagon, label: 'Critical' },
};
export function UrgencyChip({ urgency }) {
  const { cls, Icon, label } = URG[urgency] || URG.NORMAL;
  return (
    <span className={`${base} ${cls}`}>
      <Icon size={13} aria-hidden="true" /> {label}
    </span>
  );
}

const STATUS = {
  OPEN: { cls: 'bg-red-100 text-red-800 border border-red-300', Icon: CircleDot, label: 'Open' },
  PARTIAL: { cls: 'bg-red-300 text-red-900', Icon: Hourglass, label: 'Partial' },
  FULFILLED: { cls: 'bg-red-800 text-white', Icon: CheckCircle2, label: 'Fulfilled' },
  CANCELLED: { cls: 'bg-white text-red-800 border border-dashed border-red-400', Icon: XCircle, label: 'Cancelled' },
  PENDING: { cls: 'bg-red-100 text-red-800 border border-red-300', Icon: Hourglass, label: 'Pending' },
  APPROVED: { cls: 'bg-red-800 text-white', Icon: ShieldCheck, label: 'Approved' },
  REJECTED: { cls: 'bg-white text-red-800 border border-dashed border-red-400', Icon: Ban, label: 'Rejected' },
  REQUESTED: { cls: 'bg-red-100 text-red-800 border border-red-300', Icon: Truck, label: 'Requested' },
  COMPLETED: { cls: 'bg-red-800 text-white', Icon: CheckCircle2, label: 'Completed' },
  AVAILABLE: { cls: 'bg-red-100 text-red-800 border border-red-300', Icon: Package, label: 'Available' },
  USED: { cls: 'bg-red-300 text-red-900', Icon: CheckCircle2, label: 'Used' },
  EXPIRED: { cls: 'bg-red-700 text-white', Icon: Trash2, label: 'Expired' },
  ACTIVE: { cls: 'bg-red-100 text-red-800 border border-red-300', Icon: UserCheck, label: 'Active' },
  INACTIVE: { cls: 'bg-white text-red-800 border border-dashed border-red-400', Icon: UserX, label: 'Inactive' },
};
export function StatusChip({ status }) {
  const { cls, Icon, label } = STATUS[status] || { cls: 'bg-red-100 text-red-800', Icon: CircleDot, label: status };
  return (
    <span className={`${base} ${cls}`}>
      <Icon size={13} aria-hidden="true" /> {label}
    </span>
  );
}
