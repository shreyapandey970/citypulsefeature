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
} from "lucide-react";
import { PotholeIcon } from "@/components/icons/pothole-icon";
import { useToast } from "@/hooks/use-toast";

import { identifyObject, IdentifyObjectOutput } from "@/ai/flows/identify-object";
import { assessSeverity, AssessSeverityOutput } from "@/ai/flows/assess-severity";

type Step = "input" | "identifying" | "confirmation" | "assessing" | "result";

export function EnviroCheckForm() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("input");
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
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleSubmitReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!location || !imageDataUri) {
      setError("Please provide both location and an image.");
      return;
    }
    setError(null);
    setStep("identifying");

    try {
      const result = await identifyObject({ location, photoDataUri: imageDataUri });
      if (result.objectType === 'none') {
        setError("No pothole or garbage was identified in the image. Please try another image or submit anyway if you are sure.");
        setStep("input"); // or a specific "not found" step
        toast({ variant: "destructive", title: "Not Found", description: "We couldn't identify a pothole or garbage." });
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

  const handleConfirmation = async (isConfirmed: boolean) => {
    if (!isConfirmed) {
      handleReset();
      return;
    }
    if (!identificationResult || !imageDataUri || !location) return;

    setStep("assessing");
    try {
      const result = await assessSeverity({
        location,
        photoDataUri: imageDataUri,
        issueType: identificationResult.objectType as 'pothole' | 'garbage',
        isConfirmed: true,
      });
      setAssessmentResult(result);
      setStep("result");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMsg);
      setStep("input");
      toast({ variant: "destructive", title: "Assessment Failed", description: errorMsg });
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
              {step === "identifying" ? "Analyzing image..." : "Assessing severity..."}
            </p>
            <p className="text-sm text-muted-foreground">This may take a moment.</p>
          </div>
        );
      case "confirmation":
        return (
          <>
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Confirm Finding</CardTitle>
              <CardDescription>Our AI found something. Is this correct?</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {previewUrl && (
                <Image
                  src={previewUrl}
                  alt="Report preview"
                  width={400}
                  height={300}
                  className="rounded-lg object-cover"
                />
              )}
              <div className="flex items-center gap-4 text-lg p-4 bg-secondary rounded-lg w-full justify-center">
                {identificationResult?.objectType === 'pothole' ? <PotholeIcon className="w-8 h-8 text-primary" /> : <Trash2 className="w-8 h-8 text-primary" />}
                <span>
                  Identified as a{" "}
                  <span className="font-bold capitalize text-primary">{identificationResult?.objectType}</span>{" "}
                  with {Math.round((identificationResult?.confidence || 0) * 100)}% confidence.
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center gap-4">
              <Button onClick={() => handleConfirmation(true)} size="lg" variant="default">
                <ThumbsUp className="mr-2 h-4 w-4" /> Yes, correct
              </Button>
              <Button onClick={() => handleConfirmation(false)} size="lg" variant="destructive">
                <ThumbsDown className="mr-2 h-4 w-4" /> No, start over
              </Button>
            </CardFooter>
          </>
        );

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
                Use your location and an image to report a pothole or garbage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  className="relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-secondary transition-colors"
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
              <Button type="submit" size="lg" className="w-full" disabled={!location || !imageDataUri}>
                Submit Report
              </Button>
            </CardFooter>
          </form>
        );
    }
  };

  return <Card className="w-full transition-all duration-300 ease-in-out">{renderStep()}</Card>;
}
