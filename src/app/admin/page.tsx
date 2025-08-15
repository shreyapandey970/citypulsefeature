
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { listenToAllReports, updateReportStatus, signOutUser } from '@/lib/firebase/service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, LogOut, CheckCircle, Hourglass, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

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
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<Complaint[]>([]);

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
            }));
            formattedReports.sort((a, b) => (b.complaintTime?.getTime() || 0) - (a.complaintTime?.getTime() || 0));
            setReports(formattedReports);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeReports();
        };
    }, [router]);
    
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

    return (
        <main className="container mx-auto py-12 px-4">
             <header className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-lg">
                    <Building2 className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                    <h1 className="text-3xl md:text-4xl font-headline font-bold text-foreground">
                        Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground text-base">
                        Oversee and manage all user-submitted reports.
                    </p>
                    </div>
                </div>

                {user && (
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="font-semibold">{user.displayName || "Admin"}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleSignOut}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                )}
            </header>
            <Card>
                <CardHeader>
                    <CardTitle>All Complaints</CardTitle>
                    <CardDescription>View and manage all reports submitted by users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Issue</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Severity</TableHead>
                                <TableHead>Image</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.map((report) => (
                                <TableRow key={report.id}>
                                    <TableCell className="font-medium capitalize">{report.issueType.replace(/_/g, ' ')}</TableCell>
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
    );
}
