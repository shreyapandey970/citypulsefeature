"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Search } from 'lucide-react';
import { listenToAllReports } from '@/lib/firebase/service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/map-view').then(mod => mod.MapView), { 
    ssr: false,
    loading: () => <div className="h-[500px] w-full bg-secondary rounded-lg flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
});

type IssueType = 'pothole' | 'garbage' | 'streetlight' | 'fallen_tree' | 'other';
type Status = 'pending' | 'in progress' | 'resolved';

type Complaint = {
    id: string;
    issueType: IssueType;
    location: string;
    severity: 'high' | 'medium' | 'low';
    imageUrl: string;
    status: Status;
};

export function RouteCheckView() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [startLocation, setStartLocation] = useState('');
    const [destination, setDestination] = useState('');

    useEffect(() => {
        const unsubscribe = listenToAllReports((reportsFromDb) => {
            const formattedComplaints: Complaint[] = reportsFromDb
              .filter((report: any) => report.location) // Filter out reports without a location
              .map((report: any) => ({
                id: report.id,
                issueType: report.issueType,
                location: report.location,
                severity: report.assessmentResult?.severity || 'low',
                imageUrl: report.imageDataUri,
                status: report.status,
            }));
            setComplaints(formattedComplaints);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        console.log(`Searching route from ${startLocation} to ${destination}`);
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">All Public Complaints</CardTitle>
                <CardDescription>
                    View all issues reported by the community to plan your route.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSearch} className="mb-6 p-4 border rounded-lg bg-secondary/50">
                    <div className="grid sm:grid-cols-2 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="start-location">Start Location</Label>
                            <Input 
                                id="start-location"
                                placeholder="Enter starting point..." 
                                value={startLocation}
                                onChange={(e) => setStartLocation(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="destination">Destination</Label>
                            <Input 
                                id="destination"
                                placeholder="Enter destination..." 
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full sm:w-auto sm:col-span-2 justify-self-end">
                            <Search className="mr-2 h-4 w-4" />
                            Find Issues on Route
                        </Button>
                    </div>
                </form>

                <div className="mt-6">
                    {isLoading ? (
                         <div className="h-[500px] w-full bg-secondary rounded-lg flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
                    ) : (
                        <MapView complaints={complaints} />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
