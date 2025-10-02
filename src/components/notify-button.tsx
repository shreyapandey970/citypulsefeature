
"use client";

import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import type { Complaint } from "@/app/admin/page";

const departmentEmails: { [key: string]: string } = {
  pothole: "pothole-dept@example.com",
  garbage: "sanitation-dept@example.com",
  streetlight: "electrical-dept@example.com",
  fallen_tree: "parks-dept@example.com",
  other: "general-affairs@example.com",
};

export const NotifyAuthorityButton = ({ report }: { report: Complaint }) => {
  const handleNotify = () => {
    const recipient = departmentEmails[report.issueType] || departmentEmails.other;
    const subject = `New Issue Report: ${report.issueType.replace(/_/g, " ")} at ${report.location}`;
    const body = `
A new issue has been reported by a user. Please find the details below:

Report ID: ${report.id}
Issue Type: ${report.issueType.replace(/_/g, " ")}
Severity: ${report.severity}
Location: ${report.location}
Status: ${report.status}
Reported Time: ${report.complaintTime ? report.complaintTime.toLocaleString() : 'N/A'}

View Image: ${report.imageUrl}

Please take the necessary action.

---
This is an auto-generated email from CityPulseAI.
    `;

    const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.trim())}`;

    window.location.href = mailtoLink;
  };

  return (
    <Button onClick={handleNotify} variant="outline" size="sm">
      <Send className="mr-2 h-4 w-4" />
      Notify
    </Button>
  );
};

    