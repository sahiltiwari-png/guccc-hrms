import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Calendar,
  Clock,
  Home,
  Settings,
  Users,
  FileText,  
  User,
  Shield,
  LogOut,
  CheckCircle,
} from "lucide-react";

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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import employeeNavigation from '../../../EmployeesideAppSidebar';

const navigation: NavigationItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Attendance", url: "/attendance", icon: Clock },
  { title: "Regularization", url: "/regularization", icon: CheckCircle },
  { title: "Salary Structure", url: "/salary-slips", icon: FileText },
  { title: "Payroll", url: "/payroll", icon: FileText },
  { title: "Leaves", url: "/leaves", icon: Calendar, hasSubmenu: true, submenu: [
    { title: "Leave Policy", url: "/leaves/policy" },
    { title: "Leave Allotment", url: "/leaves/allotment" },
    { title: "Leave Requests", url: "/leaves/requests" }
  ] }, 
  { title: "Reports", url: "/reports", icon: FileText, hasSubmenu: true, submenu: [
    { title: "Employees Report", url: "/reports/employees" },
    { title: "Leave Requests Report", url: "/reports/leave-requests" },
    { title: "Payroll Report", url: "/reports/payroll" },
    { title: "Attendance Report", url: "/reports/attendance" }
  ] },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Organization Settings", url: "/organization-settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, logout } = useAuth();
  const role = user?.role || localStorage.getItem('role');
  const [openSubmenu, setOpenSubmenu] = React.useState<string | null>(null);
  
  const handleLogout = () => {
    localStorage.clear();
    logout();
  };
  
  const toggleSubmenu = (title: string) => {
    setOpenSubmenu(openSubmenu === title ? null : title);
  };

  const isActive = (path: string) => location.pathname === path || location.pathname === "/" && path === "/dashboard";
  const getNavClassName = (path: string) => 
    isActive(path) 
      ? "bg-white text-gray-900 hover:bg-gray-100 font-semibold shadow-sm" 
      : "bg-transparent text-white hover:bg-white hover:text-gray-900 transition-all duration-200";

  return (
    <Sidebar className={`border-r border-gray-700 ${state === "collapsed" ? "w-14" : "w-64"}`}>
      <SidebarHeader className="border-b border-gray-700 p-4">
        {state === "expanded" && (
          <div className="flex items-center justify-center py-2">
            <img 
              src="/gucwhite.png" 
              alt="GoUnicrew"
              className="h-12 w-auto object-contain"
            />
          </div>
        )}
        {state === "collapsed" && (
          <img 
            src="/gucwhite.png" 
            alt="GoUnicrew"
            className="h-10 w-10 mx-auto object-contain"
          />
        )}
      </SidebarHeader>

      <SidebarContent className="p-2 overflow-y-auto scrollbar-hide">
        <SidebarGroup>
          <SidebarGroupLabel className="text-white uppercase text-xs font-medium px-2 mb-2">
            {state !== "collapsed" ? "Menu" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {role === 'superAdmin' ? (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="w-full">
                      <NavLink to="/dashboard" className={getNavClassName("/dashboard") + " flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-sm"}>
                        <Home className="h-4 w-4 flex-shrink-0" />
                        {state !== "collapsed" && <span>Organizations</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="w-full">
                      <NavLink to="/settings" className={getNavClassName("/settings") + " flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-sm"}>
                        <Settings className="h-4 w-4 flex-shrink-0" />
                        {state !== "collapsed" && <span>Settings</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {/* <SidebarMenuItem>
                    <SidebarMenuButton asChild className="w-full">
                      <NavLink to="/organization-settings" className={getNavClassName("/organization-settings") + " flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-sm"}>
                        <Settings className="h-4 w-4 flex-shrink-0" />
                        {state !== "collapsed" && <span>Organization Settings</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem> */}
                </>
              ) : (
                // Use employee-specific navigation when role is 'employee'
                (role === 'employee' ? employeeNavigation : navigation).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.hasSubmenu ? (
                      <>
                        <SidebarMenuButton asChild className="w-full">
                          <div 
                            onClick={() => toggleSubmenu(item.title)}
                            className={`${getNavClassName(item.url)} transition-all duration-200 flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-sm cursor-pointer`}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            {state !== "collapsed" && (
                              <>
                                <span className="flex-1">{item.title}</span>
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  width="16" 
                                  height="16" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  className={`h-4 w-4 transition-transform duration-200 ${openSubmenu === item.title ? 'rotate-180' : ''}`}
                                >
                                  <path d="m6 9 6 6 6-6"/>
                                </svg>
                              </>
                            )}
                          </div>
                        </SidebarMenuButton>
                        {state !== "collapsed" && item.submenu && openSubmenu === item.title && (
                          <div className="ml-7 mt-1 pl-3 border-l border-gray-200">
                            {item.submenu.map((subItem) => (
                              <NavLink
                                key={subItem.title}
                                to={subItem.url}
                                className={`${getNavClassName(subItem.url)} block py-2 px-2 text-sm rounded-md`}
                              >
                                {subItem.title}
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <SidebarMenuButton asChild className="w-full">
                        <NavLink
                          to={item.url}
                          className={`${getNavClassName(item.url)} transition-all duration-200 flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-sm`}
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          {state !== "collapsed" && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(role === 'companyAdmin' || role === 'hr') && (
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase text-xs font-medium px-2 mb-2 bg-[#4CDC9C] text-[#23292F] rounded-md">
              {state !== "collapsed" ? "My space" : ""}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="w-full">
                    <NavLink
                      to="/apply-leave"
                      className={`${getNavClassName('/apply-leave')} transition-all duration-200 flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-sm !text-[#4CDC9C] hover:!text-[#4CDC9C]`}
                    >
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      {state !== "collapsed" && <span>Apply leave</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="w-full">
                    <NavLink
                      to="/regularization/submit"
                      className={`${getNavClassName('/regularization/submit')} transition-all duration-200 flex items-center gap-3 px-3 py-2.5 rounded-md w-full text-sm !text-[#4CDC9C] hover:!text-[#4CDC9C]`}
                    >
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      {state !== "collapsed" && <span>Attendance Regularization</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-700 p-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start bg-transparent text-white hover:bg-white hover:text-gray-900 transition-all duration-200"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {state !== "collapsed" && <span className="ml-2">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}