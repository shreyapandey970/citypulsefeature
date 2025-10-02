
"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Send } from "lucide-react";
import type { Complaint } from "@/app/admin/page";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const departmentEmails: { [key: string]: string } = {
  pothole: "pothole-dept@example.com",
  garbage: "sanitation-dept@example.com",
  streetlight: "electrical-dept@example.com",
  fallen_tree: "parks-dept@example.com",
  other: "general-affairs@example.com",
};

export const NotifyAuthorityButton = ({ report }: { report: Complaint }) => {
  const { toast } = useToast();
  const recipient = departmentEmails[report.issueType] || departmentEmails.other;
  const subject = `New Issue Report: ${report.issueType.replace(/_/g, " ")} at ${report.location}`;
  
  // Create a clean email body without the long data URI
  const body = `
A new issue has been reported by a user. Please find the details below:

Report ID: ${report.id}
Issue Type: ${report.issueType.replace(/_/g, ' ')}
Severity: ${report.severity}
Location: ${report.location}
Status: ${report.status}
Reported Time: ${report.complaintTime ? report.complaintTime.toLocaleString() : 'N/A'}

An image of the issue is available in the admin dashboard.

Please take the necessary action.

---
This is an auto-generated email from CityPulseAI.
  `.trim();

  const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <a
      href={mailtoLink}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      <Send className="mr-2 h-4 w-4" />
      Notify Authority
    </a>
  );
};
