import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  picked_up: "bg-blue-100 text-blue-800",
  in_transit: "bg-blue-500 text-white",
  out_for_delivery: "bg-purple-500 text-white",
  delivered: "bg-emerald-500 text-white",
  failed_delivery: "bg-red-500 text-white"
};

export const statusLabels = {
  pending: "Pending",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  failed_delivery: "Failed Delivery"
};

export const statusDotColors = {
  pending: "#FBBF24",
  picked_up: "#60A5FA",
  in_transit: "#3B82F6",
  out_for_delivery: "#8B5CF6",
  delivered: "#10B981",
  failed_delivery: "#EF4444"
};

export function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
