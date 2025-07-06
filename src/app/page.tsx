import { EnviroCheckForm } from '@/components/enviro-check-form';
import { ComplaintsView } from '@/components/complaints-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, ListChecks } from 'lucide-react';

export default function Home() {
  return (
    <main className="container mx-auto max-w-2xl py-12 px-4">
      <header className="text-center mb-8">
        <div className="inline-flex items-center gap-3">
          <div className="p-3 bg-primary/20 rounded-lg">
            <Leaf className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-foreground">
            EnviroCheck
          </h1>
        </div>
        <p className="text-muted-foreground mt-2 text-lg">
          Help keep our environment clean. Report issues or view existing ones on your route.
        </p>
      </header>
      
      <Tabs defaultValue="report" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="report">
            <Leaf className="mr-2 h-4 w-4" />
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
