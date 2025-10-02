
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { listenToAllReports, updateReportStatus, signOutUser, mergeReports } from '@/lib/firebase/service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, LogOut, CheckCircle, Hourglass, Settings, AlertTriangle, Merge, Trash2, Group } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { NotifyAuthorityButton } from '@/components/notify-button';


type IssueType = 'pothole' | 'garbage' | 'streetlight' | 'fallen_tree' | 'other';
type Status = 'pending' | 'in progress' | 'resolved';

export type Complaint = {
    id: string;
    userId: string;
    issueType: IssueType;
    location: string;
    latitude?: number;
    longitude?: number;
    severity: 'high' | 'medium' | 'low';
    imageUrl: string;
    status: Status;
    complaintTime?: Date;
    isEscalated?: boolean;
    isDuplicate?: boolean;
    duplicates?: string[];
};

const getCoordinates = (location: string): [number, number] | null => {
    const parts = location.split(',').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [parts[0], parts[1]];
    }
    return null;
}

const haversineDistance = (coords1: [number, number], coords2: [number, number]) => {
    const R = 6371e3; // metres
    const φ1 = coords1[0] * Math.PI/180;
    const φ2 = coords2[0] * Math.PI/180;
    const Δφ = (coords2[0]-coords1[0]) * Math.PI/180;
    const Δλ = (coords2[1]-coords1[1]) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
}

const groupDuplicateReports = (reports: Complaint[], distanceThreshold: number = 50): Complaint[][] => {
    const nonDuplicateReports = reports.filter(r => !r.isDuplicate);
    const groups: Complaint[][] = [];
    const visited = new Set<string>();

    for (const report of nonDuplicateReports) {
        if (visited.has(report.id)) continue;

        const group = [report];
        visited.add(report.id);
        const reportCoords = getCoordinates(report.location);
        if (!reportCoords) continue;

        for (const otherReport of nonDuplicateReports) {
            if (visited.has(otherReport.id) || report.id === otherReport.id) continue;
            
            if (report.issueType === otherReport.issueType) {
                const otherCoords = getCoordinates(otherReport.location);
                if (otherCoords) {
                    const distance = haversineDistance(reportCoords, otherCoords);
                    if (distance < distanceThreshold) {
                        group.push(otherReport);
                        visited.add(otherReport.id);
                    }
                }
            }
        }
        if (group.length > 1) {
            groups.push(group);
        }
    }

    return groups;
};

