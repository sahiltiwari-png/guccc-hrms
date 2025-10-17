import React from "react";
import {
  Calendar,
  Clock,
  Home,
  Settings,
  FileText,
  CheckCircle,
} from "lucide-react";

// Local types to describe navigation metadata for the employee sidebar
type SubMenuItem = {
  title: string;
  url: string;
};

type NavigationItem = {
  title: string;
  url: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  hasSubmenu?: boolean;
  submenu?: SubMenuItem[];
};

// Export a navigation configuration dedicated for the Employee role
export const employeeNavigation: NavigationItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Attendance", url: "/attendance", icon: Clock },
  { title: "Regularization", url: "/regularization", icon: CheckCircle },
  {
    title: "Leaves",
    url: "/leaves",
    icon: Calendar,
    hasSubmenu: true,
    submenu: [
      { title: "Leave Policy", url: "/leaves/policy" },
      // Note: If a Leave Balance page is added later, update the route below.
      { title: "Leave Balance", url: "/leaves/balance" },
      { title: "Apply Leave", url: "/apply-leave" },
      { title: "Track Leave request", url: "/leaves/track" },
    ],
  },
  { title: "Salary Structure", url: "/salary-slips", icon: FileText },
  { title: "Payroll", url: "/payroll", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export default employeeNavigation;