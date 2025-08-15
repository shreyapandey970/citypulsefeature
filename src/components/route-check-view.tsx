"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Search } from 'lucide-react';
import { listenToAllReports } from '@/lib/firebase/service';
import { geocodeLocation } from '@/ai/flows/geocode-location';
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
    const [isSearching, setIsSearching] = useState(false);
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

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSearching(true);
        
        let startPoint: LatLngExpression | null = null;
        let endPoint: LatLngExpression | null = null;

        try {
            if (startLocation) {
                const startResult = await geocodeLocation({ locationName: startLocation });
                startPoint = [startResult.latitude, startResult.longitude];
            }
            if (destination) {
                const endResult = await geocodeLocation({ locationName: destination });
                endPoint = [endResult.latitude, endResult.longitude];
            }

            const newRoute = [startPoint, endPoint].filter(Boolean) as LatLngExpression[];
            setRoute(newRoute);
            
            if (newRoute.length > 0) {
                toast({ title: "Route Updated", description: "The map has been updated to show the specified points." });
            } else {
                setRoute([]); // Clear route if no valid locations are found
                toast({ title: "Map Reset", description: "Showing all complaints. Could not find coordinates for the entered locations." });
            }

        } catch (error) {
            console.error("Geocoding failed:", error);
            setRoute([]);
            toast({ 
                variant: 'destructive', 
                title: "Geocoding Failed", 
                description: "Could not find coordinates for the entered location(s). Please try being more specific." 
            });
        } finally {
            setIsSearching(false);
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">All Public Complaints</CardTitle>
                <CardDescription>
                    View all issues reported by the community. Enter a start and destination to see the route highlighted.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSearch} className="mb-6 p-4 border rounded-lg bg-secondary/50">
                    <div className="grid sm:grid-cols-2 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="start-location">Start Location</Label>
                            <Input 
                                id="start-location"
                                placeholder="e.g., Kurla, Mumbai" 
                                value={startLocation}
                                onChange={(e) => setStartLocation(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="destination">Destination</Label>
                            <Input 
                                id="destination"
                                placeholder="e.g., Gateway of India" 
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full sm:w-auto sm:col-span-2 justify-self-end" disabled={isSearching}>
                            {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
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
