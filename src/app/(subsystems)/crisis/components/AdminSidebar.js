import React from "react";
import { Link, useLocation } from "react-router";
import { 
  LayoutDashboard, 
  Users, 
  Workflow, 
  Building2, 
  Glasses, 
  Calendar,
  AlertTriangle,
  ShoppingBag,
  Map,
  MessageSquare,
  BarChart3,
  Gift
} from "lucide-react";
import svgPaths from "../../imports/Background/svg-tpieq0uyml";

function Logo() {
  return (
    <div className="h-[72px] border-b border-gray-200 px-6 flex items-center gap-3">
      <div className="bg-blue-600 rounded-lg size-8 flex items-center justify-center">
        <div className="size-5">
          <svg className="size-full" fill="none" viewBox="0 0 18.3333 18.3333">
            <g>
              <path d={svgPaths.p2404e118} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d={svgPaths.p21cf2600} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d={svgPaths.p2ef3a080} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
              <path d={svgPaths.p7ba7980} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            </g>
          </svg>
        </div>
      </div>
      <span className="text-xl font-bold text-blue-600">CONNECT-DAET</span>
    </div>
  );
}

export function AdminSidebar() {
  const location = useLocation();

  const coreAdmin = [
    { path: "/admin", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { path: "/admin/users", label: "Users", icon: <Users size={20} /> },
    { path: "/admin/workflow", label: "Workflow", icon: <Workflow size={20} /> },
  ];

  const tourismModules = [
    { path: "/admin/museum", label: "Museum", icon: <Building2 size={20} /> },
    { path: "/admin/arvr", label: "AR / VR", icon: <Glasses size={20} /> },
    { path: "/admin/events", label: "Events", icon: <Calendar size={20} /> },
    { path: "/admin/crisis", label: "Crisis Management", icon: <AlertTriangle size={20} />, isActive: true },
    { path: "/admin/shop", label: "Shop", icon: <ShoppingBag size={20} /> },
    { path: "/admin/tours", label: "Tours", icon: <Map size={20} /> },
    { path: "/admin/feedback", label: "Feedback", icon: <MessageSquare size={20} /> },
    { path: "/admin/analytics", label: "Analytics", icon: <BarChart3 size={20} /> },
    { path: "/admin/rewards", label: "Rewards", icon: <Gift size={20} /> },
  ];

  const isActive = (path) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-[280px] bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 hidden lg:flex">
      <Logo />
      
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-4">
            Core Admin
          </h3>
          {coreAdmin.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors ${
                isActive(item.path)
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-4">
            Smart Tourism Modules
          </h3>
          {tourismModules.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-colors ${
                isActive(item.path)
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </div>
              {item.isActive && (
                <span className={`${isActive(item.path) ? "bg-white text-blue-600" : "bg-blue-600 text-white"} text-[10px] font-bold px-2 py-0.5 rounded`}>
                  ACTIVE
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}