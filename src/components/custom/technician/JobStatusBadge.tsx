import React from "react";
import { MdCancel, MdCheckCircle, MdBuild, MdLocalShipping, MdPauseCircle, MdTaskAlt } from "react-icons/md";
import { TECHNICIAN_STATUS_LABELS, type BookingStatusValue } from "@/constants/booking";

const STYLE: Record<BookingStatusValue, { Icon: React.ElementType; className: string }> = {
  NEW: { Icon: MdCheckCircle, className: "bg-blue-100 text-blue-800" },
  CONFIRMED: { Icon: MdCheckCircle, className: "bg-green-100 text-green-800" },
  ARRIVING: { Icon: MdLocalShipping, className: "bg-amber-100 text-amber-800" },
  WORKING: { Icon: MdBuild, className: "bg-amber-100 text-amber-800" },
  DELAYED: { Icon: MdPauseCircle, className: "bg-orange-100 text-orange-800" },
  COMPLETED: { Icon: MdTaskAlt, className: "bg-green-100 text-green-800" },
  CANCELLED: { Icon: MdCancel, className: "bg-gray-200 text-gray-700" },
};

export default function JobStatusBadge({ status }: { status: BookingStatusValue }) {
  const { Icon, className } = STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {TECHNICIAN_STATUS_LABELS[status]}
    </span>
  );
}
