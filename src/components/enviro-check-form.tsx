"use client";

import { useState, useRef, ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  RotateCcw,
  TreeDeciduous,
  LightbulbOff,
} from "lucide-react";
import { PotholeIcon } from "@/components/icons/pothole-icon";
import { useToast } from "@/hooks/use-toast";

import { identifyObject, IdentifyObjectOutput } from "@/ai/flows/identify-object";
import { assessSeverity, AssessSeverityOutput } from "@/ai/flows/assess-severity";
import { createReport } from "@/lib/firebase/service";

type Step = "input" | "identifying" | "confirmation" | "assessing" | "result";
type IssueType = "pothole" | "garbage" | "streetlight" | "fallen_tree" | "other";

export function EnviroCheckForm() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("input");
  const [issueType, setIssueType] = useState<IssueType | "">("");
  const [location, setLocation] = useState("");
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identificationResult, setIdentificationResult] = useState<IdentifyObjectOutput | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessSeverityOutput | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGetLocation = () => {
    setIsGettingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation(`${latitude}, ${longitude}`);
        setIsGettingLocation(false);
        toast({ title: "Success", description: "Location acquired successfully." });
      },
      (err) => {
        setIsGettingLocation(false);
        setError("Could not get location. Please enter it manually.");
        toast({ variant: "destructive", title: "Error", description: err.message });
      }
    );
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      setPreviewUrl(URL.createObjectURL(file));
      const dataUri = await fileToDataUri(file);
      setImageDataUri(dataUri);
    }
  };

  const handleReset = () => {
    setStep("input");
    setLocation("");
    setImageDataUri(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setIsGettingLocation(false);
    setError(null);
    setIdentificationResult(null);
    setAssessmentResult(null);
    setIssueType("");
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleSubmitReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!issueType || !location || !imageDataUri) {
      setError("Please select an issue type, location, and an image.");
      return;
    }
    setError(null);
    setStep("identifying");

    try {
      const result = await identifyObject({ location, photoDataUri: imageDataUri, issueType });
      if (result.identifiedType === 'none') {
        setError("No issue was identified in the image. Please try another image.");
        setStep("input");
        toast({ variant: "destructive", title: "Not Found", description: "We couldn't identify a specific issue." });
        return;
      }
      setIdentificationResult(result);
      setStep("confirmation");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMsg);
      setStep("input");
      toast({ variant: "destructive", title: "Identification Failed", description: errorMsg });
    }
  };

  const handleProceedToAssessment = async (finalIssueType: IssueType) => {
    if (!identificationResult || !imageDataUri || !location) return;

    setStep("assessing");
    try {
      const result = await assessSeverity({
        location,
        photoDataUri: imageDataUri,
        issueType: finalIssueType,
        isConfirmed: true,
      });
      setAssessmentResult(result);

      await createReport({
        issueType: finalIssueType,
        location,
        imageDataUri,
        identificationResult,
        assessmentResult: result,
      });

      setStep("result");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMsg);
      setStep("input");
      toast({ variant: "destructive", title: "Assessment Failed", description: errorMsg });
    }
  };

  const renderIssueIcon = (issue?: string | null) => {
    switch (issue) {
      case 'pothole': return <PotholeIcon className="w-8 h-8 text-primary" />;
      case 'garbage': return <Trash2 className="w-8 h-8 text-primary" />;
      case 'streetlight': return <LightbulbOff className="w-8 h-8 text-primary" />;
      case 'fallen_tree': return <TreeDeciduous className="w-8 h-8 text-primary" />;
      default: return null;
    }
  };
  
  const renderStep = () => {
    switch (step) {
      case "identifying":
      case "assessing":
        return (
          <div className="flex flex-col items-center justify-center text-center p-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground font-semibold">
              {step === "identifying" ? "Verifying image..." : "Assessing severity..."}
            </p>
            <p className="text-sm text-muted-foreground">This may take a moment.</p>
          </div>
        );
      case "confirmation":
        const userChoice = (issueType || "").replace(/_/g, " ");
        const aiChoice = (identificationResult?.identifiedType || "").replace(/_/g, " ");
        const confidence = Math.round((identificationResult?.confidence || 0) * 100);

        if (identificationResult?.isMatch) {
          return (
            <>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Confirm Finding</CardTitle>
                <CardDescription>Our AI agrees with your report. Please confirm to proceed.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                {previewUrl && <Image src={previewUrl} alt="Report preview" width={400} height={300} className="rounded-lg object-cover" />}
                <div className="flex items-center gap-4 text-lg p-4 bg-secondary rounded-lg w-full justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  <span>
                    Confirmed as a <span className="font-bold capitalize text-primary">{userChoice}</span> with {confidence}% confidence.
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center gap-4">
                <Button onClick={() => handleProceedToAssessment(issueType as IssueType)} size="lg">
                  <ThumbsUp className="mr-2 h-4 w-4" /> Yes, proceed
                </Button>
                <Button onClick={handleReset} size="lg" variant="destructive">
                  <ThumbsDown className="mr-2 h-4 w-4" /> No, start over
                </Button>
              </CardFooter>
            </>
          );
        } else {
          return (
            <>
              <CardHeader>
                <CardTitle className="font-headline text-2xl">Verification Mismatch</CardTitle>
                <CardDescription>Our AI has identified something different. How would you like to proceed?</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                {previewUrl && <Image src={previewUrl} alt="Report preview" width={400} height={300} className="rounded-lg object-cover" />}
                 <div className="w-full text-center p-4 bg-secondary rounded-lg space-y-2">
                    <p>You reported: <Badge variant="outline" className="text-base capitalize">{userChoice}</Badge></p>
                    <p>AI identified: <Badge className="text-base capitalize">{aiChoice}</Badge> (with {confidence}% confidence)</p>
                 </div>
              </CardContent>
              <CardFooter className="flex-col gap-2 w-full">
                 <p className="text-sm text-muted-foreground mb-2">Which report is more accurate?</p>
                 <div className="flex flex-col sm:flex-row justify-center gap-4 w-full">
                     <Button onClick={() => handleProceedToAssessment(identificationResult?.identifiedType as IssueType)} className="w-full sm:w-auto">
                         <ThumbsUp className="mr-2"/> Use AI Suggestion ({aiChoice})
                     </Button>
                     <Button onClick={() => handleProceedToAssessment(issueType as IssueType)} variant="secondary" className="w-full sm:w-auto">
                         <ThumbsUp className="mr-2"/> Keep My Report ({userChoice})
                     </Button>
                 </div>
                 <Button onClick={handleReset} variant="ghost" className="w-full sm:w-auto mt-2">
                    <RotateCcw className="mr-2"/> Start Over
                 </Button>
              </CardFooter>
            </>
          )
        }

      case "result":
        return (
          <>
            <CardHeader className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="font-headline text-3xl">Report Submitted!</CardTitle>
              <CardDescription>Thank you for helping improve our environment.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
               <div className="text-center">
                <p className="text-muted-foreground">Assessed Severity</p>
                <Badge
                    variant={
                      assessmentResult?.severity === 'high' ? 'destructive' :
                      assessmentResult?.severity === 'medium' ? 'secondary' : 'default'
                    }
                    className="text-2xl font-bold capitalize mt-1 px-4 py-2"
                >
                    {assessmentResult?.severity}
                </Badge>
               </div>
               <p className="text-muted-foreground text-center bg-secondary/50 p-4 rounded-lg">
                <span className="font-semibold text-foreground">Justification: </span> {assessmentResult?.justification}
               </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={handleReset} size="lg">
                <RotateCcw className="mr-2 h-4 w-4" /> Submit Another Report
              </Button>
            </CardFooter>
          </>
        );
      case "input":
      default:
        return (
          <form onSubmit={handleSubmitReport}>
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Report an Issue</CardTitle>
              <CardDescription>
                Select an issue type, use your location, and upload an image to file a report.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="issueType">Type of Issue</Label>
                <Select value={issueType} onValueChange={(value) => setIssueType(value as IssueType)} required>
                    <SelectTrigger id="issueType">
                        <SelectValue placeholder="Select an issue type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pothole">Pothole</SelectItem>
                        <SelectItem value="garbage">Garbage</SelectItem>
                        <SelectItem value="streetlight">Streetlight Outage</SelectItem>
                        <SelectItem value="fallen_tree">Fallen Tree</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="flex gap-2">
                  <Input
                    id="location"
                    placeholder="e.g., 40.7128, -74.0060"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                  <Button type="button" variant="outline" onClick={handleGetLocation} disabled={isGettingLocation}>
                    {isGettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Image</Label>
                <div
                  className="relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-secondary transition-colors aspect-video flex items-center justify-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                    accept="image/*"
                    required
                  />
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="object-contain rounded-md"
                      data-ai-hint="pothole street"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Upload className="h-8 w-8" />
                      <p>Click or drag file to this area to upload</p>
                      <p className="text-xs">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                  <AlertTriangle className="h-4 w-4"/>
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" size="lg" className="w-full" disabled={!location || !imageDataUri || !issueType}>
                Verify & Submit Report
              </Button>
            </CardFooter>
          </form>
        );
    }
  };

  return <Card className="w-full transition-all duration-300 ease-in-out">{renderStep()}</Card>;
}
