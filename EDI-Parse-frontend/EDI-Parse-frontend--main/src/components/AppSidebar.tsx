import { LayoutDashboard, Upload, Info, User, Settings, ChevronDown, BookOpen, GitCompare, Users, FileSpreadsheet, Activity, FileCheck, ShieldCheck, Banknote } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useState } from "react";
import { cn } from "@/lib/utils";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Compare", url: "/compare", icon: GitCompare },
  { title: "834 Enrollment", url: "/834-enrollment", icon: Users },
  { title: "834 Delta Report", url: "/834-delta", icon: Activity },
  { title: "Eligibility Check", url: "/eligibility", icon: ShieldCheck },
  { title: "835 Payment Summary", url: "/835-payment", icon: Banknote },
  { title: "Reconciliation", url: "/reconciliation", icon: FileCheck },
];

const bottomItems = [
  { title: "Profile", url: "/profile", icon: User },
  { title: "Subscription", url: "/subscription", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [resourcesOpen, setResourcesOpen] = useState(false);

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-[#0a0a14]">
      <SidebarContent className="flex flex-col h-full py-4">
        <div className="px-4 mb-4">
          {!collapsed && (
            <h1 className="text-lg font-semibold tracking-tight text-white">
              EDI <span className="text-[#7c5cff]">Insight</span>
            </h1>
          )}
        </div>
        <SidebarGroup className="flex-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="over:bg-[#7c5cff]/5 dark:hover:bg-white/5 hover:text-[#7c5cff] dark:hover:text-white text-muted-foreground transition-all rounded-lg"
                      activeClassName="bg-[#7c5cff]/10 text-[#7c5cff] font-medium shadow-[inset_2px_0_0_#7c5cff]"
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Collapsible Resources */}
              <SidebarMenuItem>
                <div className="flex flex-col">
                  <button
                    onClick={() => setResourcesOpen(!resourcesOpen)}
                    className="over:bg-[#7c5cff]/5 dark:hover:bg-white/5 hover:text-[#7c5cff] dark:hover:text-white text-muted-foreground transition-all rounded-lg"
                  >
                    <div className="flex items-center">
                      <BookOpen className="mr-3 h-4 w-4" />
                      {!collapsed && <span>Resources</span>}
                    </div>
                    {!collapsed && (
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform", resourcesOpen && "rotate-180")}
                      />
                    )}
                  </button>
                  {!collapsed && resourcesOpen && (
                    <div className="ml-9 mt-1 flex flex-col gap-1 border-l border-white/10 pl-2">
                      <NavLink
                        to="/x12-tutorial"
                        className="text-xs text-muted-foreground hover:text-[#7c5cff] py-1.5 px-2 rounded hover:bg-white/5"
                        activeClassName="text-[#7c5cff] font-medium"
                      >X12 Tutorial</NavLink>
                      <NavLink
                        to="/validator-rules"
                        className="text-xs text-muted-foreground hover:text-[#7c5cff] py-1.5 px-2 rounded hover:bg-white/5"
                        activeClassName="text-[#7c5cff] font-medium"
                      >Rules</NavLink>
                    </div>
                  )}
                </div>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/about"
                    className="over:bg-[#7c5cff]/5 dark:hover:bg-white/5 hover:text-[#7c5cff] dark:hover:text-white text-muted-foreground transition-all rounded-lg"
                    activeClassName="bg-[#7c5cff]/10 text-[#7c5cff] font-medium shadow-[inset_2px_0_0_#7c5cff]"
                  >
                    <Info className="mr-3 h-4 w-4" />
                    {!collapsed && <span>About</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="px-4 py-2 border-t border-white/5 mt-auto">
          <SidebarMenu className="gap-1">
            {bottomItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.url}
                    className="hover:bg-white/5 hover:text-white text-muted-foreground transition-all rounded-lg"
                    activeClassName="bg-white/10 text-white font-medium"
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
