import { EnviroCheckForm } from '@/components/enviro-check-form';
import { Leaf } from 'lucide-react';

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
          Help keep our environment clean. Report potholes and garbage with AI
          assistance.
        </p>
      </header>
      <EnviroCheckForm />
    </main>
  );
}
