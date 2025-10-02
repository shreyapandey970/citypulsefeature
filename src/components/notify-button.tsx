"use client";

import { Button } from "@/components/ui/button";
import { ClipboardCopy } from "lucide-react";
import type { Complaint } from "@/app/admin/page";
import { useToast } from "@/hooks/use-toast";

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
  const body = `
A new issue has been reported by a user. Please find the details below:

Report ID: ${report.id}
Issue Type: ${report.issueType.replace(/_/g, ' ')}
Severity: ${report.severity}
Location: ${report.location}
Status: ${report.status}
Reported Time: ${report.complaintTime ? report.complaintTime.toLocaleString() : 'N/A'}

View Image: ${report.imageUrl}

Please take the necessary action.

---
This is an auto-generated email from CityPulseAI.
  `.trim();

  const handleCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(`To: ${recipient}\nSubject: ${subject}\n\n${body}`);
      toast({
        title: "Email Content Copied",
        description: `Content for ${recipient} copied to clipboard.`,
      });
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast({
        variant: "destructive",
        title: "Failed to Copy",
        description: "Could not copy content to clipboard.",
      });
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      <ClipboardCopy className="mr-2 h-4 w-4" />
      Copy Email
    </Button>
  );
};
