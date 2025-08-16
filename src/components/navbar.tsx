
"use client";

import { Button } from "@/components/ui/button";
import type { View } from "@/app/page";
import { Building2, ListChecks, Route, LayoutDashboard, Home } from 'lucide-react';

interface NavbarProps {
    activeView: View;
    setActiveView: (view: View) => void;
}

const navItems: { id: View, label: string, icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home className="mr-2 h-4 w-4" /> },
    { id: 'report', label: 'Report Issue', icon: <Building2 className="mr-2 h-4 w-4" /> },
    { id: 'view', label: 'View Complaints', icon: <ListChecks className="mr-2 h-4 w-4" /> },
    { id: 'route', label: 'Check Route', icon: <Route className="mr-2 h-4 w-4" /> },
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
]

export function Navbar({ activeView, setActiveView }: NavbarProps) {
    return (
        <nav className="border-t">
            <div className="container flex items-center justify-center">
                <div className="flex gap-1">
                    {navItems.map((item) => (
                         <Button
                            key={item.id}
                            variant={activeView === item.id ? "secondary" : "ghost"}
                            onClick={() => setActiveView(item.id)}
                            className="flex-1 justify-center rounded-none"
                        >
                            {item.icon}
                            {item.label}
                        </Button>
                    ))}
                </div>
            </div>
        </nav>
    );
}
