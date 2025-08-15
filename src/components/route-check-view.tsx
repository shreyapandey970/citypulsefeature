"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PotholeIcon } from "@/components/icons/pothole-icon";
import { Trash2, LightbulbOff, TreeDeciduous, Loader2, MapPin, Clock, CheckCircle, Hourglass, Search } from 'lucide-react';
import { listenToAllReports } from '@/lib/firebase/service';
import { formatDistance, format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type IssueType = 'pothole' | 'garbage' | 'streetlight' | 'fallen_tree' | 'other';
type Status = 'pending' | 'in progress' | 'resolved';

type Complaint = {
    id: string;
    issueType: IssueType;
    location: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    imageUrl: string;
    dataAiHint?: string;
    complaintTime?: Date;
    status: Status;
};

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

export function RouteCheckView() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [startLocation, setStartLocation] = useState('');
    const [destination, setDestination] = useState('');

    useEffect(() => {
        // Listen to all reports from all users
        const unsubscribe = listenToAllReports((reportsFromDb) => {
            const formattedComplaints: Complaint[] = reportsFromDb.map((report: any) => ({
                id: report.id,
                issueType: report.issueType,
                location: report.location,
                severity: report.assessmentResult?.severity || 'low',
                description: report.assessmentResult?.justification || 'Awaiting assessment...',
                imageUrl: report.imageDataUri,
                dataAiHint: report.issueType,
                complaintTime: report.complaintTime,
                status: report.status,
            }));
            // Sort by complaint time, newest first
            formattedComplaints.sort((a, b) => (b.complaintTime?.getTime() || 0) - (a.complaintTime?.getTime() || 0));
            setComplaints(formattedComplaints);
            setIsLoading(false);
        });

        // Cleanup subscription on component unmount
        return () => unsubscribe();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // NOTE: In a real implementation, this would trigger a search against a mapping/routing API
        // and then filter the complaints based on the route.
        // For now, it doesn't do anything as we don't have that integration.
        console.log(`Searching route from ${startLocation} to ${destination}`);
    };

    const renderAllComplaints = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center text-center p-12">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <p className="text-lg text-muted-foreground font-semibold">
                        Loading all reported issues...
                    </p>
                </div>
            );
        }

        if (complaints.length > 0) {
            return (
                <div className="space-y-4">
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
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground mt-3">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        <span>{complaint.location}</span>
                                    </div>
                                    <div className="flex items-center gap-2" title={complaint.complaintTime ? format(complaint.complaintTime, 'PPP p') : 'Unknown'}>
                                        <Clock className="w-4 h-4" />
                                        <span>Reported: {complaint.complaintTime ? formatDistance(complaint.complaintTime, new Date(), { addSuffix: true }) : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {complaint.status === 'resolved' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Hourglass className="w-4 h-4 text-orange-500" />}
                                        <span className="capitalize">{complaint.status}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            );
        }
        
        return (
            <div className="text-center p-12 text-muted-foreground bg-secondary/30 rounded-md">
                <p>No complaints have been reported yet.</p>
            </div>
        );
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
                    {renderAllComplaints()}
                </div>
            </CardContent>
        </Card>
    );
}
