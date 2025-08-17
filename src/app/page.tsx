
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
import { Building2, LogOut, Loader2, ShieldCheck, AreaChart, Users, Milestone, Lightbulb, HelpCircle, UserCheck } from 'lucide-react';
import { signOutUser } from '@/lib/firebase/service';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export type View = 'home' | 'report' | 'view' | 'route' | 'dashboard';

const HeroSection = ({ onStartReport }: { onStartReport: () => void }) => (
     <section className="container mx-auto py-20 md:py-32 text-center">
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
                <Button size="lg" onClick={onStartReport}>Start a Report</Button>
            </div>
            <div>
                 <Image 
                    src="https://natureconservancy-h.assetsadobe.com/is/image/content/dam/tnc/nature/en/photos/i/s/iStock-509662042-1800.jpg?crop=0%2C72%2C1800%2C990&wid=1300&hei=715&scl=1.3846153846153846"
                    alt="A clean city street intersection with a river flowing through it."
                    width={600}
                    height={400}
                    className="rounded-xl shadow-lg"
                    data-ai-hint="city street river"
                 />
            </div>
        </div>
    </section>
)

const FeatureSection = () => (
    <section id="features" className="py-20 md:py-24 bg-secondary/50">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight">Why CityPulseAI?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
                We leverage technology to make civic reporting faster, smarter, and more effective.
            </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mt-12 text-center">
            <div className="flex flex-col items-center">
                <div className="p-4 bg-primary/20 rounded-full mb-4">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">AI-Powered Verification</h3>
                <p className="text-muted-foreground mt-2">
                    Our AI automatically verifies your reports against the uploaded media, ensuring accuracy and reducing false positives.
                </p>
            </div>
            <div className="flex flex-col items-center">
                 <div className="p-4 bg-primary/20 rounded-full mb-4">
                    <AreaChart className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Real-Time Tracking</h3>
                <p className="text-muted-foreground mt-2">
                    Follow your report's journey from submission to resolution with live status updates in your personal dashboard.
                </p>
            </div>
            <div className="flex flex-col items-center">
                 <div className="p-4 bg-primary/20 rounded-full mb-4">
                    <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Community Analytics</h3>
                <p className="text-muted-foreground mt-2">
                    View a city-wide dashboard of all reports to understand trends and problem areas in your community.
                </p>
            </div>
        </div>
      </div>
    </section>
)

const HowItWorksSection = () => (
    <section className="py-20 md:py-24">
        <div className="container mx-auto">
             <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                    Three simple steps to make a real impact in your neighborhood.
                </p>
            </div>
             <div className="grid md:grid-cols-3 gap-8 mt-12 text-center">
                <Card className="p-6">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-primary/20 rounded-full">
                            <Lightbulb className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <h3 className="text-xl font-semibold">1. Snap & Report</h3>
                    <p className="text-muted-foreground mt-2">
                        See an issue? Open the app, select the problem type, and upload a photo or video.
                    </p>
                </Card>
                <Card className="p-6">
                    <div className="flex justify-center mb-4">
                         <div className="p-4 bg-primary/20 rounded-full">
                            <UserCheck className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <h3 className="text-xl font-semibold">2. AI Verifies</h3>
                    <p className="text-muted-foreground mt-2">
                        Our AI analyzes the media to confirm the issue and assesses its severity to prioritize it correctly.
                    </p>
                </Card>
                <Card className="p-6">
                    <div className="flex justify-center mb-4">
                         <div className="p-4 bg-primary/20 rounded-full">
                            <Milestone className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <h3 className="text-xl font-semibold">3. Track to Resolution</h3>
                    <p className="text-muted-foreground mt-2">
                        Your report is sent to the relevant authorities. You can track its status in your dashboard until it's resolved.
                    </p>
                </Card>
            </div>
        </div>
    </section>
);


const TestimonialsSection = () => (
    <section className="py-20 md:py-24 bg-secondary/50">
        <div className="container mx-auto">
            <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold tracking-tight">What Our Community Says</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                    Real stories from users making a difference.
                </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-muted-foreground mb-4">"Using CityPulseAI was incredibly easy. I reported a pothole on my street, and it was fixed within a week. It's amazing to see such a quick response!"</p>
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarFallback>JD</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">Jane Doe</p>
                                <p className="text-sm text-muted-foreground">Local Resident</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                     <CardContent className="p-6">
                        <p className="text-muted-foreground mb-4">"The dashboard is a game-changer. I can see all the issues being reported in my area, which makes me feel more connected and informed about my community."</p>
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarFallback>MS</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">Mark Smith</p>
                                <p className="text-sm text-muted-foreground">Neighborhood Watch</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-muted-foreground mb-4">"I was skeptical at first, but the AI verification is seriously impressive. It correctly identified a fallen tree branch I reported. Highly recommend this app."</p>
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarFallback>AS</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">Alice Johnson</p>
                                <p className="text-sm text-muted-foreground">Community Leader</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </section>
);

const faqItems = [
    {
        question: "Is my personal data safe?",
        answer: "Absolutely. We prioritize your privacy. Your personal information is only used to verify your account and is never shared publicly. All reports on the public dashboard are anonymized."
    },
    {
        question: "How does the AI verification work?",
        answer: "When you upload an image or video, our AI model analyzes it to identify the type of issue (e.g., pothole, garbage) and assesses its severity. This helps ensure that reports are accurate and routed to the correct department efficiently."
    },
    {
        question: "What happens after I submit a report?",
        answer: "Once your report is verified, it's added to a public queue and flagged for the relevant local authorities. You can track the status of your report in the 'View Complaints' section of the app until it is marked as 'Resolved'."
    },
    {
        question: "Can I report issues in any location?",
        answer: "Currently, our service is focused on specific municipalities. You can report any issue within the designated service areas. We are continuously working to expand our coverage."
    }
]

const FaqSection = () => (
    <section className="py-20 md:py-24">
        <div className="container mx-auto max-w-4xl">
            <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                    Have questions? We've got answers.
                </p>
            </div>
            <Accordion type="single" collapsible className="w-full mt-12">
                {faqItems.map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-lg">{item.question}</AccordionTrigger>
                        <AccordionContent className="text-base text-muted-foreground">
                            {item.answer}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
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
        return (
          <>
            <HeroSection onStartReport={() => setActiveView('report')} />
            <FeatureSection />
            <HowItWorksSection />
            <TestimonialsSection />
            <FaqSection />
          </>
        );
      case 'report':
        return <div className="flex justify-center"><EnviroCheckForm /></div>;
      case 'view':
        return <ComplaintsView />;
      case 'route':
        return <RouteCheckView />;
      case 'dashboard':
        return <DashboardView />;
      default:
        return <HeroSection onStartReport={() => setActiveView('report')} />;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
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

      <main>
         <section id="reporting-tool" className={`py-12 ${activeView === 'report' ? 'flex justify-center' : ''}`}>
            <div className={activeView !== 'home' ? "container mt-6" : ""}>
                {renderView()}
            </div>
         </section>
      </main>
    </>
  );
}

    