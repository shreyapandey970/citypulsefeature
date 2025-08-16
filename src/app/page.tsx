
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { EnviroCheckForm } from '@/components/enviro-check-form';
import { ComplaintsView } from '@/components/complaints-view';
import { RouteCheckView } from '@/components/route-check-view';
import { DashboardView } from '@/components/dashboard-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, ListChecks, LogOut, Loader2, Route, LayoutDashboard } from 'lucide-react';
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
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Building2 className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              CityPulseAI
            </h1>
          </div>

          {user && (
              <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                      <div className="font-semibold text-sm">{user.displayName}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                  <Avatar className="h-9 w-9">
                      <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                  </Button>
              </div>
          )}
        </div>
      </header>
      <main className="container mx-auto max-w-5xl py-12 px-4">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tighter">
                Report. Resolve. Rejuvenate.
            </h1>
            <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
                Your partner in building a better, cleaner community. Identify issues,
                track progress, and see the impact you make, all with the help of AI.
            </p>
        </div>
        
        <Tabs defaultValue="report" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
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
    </>
  );
}
