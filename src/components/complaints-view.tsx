"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PotholeIcon } from "@/components/icons/pothole-icon";
import { Trash2, LightbulbOff, TreeDeciduous, Loader2, MapPin, Clock, CheckCircle, Hourglass } from 'lucide-react';
import { listenToUserReports, updateReportStatus } from '@/lib/firebase/service';
import { formatDistance, format } from 'date-fns';

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
    resolvedTime?: Date;
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

const calculateTimeDifference = (start: Date, end: Date) => {
    return formatDistance(end, start, { addSuffix: false });
};

const StatusActions = ({ id, currentStatus }: { id: string, currentStatus: Status }) => {
    if (currentStatus === 'resolved') {
        return null;
    }

    const nextStatus = currentStatus === 'pending' ? 'in progress' : 'resolved';
    const buttonText = currentStatus === 'pending' ? 'Start Progress' : 'Mark as Resolved';

    return (
        <Button size="sm" onClick={() => updateReportStatus(id, nextStatus)}>
            {buttonText}
        </Button>
    )
}

export function ComplaintsView() {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = listenToUserReports((reportsFromDb) => {
            const formattedComplaints: Complaint[] = reportsFromDb.map((report: any) => ({
                id: report.id,
                issueType: report.issueType,
                location: report.location,
                severity: report.assessmentResult?.severity || 'low',
                description: report.assessmentResult?.justification || 'Awaiting assessment...',
                imageUrl: report.imageDataUri,
                dataAiHint: report.issueType,
                complaintTime: report.complaintTime,
                resolvedTime: report.resolvedTime,
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


    const renderComplaints = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center text-center p-12">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <p className="text-lg text-muted-foreground font-semibold">
                        Loading your complaints...
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
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        <span>
                                            Resolution Time: {complaint.resolvedTime && complaint.complaintTime ? calculateTimeDifference(complaint.complaintTime, complaint.resolvedTime) : 'Not yet resolved'}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <StatusActions id={complaint.id} currentStatus={complaint.status} />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            );
        }
        
        return (
            <div className="text-center p-12 text-muted-foreground bg-secondary/30 rounded-md">
                <p>No complaints found. Be the first to submit one!</p>
            </div>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Your Complaint Feed</CardTitle>
                <CardDescription>
                    Your reported issues are shown here in real-time.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mt-6">
                    {renderComplaints()}
                </div>
            </CardContent>
        </Card>
    );
}
