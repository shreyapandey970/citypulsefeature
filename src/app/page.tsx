
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import Link from 'next/link';
import { EnviroCheckForm } from '@/components/enviro-check-form';
import { ComplaintsView } from '@/components/complaints-view';
import { RouteCheckView } from '@/components/route-check-view';
import { DashboardView } from '@/components/dashboard-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, ListChecks, LogOut, Loader2, Route, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { signOutUser } from '@/lib/firebase/service';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.email === 'admin@gmail.com') {
          router.push('/admin');
          // No need to setLoading(false) here, as we are redirecting away.
        } else {
          setUser(user);
          setLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    router.push('/login');
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    // This case handles the brief moment before redirection if a non-admin user is logged out.
    // It also prevents rendering the main content for a user who should be redirected.
    return null;
  }

  return (
    <main className="container mx-auto max-w-4xl py-12 px-4">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/20 rounded-lg">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">
                CityPulseAI
              </h1>
              <p className="text-muted-foreground text-base">
                Help keep our environment clean. Report issues or view existing ones on your route.
              </p>
            </div>
        </div>

        {user && (
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <div className="font-semibold">{user.displayName}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
                <Avatar>
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        )}
      </header>
      
      <Tabs defaultValue="report" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="report">
            <Building2 className="mr-2 h-4 w-4" />
            Report Issue
          </TabsTrigger>
          <TabsTrigger value="view">
            <ListChecks className="mr-2 h-4 w-4" />
            View Complaints
          </TabsTrigger>
          <TabsTrigger value="route">
            <Route className="mr-2 h-4 w-4" />
            Check Route
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>
        <TabsContent value="report" className="mt-6">
          <EnviroCheckForm />
        </TabsContent>
        <TabsContent value="view" className="mt-6">
          <ComplaintsView />
        </TabsContent>
        <TabsContent value="route" className="mt-6">
            <RouteCheckView />
        </TabsContent>
         <TabsContent value="dashboard" className="mt-6">
            <DashboardView />
        </TabsContent>
      </Tabs>
    </main>
  );
}
