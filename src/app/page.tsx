"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { EnviroCheckForm } from '@/components/enviro-check-form';
import { ComplaintsView } from '@/components/complaints-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Building2, ListChecks, LogOut, Loader2 } from 'lucide-react';
import { signOutUser } from '@/lib/firebase/service';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="container mx-auto max-w-2xl py-12 px-4">
       <header className="text-center mb-8 relative">
        <div className="inline-flex items-center gap-3">
          <div className="p-3 bg-primary/20 rounded-lg">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-foreground">
            CityPulseAI
          </h1>
        </div>
        <p className="text-muted-foreground mt-2 text-lg">
          Help keep our environment clean. Report issues or view existing ones on your route.
        </p>
        <div className="absolute top-0 right-0">
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>
      
      <Tabs defaultValue="report" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="report">
            <Building2 className="mr-2 h-4 w-4" />
            Report Issue
          </TabsTrigger>
          <TabsTrigger value="view">
            <ListChecks className="mr-2 h-4 w-4" />
            View Complaints
          </TabsTrigger>
        </TabsList>
        <TabsContent value="report" className="mt-6">
          <EnviroCheckForm />
        </TabsContent>
        <TabsContent value="view" className="mt-6">
          <ComplaintsView />
        </TabsContent>
      </Tabs>
    </main>
  );
}
