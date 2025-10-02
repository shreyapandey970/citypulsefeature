
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { listenToAllReports, updateReportStatus, signOutUser, deleteReport } from '@/lib/firebase/service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, LogOut, CheckCircle, Hourglass, Settings, AlertTriangle, Merge, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from '@/components/theme-toggle';

type IssueType = 'pothole' | 'garbage' | 'streetlight' | 'fallen_tree' | 'other';
type Status = 'pending' | 'in progress' | 'resolved';

type Complaint = {
    id: string;
    userId: string;
    issueType: IssueType;
    location: string;
    severity: 'high' | 'medium' | 'low';
    imageUrl: string;
    status: Status;
    complaintTime?: Date;
    isEscalated?: boolean;
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


export default function AdminPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<Complaint[]>([]);
    const [selectedReports, setSelectedReports] = useState<string[]>([]);
    const [primaryReport, setPrimaryReport] = useState<string | null>(null);
    const [isMerging, setIsMerging] = useState(false);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user && user.email === 'admin@gmail.com') {
                setUser(user);
            } else {
                router.push('/login');
            }
            setLoading(false);
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
            }));
            // Sort escalated reports to the top, then by time
            formattedReports.sort((a, b) => {
                if (a.isEscalated && !b.isEscalated) return -1;
                if (!a.isEscalated && b.isEscalated) return 1;
                return (b.complaintTime?.getTime() || 0) - (a.complaintTime?.getTime() || 0);
            });
            setReports(formattedReports);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeReports();
        };
    }, [router]);

    const handleSelectReport = (reportId: string, checked: boolean) => {
        if (checked) {
            setSelectedReports(prev => [...prev, reportId]);
        } else {
            setSelectedReports(prev => prev.filter(id => id !== reportId));
        }
    }
    
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedReports(reports.map(r => r.id));
        } else {
            setSelectedReports([]);
        }
    }

    const handleMerge = async () => {
        if (!primaryReport) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a primary report to keep.' });
            return;
        }

        setIsMerging(true);
        const reportsToDelete = selectedReports.filter(id => id !== primaryReport);

        try {
            for (const reportId of reportsToDelete) {
                // Not using the service function because we don't need user auth check for admin
                await deleteReport(reportId, true);
            }

            toast({
                title: 'Merge Successful',
                description: `${reportsToDelete.length} duplicate report(s) have been removed.`,
            });
            
            // Reset selection
            setSelectedReports([]);
            setPrimaryReport(null);

        } catch (error) {
            console.error("Error merging reports:", error);
            toast({ variant: 'destructive', title: 'Merge Failed', description: 'Could not remove duplicate reports.' });
        } finally {
            setIsMerging(false);
        }
    }
    
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

    const getSelectedReportDetails = () => {
        return reports.filter(r => selectedReports.includes(r.id));
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
             <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                        All Reports
                    </h1>
                    <p className="text-muted-foreground text-base mt-2">
                        Oversee and manage all user-submitted reports. Escalated issues are highlighted in red.
                    </p>
                </div>
                {selectedReports.length > 1 && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button>
                                <Merge className="mr-2 h-4 w-4" />
                                Merge {selectedReports.length} Duplicates
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Merge Duplicate Reports</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You have selected {selectedReports.length} reports to merge. Please select one to be the primary report. The others will be removed.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="max-h-[60vh] overflow-y-auto p-1">
                                <RadioGroup onValueChange={setPrimaryReport} className="space-y-4">
                                {getSelectedReportDetails().map(report => (
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
                                    {isMerging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Merge and Remove Duplicates
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </header>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] text-center">
                                    <Checkbox
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                        checked={selectedReports.length === reports.length && reports.length > 0}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead className="w-[200px]">Issue</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Image</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.map((report) => (
                                <TableRow 
                                    key={report.id} 
                                    className={cn(
                                        report.isEscalated ? "bg-destructive/10 hover:bg-destructive/20" : "",
                                        selectedReports.includes(report.id) ? "bg-secondary hover:bg-secondary/80" : ""
                                    )}
                                >
                                     <TableCell className="text-center">
                                        <Checkbox
                                            onCheckedChange={(checked) => handleSelectReport(report.id, !!checked)}
                                            checked={selectedReports.includes(report.id)}
                                            aria-label={`Select report ${report.id}`}
                                        />
                                    </TableCell>
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

    