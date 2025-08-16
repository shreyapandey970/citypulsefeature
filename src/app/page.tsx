
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { EnviroCheckForm } from '@/components/enviro-check-form';
import { ComplaintsView } from '@/components/complaints-view';
import { RouteCheckView } from '@/components/route-check-view';
import { DashboardView } from '@/components/dashboard-view';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, LogOut, Loader2 } from 'lucide-react';
import { signOutUser } from '@/lib/firebase/service';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { Navbar } from '@/components/navbar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export type View = 'home' | 'report' | 'view' | 'route' | 'dashboard';

const HeroSection = () => (
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
)

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>('home');


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
  
  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <HeroSection />;
      case 'report':
        return <EnviroCheckForm />;
      case 'view':
        return <ComplaintsView />;
      case 'route':
        return <RouteCheckView />;
      case 'dashboard':
        return <DashboardView />;
      default:
        return <HeroSection />;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Building2 className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              CityPulseAI
            </h1>
          </div>

          {user && (
              <div className="flex items-center gap-4">
                  <ThemeToggle />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                                <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                            </Avatar>
                       </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.displayName}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                            </p>
                        </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>
          )}
        </div>
         <Navbar activeView={activeView} setActiveView={setActiveView} />
      </header>

      <main className="container mx-auto px-4">
         <section id="reporting-tool" className="py-12">
            <div className="mt-6">
                {renderView()}
            </div>
         </section>
      </main>
    </>
  );
}
