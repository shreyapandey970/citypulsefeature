
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { listenToAllReports } from '@/lib/firebase/service';
import { Loader2, AlertTriangle, PieChart, Clock } from 'lucide-react';

type IssueType = 'pothole' | 'garbage' | 'streetlight' | 'fallen_tree' | 'other';

type Report = {
    id: string;
    issueType: IssueType;
    status: 'pending' | 'in progress' | 'resolved';
    complaintTime?: Date;
    resolvedTime?: Date;
};

type ChartData = {
    name: string;
    count: number;
};

const processReportData = (reports: Report[]) => {
    const issueCounts = reports.reduce((acc, report) => {
        const type = report.issueType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as { [key: string]: number });

    const chartData: ChartData[] = Object.entries(issueCounts).map(([name, count]) => ({
        name,
        count,
    }));

    const resolvedReports = reports.filter(r => r.status === 'resolved' && r.complaintTime && r.resolvedTime);
    
    let avgResolutionTime = 'N/A';
    if (resolvedReports.length > 0) {
        const totalResolutionTime = resolvedReports.reduce((acc, report) => {
            const diff = report.resolvedTime!.getTime() - report.complaintTime!.getTime();
            return acc + diff;
        }, 0);
        
        const avgMilliseconds = totalResolutionTime / resolvedReports.length;
        const hours = Math.floor(avgMilliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((avgMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            avgResolutionTime = `${days}d ${hours % 24}h`;
        } else {
            avgResolutionTime = `${hours}h ${minutes}m`;
        }
    }

    return {
        chartData,
        totalReports: reports.length,
        resolvedCount: resolvedReports.length,
        avgResolutionTime,
    };
};

export function DashboardView() {
    const [stats, setStats] = useState<{ chartData: ChartData[], totalReports: number, resolvedCount: number, avgResolutionTime: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = listenToAllReports((reports) => {
            try {
                const processedData = processReportData(reports as Report[]);
                setStats(processedData);
            } catch (e) {
                console.error("Error processing report data:", e);
                setError("Could not process report data.");
            } finally {
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 bg-secondary/30 rounded-lg">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-lg text-muted-foreground font-semibold">
                    Loading analytics dashboard...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-12 bg-destructive/10 text-destructive rounded-lg">
                <AlertTriangle className="w-12 h-12 mb-4" />
                <p className="text-lg font-semibold">An Error Occurred</p>
                <p>{error}</p>
            </div>
        );
    }
    
    if (!stats || stats.totalReports === 0) {
        return (
             <div className="text-center p-12 text-muted-foreground bg-secondary/30 rounded-md">
                <PieChart className="w-12 h-12 mx-auto mb-4 text-primary" />
                <p className="text-lg font-semibold">No Data Yet</p>
                <p>Once reports are submitted, this dashboard will show analytics.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-6">
            <div className="grid md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                        <PieChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalReports}</div>
                        <p className="text-xs text-muted-foreground">Total complaints submitted by all users.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Resolved Reports</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.resolvedCount}</div>
                        <p className="text-xs text-muted-foreground">
                            {((stats.resolvedCount / stats.totalReports) * 100).toFixed(1)}% of all reports.
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgResolutionTime}</div>
                        <p className="text-xs text-muted-foreground">Average time from report to resolution.</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Report Distribution</CardTitle>
                    <CardDescription>Breakdown of all submitted reports by issue type.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={stats.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: 'var(--radius)',
                                }}
                            />
                            <Legend wrapperStyle={{fontSize: "14px"}}/>
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Report Count" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}

// CheckCircle icon as it's not in lucide-react by default in this context
const CheckCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
