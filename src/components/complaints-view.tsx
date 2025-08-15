"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge";
import { PotholeIcon } from "@/components/icons/pothole-icon";
import { Trash2, LightbulbOff, TreeDeciduous, Loader2, MapPin, Clock, CheckCircle, Hourglass, Trash, AlertTriangle } from 'lucide-react';
import { listenToUserReports, deleteReport, updateReportEscalation } from '@/lib/firebase/service';
import { formatDistance, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

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
    isEscalated?: boolean;
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

const EscalateButton = ({ reportId }: { reportId: string }) => {
    const { toast } = useToast();
    const [isEscalating, setIsEscalating] = useState(false);

    const handleEscalate = async () => {
        setIsEscalating(true);
        try {
            await updateReportEscalation(reportId);
            toast({
                title: 'Complaint Escalated',
                description: 'Your report has been flagged for immediate attention.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to escalate the complaint.',
            });
            console.error(error);
        } finally {
            setIsEscalating(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="secondary" size="sm" disabled={isEscalating}>
                    {isEscalating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                    Escalate
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Escalate this Complaint?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will flag the report for urgent review by the administration.
                        Only use this if no action has been taken.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEscalate}>Yes, Escalate</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )

}


const WithdrawButton = ({ reportId }: { reportId: string }) => {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleWithdraw = async () => {
        setIsDeleting(true);
        try {
            await deleteReport(reportId);
            toast({
                title: 'Complaint Withdrawn',
                description: 'Your report has been successfully deleted.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to withdraw the complaint.',
            });
            console.error(error);
        }
        // No need to set isDeleting to false, as the component will unmount on success
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2 h-4 w-4" />}
                    Withdraw
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your complaint
                        from our servers.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleWithdraw}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

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
                isEscalated: report.isEscalated || false,
            }));
            // Sort by complaint time, newest first
            formattedComplaints.sort((a, b) => (b.complaintTime?.getTime() || 0) - (a.complaintTime?.getTime() || 0));
            setComplaints(formattedComplaints);
            setIsLoading(false);
        });

        // Cleanup subscription on component unmount
        return () => unsubscribe();
    }, []);

    const isOver24Hours = (complaintTime?: Date) => {
        if (!complaintTime) return false;
        const hours = (new Date().getTime() - complaintTime.getTime()) / (1000 * 60 * 60);
        return hours > 24;
    }


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
                                        {complaint.isEscalated && <Badge variant="destructive">Escalated</Badge>}
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
                                <div className="mt-4 flex justify-end gap-2">
                                    {complaint.status === 'pending' && isOver24Hours(complaint.complaintTime) && !complaint.isEscalated && (
                                        <EscalateButton reportId={complaint.id} />
                                     )}
                                     <WithdrawButton reportId={complaint.id} />
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
                    Your reported issues are shown here in real-time. You can withdraw a complaint if it's no longer relevant or escalate if it's not addressed.
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
