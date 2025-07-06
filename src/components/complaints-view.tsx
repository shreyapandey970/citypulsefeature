"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PotholeIcon } from "@/components/icons/pothole-icon";
import { Trash2, LightbulbOff, TreeDeciduous, Search, MapPin, Loader2 } from 'lucide-react';

const MOCK_COMPLAINTS = [
    { id: '1', issueType: 'pothole' as const, location: '40.7128, -74.0060', severity: 'high' as const, description: 'Large pothole on main street, very dangerous.', imageUrl: 'https://placehold.co/150x100.png', dataAiHint: 'pothole road' },
    { id: '2', issueType: 'garbage' as const, location: '40.7135, -74.0072', severity: 'medium' as const, description: 'Overflowing trash can at park entrance, attracting pests.', imageUrl: 'https://placehold.co/150x100.png', dataAiHint: 'garbage park' },
    { id: '3', issueType: 'streetlight' as const, location: '40.7140, -74.0080', severity: 'high' as const, description: 'Streetlight out at a busy intersection.', imageUrl: 'https://placehold.co/150x100.png', dataAiHint: 'streetlight dark' },
    { id: '4', issueType: 'fallen_tree' as const, location: '40.7150, -74.0090', severity: 'low' as const, description: 'Small branch blocking a portion of the sidewalk.', imageUrl: 'https://placehold.co/150x100.png', dataAiHint: 'fallen tree' },
    { id: '5', issueType: 'pothole' as const, location: '40.7160, -74.0100', severity: 'medium' as const, description: 'Cluster of small potholes on a residential street.', imageUrl: 'https://placehold.co/150x100.png', dataAiHint: 'pothole street' },
];

type Complaint = typeof MOCK_COMPLAINTS[0];

const IssueIcon = ({ issueType }: { issueType: Complaint['issueType'] }) => {
    switch (issueType) {
        case 'pothole': return <PotholeIcon className="w-5 h-5 text-primary" />;
        case 'garbage': return <Trash2 className="w-5 h-5 text-primary" />;
        case 'streetlight': return <LightbulbOff className="w-5 h-5 text-primary" />;
        case 'fallen_tree': return <TreeDeciduous className="w-5 h-5 text-primary" />;
        default: return null;
    }
}

export function ComplaintsView() {
    const [startPoint, setStartPoint] = useState('');
    const [destination, setDestination] = useState('');
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSearching(true);
        setSearched(false);
        setComplaints([]);
        // In a real app, you'd fetch data based on the route.
        // For now, we'll just show the mock data after a short delay.
        setTimeout(() => {
            setComplaints(MOCK_COMPLAINTS);
            setIsSearching(false);
            setSearched(true);
        }, 1500);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">View Complaints on Route</CardTitle>
                <CardDescription>
                    Enter a start and destination to see reported issues along your route.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-8">
                    <Input 
                        placeholder="Start point, e.g., 'City Hall, New York'" 
                        value={startPoint} 
                        onChange={(e) => setStartPoint(e.target.value)}
                        required
                    />
                    <Input 
                        placeholder="Destination, e.g., 'Central Park, New York'" 
                        value={destination} 
                        onChange={(e) => setDestination(e.target.value)}
                        required
                    />
                    <Button type="submit" disabled={isSearching || !startPoint || !destination} className="sm:w-auto w-full">
                        {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        {isSearching ? 'Searching...' : 'Search'}
                    </Button>
                </form>

                <div className="space-y-4">
                    {isSearching && (
                        <div className="flex flex-col items-center justify-center text-center p-12">
                            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                            <p className="text-lg text-muted-foreground font-semibold">
                                Finding complaints on your route...
                            </p>
                        </div>
                    )}

                    {!isSearching && searched && complaints.length === 0 && (
                        <div className="text-center p-12 text-muted-foreground">
                            <p>No complaints found for the specified route.</p>
                        </div>
                    )}
                    
                    {!isSearching && complaints.length > 0 && (
                        complaints.map(complaint => (
                            <Card key={complaint.id} className="flex flex-col sm:flex-row items-start gap-4 p-4 hover:bg-secondary/50 transition-colors">
                                <Image 
                                    src={complaint.imageUrl}
                                    alt={complaint.issueType}
                                    width={150}
                                    height={100}
                                    className="rounded-md object-cover w-full sm:w-[150px] aspect-[3/2] sm:aspect-auto"
                                    data-ai-hint={complaint.dataAiHint}
                                />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <IssueIcon issueType={complaint.issueType} />
                                            <h3 className="font-semibold capitalize text-lg">
                                                {complaint.issueType.replace(/_/g, ' ')}
                                            </h3>
                                        </div>
                                        <Badge
                                            variant={
                                                complaint.severity === 'high' ? 'destructive' :
                                                complaint.severity === 'medium' ? 'secondary' : 'default'
                                            }
                                            className="capitalize"
                                        >
                                            {complaint.severity}
                                        </Badge>
                                    </div>
                                    <p className="text-muted-foreground mt-1 text-sm">{complaint.description}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                                        <MapPin className="w-4 h-4" />
                                        <span>{complaint.location}</span>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
