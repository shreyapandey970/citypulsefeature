"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PotholeIcon } from "@/components/icons/pothole-icon";
import { Trash2, LightbulbOff, TreeDeciduous, Search, MapPin, Loader2 } from 'lucide-react';
import { getReports } from '@/lib/firebase/service';

type IssueType = 'pothole' | 'garbage' | 'streetlight' | 'fallen_tree' | 'other';

type Complaint = {
    id: string;
    issueType: IssueType;
    location: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    imageUrl: string;
    dataAiHint?: string;
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

export function ComplaintsView() {
    const [startPoint, setStartPoint] = useState('');
    const [destination, setDestination] = useState('');
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchAttempted, setSearchAttempted] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSearching(true);
        setSearchAttempted(true);
        try {
            const reportsFromDb = await getReports();
            const formattedComplaints: Complaint[] = reportsFromDb.map((report: any) => ({
                id: report.id,
                issueType: report.issueType,
                location: report.location,
                severity: report.assessmentResult.severity,
                description: report.assessmentResult.justification,
                imageUrl: report.imageDataUri,
                dataAiHint: report.issueType,
            }));
            setComplaints(formattedComplaints);
        } catch (error) {
            console.error("Failed to fetch complaints:", error);
            setComplaints([]);
        } finally {
            setIsSearching(false);
        }
    };

    const renderComplaints = () => {
        if (isSearching) {
            return (
                <div className="flex flex-col items-center justify-center text-center p-12">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <p className="text-lg text-muted-foreground font-semibold">
                        Finding complaints...
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
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                                    <MapPin className="w-4 h-4" />
                                    <span>{complaint.location}</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            );
        }
        
        if (searchAttempted) {
            return (
                <div className="text-center p-12 text-muted-foreground bg-secondary/30 rounded-md">
                    <p>No complaints found. Be the first to submit one!</p>
                </div>
            );
        }

        return null; // Don't show anything before the first search
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">View All Complaints</CardTitle>
                <CardDescription>
                    Click search to see all reported issues.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-6">
                    <Input 
                        placeholder="Start point, e.g., 'City Hall, New York'" 
                        value={startPoint} 
                        onChange={(e) => setStartPoint(e.target.value)}
                    />
                    <Input 
                        placeholder="Destination, e.g., 'Central Park, New York'" 
                        value={destination} 
                        onChange={(e) => setDestination(e.target.value)}
                    />
                    <Button type="submit" disabled={isSearching} className="sm:w-auto w-full">
                        {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        {isSearching ? 'Searching...' : 'Search'}
                    </Button>
                </form>
                <div className="mt-6">
                    {renderComplaints()}
                </div>
            </CardContent>
        </Card>
    );
}