const StatusCell = ({ reportId, currentStatus }: { reportId: string, currentStatus: Status }) => {
    const { toast } = useToast();
    const [status, setStatus] = useState<Status>(currentStatus);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusChange = async (newStatus: Status) => {
        setIsUpdating(true);
        try {
            await updateReportStatus(reportId, newStatus);
            setStatus(newStatus);
            toast({
                title: "Status Updated",
                description: `Report status changed to ${newStatus}.`,
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Update Failed",
                description: "Could not update the report status.",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusColor = (status: Status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-500';
            case 'in progress': return 'bg-blue-500';
            case 'resolved': return 'bg-green-500';
        }
    };

    return (
        <div className="flex items-center gap-2">
             <Select value={status} onValueChange={(value) => handleStatusChange(value as Status)} disabled={isUpdating}>
                <SelectTrigger className="w-[150px]">
                    <SelectValue>
                         <div className="flex items-center">
                            <span className={`h-2 w-2 rounded-full mr-2 ${getStatusColor(status)}`}></span>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </div>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="pending">
                        <div className="flex items-center"><Hourglass className="mr-2 h-4 w-4"/>Pending</div>
                    </SelectItem>
                    <SelectItem value="in progress">
                        <div className="flex items-center"><Settings className="mr-2 h-4 w-4 animate-spin"/>In Progress</div>
                    </SelectItem>
                    <SelectItem value="resolved">
                        <div className="flex items-center"><CheckCircle className="mr-2 h-4 w-4"/>Resolved</div>
                    </SelectItem>
                </SelectContent>
            </Select>
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
    );
};

const MergeGroup = ({ group, onMergeSuccess }: { group: Complaint[], onMergeSuccess: () => void }) => {
    const { toast } = useToast();
    const [primaryReport, setPrimaryReport] = useState<string | null>(null);
    const [isMerging, setIsMerging] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleMerge = async () => {
        if (!primaryReport) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a primary report to keep.' });
            return;
        }

        setIsMerging(true);
        const duplicateIds = group.map(g => g.id).filter(id => id !== primaryReport);

        try {
            await mergeReports(primaryReport, duplicateIds);

            toast({
                title: 'Merge Successful',
                description: `${duplicateIds.length} duplicate report(s) have been merged.`,
            });
            onMergeSuccess();
            setIsOpen(false);
            
        } catch (error) {
            console.error("Error merging reports:", error);
            toast({ variant: 'destructive', title: 'Merge Failed', description: 'Could not merge reports.' });
        } finally {
            setIsMerging(false);
        }
    }
    
    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button size="sm">
                    <Merge className="mr-2 h-4 w-4" />
                    Merge {group.length} Duplicates
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>Merge Duplicate Reports</AlertDialogTitle>
                    <AlertDialogDescription>
                        We've identified {group.length} similar reports. Please select one to be the primary report. The others will be marked as duplicates and linked to this one.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="max-h-[60vh] overflow-y-auto p-1">
                    <RadioGroup onValueChange={setPrimaryReport} className="space-y-4">
                    {group.map(report => (
                        <Label key={report.id} htmlFor={report.id} className="flex gap-4 items-start p-4 border rounded-md cursor-pointer has-[:checked]:bg-secondary">
                            <RadioGroupItem value={report.id} id={report.id} className="mt-1"/>
                            <div className="grid grid-cols-[100px_1fr] gap-4 flex-1">
                                <Image
                                    src={report.imageUrl}
                                    alt={report.issueType}
                                    width={100}
                                    height={66}
                                    className="rounded-md object-cover"
                                />
                                <div className="text-sm">
                                    <p className="font-semibold capitalize">{report.issueType.replace(/_/g, ' ')}</p>
                                    <p className="text-muted-foreground">{report.location}</p>
                                    <p className="text-muted-foreground">Severity: {report.severity}</p>
                                    <p className="text-muted-foreground">Submitted: {report.complaintTime ? formatDistanceToNow(report.complaintTime, { addSuffix: true }) : 'N/A'}</p>
                                </div>
                            </div>
                        </Label>
                    ))}
                    </RadioGroup>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPrimaryReport(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleMerge} disabled={!primaryReport || isMerging}>
                        {isMerging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Merge className="mr-2 h-4 w-4" />}
                        Merge Reports
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};


export default function AdminPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<Complaint[]>([]);
    
    const [isClient, setIsClient] = useState(false);
    useEffect(() => setIsClient(true), []);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user && user.email === 'admin@gmail.com') {
                setUser(user);
            } else {
                router.push('/login');
            }
            // Keep loading false until report subscription is also done
        });

        const unsubscribeReports = listenToAllReports((reportsFromDb) => {
            const formattedReports: Complaint[] = reportsFromDb.map((report: any) => ({
                id: report.id,
                userId: report.userId,
                issueType: report.issueType,
                location: report.location,
                severity: report.assessmentResult?.severity || 'low',
                imageUrl: report.imageDataUri,
                status: report.status,
                complaintTime: report.complaintTime,
                isEscalated: report.isEscalated || false,
                isDuplicate: report.isDuplicate || false,
                duplicates: report.duplicates || [],
            }));
            
            // Sort escalated reports to the top, then by time
            formattedReports.sort((a, b) => {
                if (a.isEscalated && !b.isEscalated) return -1;
                if (!a.isEscalated && b.isEscalated) return 1;
                return (b.complaintTime?.getTime() || 0) - (a.complaintTime?.getTime() || 0);
            });
            setReports(formattedReports);
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeReports();
        };
    }, [router]);
    
    const duplicateGroups = useMemo(() => {
        if (!isClient) return [];
        return groupDuplicateReports(reports)
    }, [reports, isClient]);

    const nonDuplicateReports = useMemo(() => {
        const duplicateIds = new Set(duplicateGroups.flat().map(r => r.id));
        return reports.filter(r => !duplicateIds.has(r.id) && !r.isDuplicate);
    }, [reports, duplicateGroups]);


    const handleSignOut = async () => {
      await signOutUser();
      setUser(null);
      router.push('/login');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    const refreshGroups = () => {
        // This is a dummy function to force a re-render of useMemo
    }

    return (
        <>
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <Building2 className="w-6 h-6 text-primary" />
                    <h1 className="text-xl font-bold text-foreground">
                        Admin Dashboard
                    </h1>
                </div>

                {user && (
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback>A</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">Admin</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                    {user.email}
                                    </p>
                                </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleSignOut}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>
        </header>

        <main className="container mx-auto py-12 px-4">
             <header className="mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                        All Reports
                    </h1>
                    <p className="text-muted-foreground text-base mt-2">
                        Oversee and manage all user-submitted reports. Potential duplicates are grouped automatically.
                    </p>
                </div>
            </header>

            {duplicateGroups.length > 0 && (
                <Card className="mb-8 border-primary/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Group className="text-primary" /> Potential Duplicate Reports
                        </CardTitle>
                        <CardDescription>
                            We found {duplicateGroups.length} group(s) of reports that might be duplicates based on their location and issue type.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Accordion type="single" collapsible className="w-full">
                            {duplicateGroups.map((group, index) => (
                                <AccordionItem value={`item-${index}`} key={index}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between items-center w-full pr-4">
                                            <span>Group {index + 1}: {group.length} reports of type '{group[0].issueType.replace(/_/g, ' ')}'</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-4 p-4 bg-secondary/50 rounded-md">
                                            {group.map(report => (
                                                <div key={report.id} className="flex gap-4 items-start p-2 border-b">
                                                    <Image src={report.imageUrl} alt={report.issueType} width={80} height={53} className="rounded-md object-cover"/>
                                                    <div className="text-sm flex-1">
                                                        <p className="font-semibold">{report.location}</p>
                                                        <p className="text-muted-foreground">Severity: {report.severity}</p>
                                                        <p className="text-muted-foreground">Submitted: {report.complaintTime ? formatDistanceToNow(report.complaintTime, { addSuffix: true }) : 'N/A'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex justify-end pt-4">
                                                <MergeGroup group={group} onMergeSuccess={refreshGroups} />
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            )}

            <Card>
                 <CardHeader>
                    <CardTitle>Unique Reports</CardTitle>
                    <CardDescription>
                        These are reports that have not been identified as potential duplicates.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Issue</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Image</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Merged</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {nonDuplicateReports.map((report) => (
                                <TableRow 
                                    key={report.id} 
                                    className={cn(
                                        report.isEscalated ? "bg-destructive/10 hover:bg-destructive/20" : "",
                                    )}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {report.isEscalated && <AlertTriangle className="w-4 h-4 text-destructive" title="This report has been escalated by the user."/>}
                                            <span className="capitalize">{report.issueType.replace(/_/g, ' ')}</span>
                                        </div>
                                         {report.isEscalated && (
                                            <Badge variant="destructive" className="mt-1">Escalated</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{report.location}</TableCell>
                                    <TableCell>
                                        {report.complaintTime ? formatDistanceToNow(report.complaintTime, { addSuffix: true }) : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                report.severity === 'high' ? 'destructive' :
                                                report.severity === 'medium' ? 'secondary' : 'default'
                                            }
                                        >
                                            {report.severity}
                                        </Badge>
                                    </TableCell>
                                     <TableCell>
                                        <Image
                                            src={report.imageUrl}
                                            alt={report.issueType}
                                            width={100}
                                            height={66}
                                            className="rounded-md object-cover"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <StatusCell reportId={report.id} currentStatus={report.status} />
                                    </TableCell>
                                    <TableCell>
                                        {report.duplicates && report.duplicates.length > 0 && (
                                            <Badge variant="secondary">
                                                {report.duplicates.length}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <NotifyAuthorityButton report={report} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
        </>
    );
}

    