"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Search } from 'lucide-react';
import { listenToAllReports } from '@/lib/firebase/service';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import dynamic from 'next/dynamic';
import { LatLngExpression } from 'leaflet';
import { useToast } from '@/hooks/use-toast';

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
    const { toast } = useToast();
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [startLocation, setStartLocation] = useState('');
    const [destination, setDestination] = useState('');
    const [route, setRoute] = useState<LatLngExpression[]>([]);

    useEffect(() => {
        const unsubscribe = listenToAllReports((reportsFromDb) => {
            const formattedComplaints: Complaint[] = reportsFromDb
              .filter((report: any) => report.location)
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

    const parseCoordinates = (location: string): LatLngExpression | null => {
        const parts = location.split(',').map(p => p.trim());
        if (parts.length !== 2) return null;

        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);

        if (isNaN(lat) || isNaN(lng)) return null;

        return [lat, lng];
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        
        const startPoint = startLocation ? parseCoordinates(startLocation) : null;
        const endPoint = destination ? parseCoordinates(destination) : null;

        const newRoute = [startPoint, endPoint].filter(Boolean) as LatLngExpression[];
        
        if (startLocation && !startPoint) {
             toast({ variant: 'destructive', title: "Invalid Start Location", description: "Please use 'lat, lon' format." });
             return;
        }
        if (destination && !endPoint) {
            toast({ variant: 'destructive', title: "Invalid Destination", description: "Please use 'lat, lon' format." });
            return;
       }

        setRoute(newRoute);
        
        if (newRoute.length > 0) {
            toast({ title: "Route Updated", description: "The map has been updated to show the specified points." });
        } else {
            toast({ title: "Map Reset", description: "Showing all complaints." });
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">All Public Complaints</CardTitle>
                <CardDescription>
                    View all issues reported by the community. Enter coordinates to see the route highlighted.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSearch} className="mb-6 p-4 border rounded-lg bg-secondary/50">
                    <div className="grid sm:grid-cols-2 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="start-location">Start Location (Lat, Lng)</Label>
                            <Input 
                                id="start-location"
                                placeholder="e.g., 40.7128, -74.0060" 
                                value={startLocation}
                                onChange={(e) => setStartLocation(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="destination">Destination (Lat, Lng)</Label>
                            <Input 
                                id="destination"
                                placeholder="e.g., 34.0522, -118.2437" 
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
                        <MapView complaints={complaints} route={route} />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
