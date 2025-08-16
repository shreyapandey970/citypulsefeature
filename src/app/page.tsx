
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
import { Building2, ListChecks, LogOut, Loader2, Route, LayoutDashboard, ScanEye, Send, Wrench } from 'lucide-react';
import { signOutUser } from '@/lib/firebase/service';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';

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

  const featureCards = [
    {
      icon: <Send className="w-10 h-10 text-primary" />,
      title: "1. Report the Issue",
      description: "Snap a photo or video of a civic issue like a pothole or garbage pile. Add the location to start your report."
    },
    {
      icon: <ScanEye className="w-10 h-10 text-primary" />,
      title: "2. Let AI Verify It",
      description: "Our AI analyzes your submission to identify the issue type and assess its severity, ensuring accuracy."
    },
    {
      icon: <Wrench className="w-10 h-10 text-primary" />,
      title: "3. See It Resolved",
      description: "Track the status of your report and get notified when the issue is resolved by city administrators."
    }
  ]

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
                  <ThemeToggle />
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

      <main className="container mx-auto px-4">
        {/* Hero Section */}
        <section className="py-20 md:py-32 text-center">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="text-left">
                    <Badge className="mb-4">Community Powered. AI Driven.</Badge>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tighter mb-4">
                        Your Voice for a Better City
                    </h1>
                    <p className="text-muted-foreground text-lg mb-8 max-w-xl">
                        CityPulseAI empowers you to report civic issues effortlessly.
                        From potholes to broken streetlights, your reports help create a cleaner, safer community for everyone.
                    </p>
                    <a href="#reporting-tool">
                        <Button size="lg">Start a Report</Button>
                    </a>
                </div>
                <div>
                     <Image 
                        src="https://placehold.co/600x400.png"
                        alt="A clean city street intersection"
                        width={600}
                        height={400}
                        className="rounded-xl shadow-lg"
                        data-ai-hint="city street"
                     />
                </div>
            </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-secondary/50 rounded-xl">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">A Simple, Powerful Process</h2>
                <p className="text-muted-foreground mt-2">Making a difference is as easy as 1, 2, 3.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto">
                {featureCards.map((feature, index) => (
                    <div key={index} className="flex flex-col items-center">
                        <div className="p-4 bg-background rounded-full shadow-md mb-4">
                          {feature.icon}
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                        <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                ))}
            </div>
        </section>

        {/* Reporting Tool Section */}
        <section id="reporting-tool" className="py-20">
          <Tabs defaultValue="report" className="w-full max-w-5xl mx-auto">
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
        </section>
      </main>
    </>
  );
}
