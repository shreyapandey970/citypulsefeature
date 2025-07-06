"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PotholeIcon } from "@/components/icons/pothole-icon";
import { Trash2, LightbulbOff, TreeDeciduous, Search, MapPin, Loader2 } from 'lucide-react';

import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { LatLngExpression, divIcon } from 'leaflet';

const MOCK_COMPLAINTS = [
    { id: '1', issueType: 'pothole' as const, location: '40.7128, -74.0060', severity: 'high' as const, description: 'Large pothole on main street, very dangerous.', imageUrl: 'https://placehold.co/150x100.png', dataAiHint: 'pothole road' },
    { id: '2', issueType: 'garbage' as const, location: '40.7135, -74.0072', severity: 'medium' as const, description: 'Overflowing trash can at park entrance, attracting pests.', imageUrl: 'https://placehold.co/150x100.png', dataAiHint: 'garbage park' },
    { id: '3', issueType: 'streetlight' as const, location: '40.7140, -74.0080', severity: 'high' as const, description: 'Streetlight out at a busy intersection.', imageUrl: 'https://placehold.co/150x100.png', dataAiHint: 'streetlight dark' },
    { id: '4', issueType: 'fallen_tree' as const, location: '40.7150, -74.0090', severity: 'low' as const, description: 'Small branch blocking a portion of the sidewalk.', imageUrl: 'https://placehold.co/150x100.png', dataAiHint: 'fallen tree' },
    { id: '5', issueType: 'pothole' as const, location: '40.7160, -74.0100', severity: 'medium' as const, description: 'Cluster of small potholes on a residential street.', imageUrl: 'https://placehold.co/150x100.png', dataAiHint: 'pothole street' },
];

type Complaint = typeof MOCK_COMPLAINTS[0];

const IssueIcon = ({ issueType, className }: { issueType: Complaint['issueType'], className?: string }) => {
    const classes = className || "w-5 h-5 text-primary";
    switch (issueType) {
        case 'pothole': return <PotholeIcon className={classes} />;
        case 'garbage': return <Trash2 className={classes} />;
        case 'streetlight': return <LightbulbOff className={classes} />;
        case 'fallen_tree': return <TreeDeciduous className={classes} />;
        default: return null;
    }
}

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then(mod => mod.useMap), { ssr: false });

const getIconSvg = (issueType: Complaint['issueType']) => {
    const strokeColor = "hsl(var(--primary))";
    const commonSvgProps = `xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;

    switch (issueType) {
        case 'pothole': 
            return `<svg ${commonSvgProps}><path d="M12 4a8 8 0 0 0-8 8c0 2.5.83 5.17 3 6.5" /><path d="M12 4a8 8 0 0 1 8 8c0 2.5-.83 5.17-3 6.5" /><path d="M7 18.5c1.33-1 2.67-1.5 4-1.5s2.67.5 4 1.5" /><path d="M10 13l-1 2.5" /><path d="M14 13l1 2.5" /><path d="M12 17V10" /></svg>`;
        case 'garbage': 
            return `<svg ${commonSvgProps}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
        case 'streetlight': 
            return `<svg ${commonSvgProps}><path d="M9 18h6"/><path d="M10 22h4"/><path d="m2 2 20 20"/><path d="M12 14a4 4 0 0 0-3.34-3.91"/><path d="M4 12a8.01 8.01 0 0 0 8.01 8.01c1.1 0 2.15-.22 3.12-.62"/><path d="M12.23 7.82A6.002 6.002 0 0 1 18 12a5.98 5.98 0 0 1-1.48 3.81"/><path d="M2 12A8.01 8.01 0 0 1 7.82 4.23"/><path d="m15 6-3.4 3.4"/></svg>`;
        case 'fallen_tree': 
            return `<svg ${commonSvgProps}><path d="M8 13h8"/><path d="M12 22V8"/><path d="M18.8 6.4a2.4 2.4 0 0 0-3.2 0L12 10l-3.6-3.6a2.4 2.4 0 0 0-3.2 0L4 7.6l2.8 2.8a2.4 2.4 0 0 0 3.2 0L12 8l2.4 2.4a2.4 2.4 0 0 0 3.2 0L20 7.6l-1.2-1.2z"/></svg>`;
        default: 
            return '';
    }
}

const createIssueIcon = (complaint: Complaint) => {
    const iconSvg = getIconSvg(complaint.issueType);
    return divIcon({
        html: `<div style="padding: 0.5rem; background-color: hsl(var(--background)); border-radius: 9999px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); border: 1px solid hsl(var(--primary)); display: flex; align-items: center; justify-content: center;">${iconSvg}</div>`,
        className: 'bg-transparent border-0',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });
};

function MapContentUpdater({ complaints }: { complaints: Complaint[] }) {
    const map = useMap();
    useEffect(() => {
        if (complaints.length > 0) {
            const [lat, lng] = complaints[0].location.split(',').map(Number);
            map.flyTo([lat, lng], 14);
        }
    }, [complaints, map]);

    return (
        <>
            {complaints.map(complaint => {
                const position = complaint.location.split(',').map(Number) as LatLngExpression;
                return (
                    <Marker key={complaint.id} position={position} icon={createIssueIcon(complaint)}>
                        <Popup>
                            <div className="font-semibold capitalize">{complaint.issueType.replace(/_/g, ' ')}</div>
                            <p>{complaint.description}</p>
                        </Popup>
                    </Marker>
                )
            })}
        </>
    );
}

const ComplaintsMap = ({ complaints }: { complaints: Complaint[] }) => {
    const center: LatLngExpression = [40.7128, -74.0060]; // Default center

    return (
        <div className="h-[400px] w-full rounded-md overflow-hidden border">
            <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapContentUpdater complaints={complaints} />
            </MapContainer>
        </div>
    );
};


export function ComplaintsView() {
    const [startPoint, setStartPoint] = useState('');
    const [destination, setDestination] = useState('');
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSearching(true);
        if (!searched) {
            setSearched(true);
        }
        // In a real app, you'd fetch data based on the route.
        // For now, we'll just show the mock data after a short delay.
        setTimeout(() => {
            setComplaints(MOCK_COMPLAINTS);
            setIsSearching(false);
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

                {searched && (
                    <div className="relative">
                        {isSearching && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-12 bg-background/80 rounded-md">
                                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                                <p className="text-lg text-muted-foreground font-semibold">
                                    Finding complaints on your route...
                                </p>
                            </div>
                        )}
                        
                        <div className={isSearching ? 'opacity-0' : 'opacity-100 transition-opacity'}>
                            <ComplaintsMap complaints={complaints} />

                            {complaints.length > 0 ? (
                               <div className="space-y-4 mt-8">
                                    {complaints.map(complaint => (
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
                                    ))}
                                </div>
                            ) : (
                                !isSearching && <div className="text-center p-12 text-muted-foreground">
                                    <p>No complaints found for the specified route.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
