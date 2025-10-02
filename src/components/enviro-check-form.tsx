
"use client";

import { useState, useRef, ChangeEvent, FormEvent, useEffect } from "react";
import Image from "next/image";
import ExifReader from 'exif-reader';
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
  Camera,
  X,
} from "lucide-react";
import { PotholeIcon } from "@/components/icons/pothole-icon";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import dynamic from 'next/dynamic';
import { LatLngExpression } from 'leaflet';

import { identifyObject, IdentifyObjectOutput } from "@/ai/flows/identify-object";
import { assessSeverity, AssessSeverityOutput } from "@/ai/flows/assess-severity";
import { createReport, updateReport } from "@/lib/firebase/service";

const MapView = dynamic(() => import('@/components/map-view').then(mod => mod.MapView), { 
    ssr: false,
    loading: () => <div className="h-[200px] w-full bg-secondary rounded-lg flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
});

type Step = "input" | "identifying" | "confirmation" | "assessing" | "result" | "camera";
type IssueType = "pothole" | "garbage" | "streetlight" | "fallen_tree" | "other";
type FileType = "image" | "video";

function dmsToDecimal(degrees: number, minutes: number, seconds: number, direction: string): number {
    let decimal = degrees + minutes / 60 + seconds / 3600;
    if (direction === 'S' || direction === 'W') {
        decimal = decimal * -1;
    }
    return decimal;
}

export function EnviroCheckForm() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("input");
  const [issueType, setIssueType] = useState<IssueType | "">("");
  const [location, setLocation] = useState("");
  const [fileDataUri, setFileDataUri] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identificationResult, setIdentificationResult] = useState<IdentifyObjectOutput | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessSeverityOutput | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([20.5937, 78.9629]); // Default to India center
  const [mapPin, setMapPin] = useState<LatLngExpression | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

   useEffect(() => {
    if (step !== 'camera') {
      // Stop camera stream when leaving camera step
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }

    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
      }
    };

    getCameraPermission();
  }, [step, toast]);


  const handleGetLocation = () => {
    setIsGettingLocation(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = `${latitude}, ${longitude}`;
        setLocation(newLocation);
        setMapCenter([latitude, longitude]);
        setMapPin([latitude, longitude]);
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

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);
      
      if(file.type.startsWith('video/')) {
          setFileType('video');
      } else {
          setFileType('image');
          // Check for EXIF GPS data
          const arrayBuffer = await file.arrayBuffer();
          try {
            const exif = ExifReader.load(arrayBuffer, {expanded: true});
            const gps = exif.gps;
            if (gps && gps.Latitude && gps.Longitude) {
              const lat = dmsToDecimal(gps.Latitude[0], gps.Latitude[1], gps.Latitude[2], gps.LatitudeRef);
              const lon = dmsToDecimal(gps.Longitude[0], gps.Longitude[1], gps.Longitude[2], gps.LongitudeRef);
              const newLocation = `${lat}, ${lon}`;
              setLocation(newLocation);
              setMapPin([lat, lon]);
              setMapCenter([lat, lon]);
              toast({ title: "Location Found!", description: "Extracted location data from image."});
            }
          } catch (e) {
            console.warn('Could not read EXIF data from image.', e);
          }
      }

      const dataUri = await fileToDataUri(file);
      setFileDataUri(dataUri);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUri = canvas.toDataURL('image/jpeg');
        setFileDataUri(dataUri);
        setPreviewUrl(dataUri);
        setFileType('image');
        handleGetLocation(); // Get location when photo is taken
        setStep('input');
      }
    }
  }

  const handleReset = () => {
    setStep("input");
    setLocation("");
    setFileDataUri(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileType(null);
    setIsGettingLocation(false);
    setError(null);
    setIdentificationResult(null);
    setAssessmentResult(null);
    setReportId(null);
    setIssueType("");
    setMapPin(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleSubmitReport = async (e: FormEvent) => {
    e.preventDefault();
    if (!issueType || !location || !fileDataUri) {
      setError("Please select an issue type, location, and an image/video.");
      return;
    }
    setError(null);
    setStep("identifying");

    try {
      const result = await identifyObject({ location, photoDataUri: fileDataUri, issueType });
      if (result.identifiedType === 'none') {
        setError("No issue was identified in the media. Please try another file.");
        setStep("input");
        toast({ variant: "destructive", title: "Not Found", description: "We couldn't identify a specific issue." });
        return;
      }
      setIdentificationResult(result);
      setStep("confirmation");
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMsg);
      setStep("input");
      toast({ variant: "destructive", title: "Identification Failed", description: errorMsg });
    }
  };

  const handleProceedToAssessment = async (finalIssueType: IssueType) => {
    if (!identificationResult || !fileDataUri || !location) return;

    setStep("assessing");
    try {
      // Create initial report and get ID
      const newReportId = await createReport({
        issueType: finalIssueType,
        location,
        imageDataUri: fileDataUri,
        identificationResult,
        assessmentResult: null, // This will be updated later
      });

      if (!newReportId) {
        setError("Could not submit report. Firebase might not be configured.");
        setStep("input");
        toast({ variant: "destructive", title: "Submission Failed", description: "Could not save report." });
        return;
      }
      
      setReportId(newReportId);
      setStep("result"); // Go to result page immediately
      toast({ title: "Report Submitted!", description: "We are now assessing the severity." });

      // Asynchronously assess and update
      const result = await assessSeverity({
        location,
        photoDataUri: fileDataUri,
        issueType: finalIssueType,
        isConfirmed: true,
      });
      setAssessmentResult(result);
      await updateReport(newReportId, result);

    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMsg);
      setStep("input");
      toast({ variant: "destructive", title: "An Error Occurred", description: errorMsg });
    }
  };

  const handleMapClick = (latlng: { lat: number, lng: number }) => {
    const newLocation = `${latlng.lat}, ${latlng.lng}`;
    setLocation(newLocation);
    setMapPin([latlng.lat, latlng.lng]);
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
      case "camera":
        return (
          <>
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Use Camera</CardTitle>
              <CardDescription>
                Point your camera at the issue and capture a photo. We'll automatically get your location.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video w-full">
                <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline />
                <canvas ref={canvasRef} className="hidden" />

                {hasCameraPermission === false && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-md">
                        <Alert variant="destructive" className="w-auto">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Camera Access Denied</AlertTitle>
                            <AlertDescription>
                                Please enable camera access in your browser settings.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
                {hasCameraPermission === null && (
                     <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-md">
                         <Loader2 className="w-8 h-8 animate-spin text-white"/>
                     </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-center gap-4">
                <Button size="lg" onClick={handleCapture} disabled={!hasCameraPermission}>
                    <Camera className="mr-2"/> Capture Photo
                </Button>
                 <Button size="lg" variant="outline" onClick={() => setStep('input')}>
                    <X className="mr-2"/> Cancel
                </Button>
            </CardFooter>
          </>
        );
      case "identifying":
      case "assessing":
        return (
          <div className="flex flex-col items-center justify-center text-center p-12">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground font-semibold">
              {step === "identifying" ? "Verifying media..." : "Finalizing your report..."}
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
                {previewUrl && fileType === 'image' && <Image src={previewUrl} alt="Report preview" width={400} height={300} className="rounded-lg object-cover" />}
                {previewUrl && fileType === 'video' && <video src={previewUrl} controls width={400} className="rounded-lg" />}
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
                {previewUrl && fileType === 'image' && <Image src={previewUrl} alt="Report preview" width={400} height={300} className="rounded-lg object-cover" />}
                {previewUrl && fileType === 'video' && <video src={previewUrl} controls width={400} className="rounded-lg" />}
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
               {assessmentResult ? (
                   <>
                       <div className="text-center">
                        <p className="text-muted-foreground">Assessed Severity</p>
                        <Badge
                            variant={
                              assessmentResult.severity === 'high' ? 'destructive' :
                              assessmentResult.severity === 'medium' ? 'secondary' : 'default'
                            }
                            className="text-2xl font-bold capitalize mt-1 px-4 py-2"
                        >
                            {assessmentResult.severity}
                        </Badge>
                       </div>
                       <p className="text-muted-foreground text-center bg-secondary/50 p-4 rounded-lg">
                        <span className="font-semibold text-foreground">Justification: </span> {assessmentResult.justification}
                       </p>
                   </>
               ) : (
                   <div className="flex flex-col items-center justify-center text-center p-6 bg-secondary/50 rounded-lg w-full">
                       <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                       <p className="text-lg text-foreground font-semibold">
                           Assessing severity...
                       </p>
                       <p className="text-sm text-muted-foreground">This may take a moment. You can safely leave this page.</p>
                   </div>
               )}
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
                Fill out the form below or drop a pin on the map to report an issue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-6">
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
                        <Label>Evidence</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4"/>
                                Upload File
                            </Button>
                            <Button type="button" variant="outline" className="w-full" onClick={() => setStep('camera')}>
                                <Camera className="mr-2 h-4 w-4"/>
                                Use Camera
                            </Button>
                        </div>
                        <div
                        className="relative border-2 border-dashed border-muted-foreground/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-secondary transition-colors aspect-video flex items-center justify-center"
                        onClick={() => fileInputRef.current?.click()}
                        >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,video/mp4"
                        />
                        {previewUrl ? (
                            <>
                            {fileType === 'image' && (
                                <Image
                                src={previewUrl}
                                alt="Preview"
                                fill
                                className="object-contain rounded-md"
                                data-ai-hint="pothole street"
                                />
                            )}
                            {fileType === 'video' && (
                                <video
                                    src={previewUrl}
                                    controls
                                    className="object-contain rounded-md h-full w-full"
                                />
                            )}
                            <Button 
                                    type="button" 
                                    variant="destructive" 
                                    size="icon" 
                                    className="absolute top-2 right-2 z-10 h-6 w-6"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewUrl(null);
                                        setFileDataUri(null);
                                        setFileType(null);
                                        if(fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                >
                                    <Trash2 className="h-3 w-3"/>
                                </Button>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Upload className="h-8 w-8" />
                            <p>Click or drag file to this area to upload</p>
                            <p className="text-xs">PNG, JPG, GIF, MP4 up to 10MB</p>
                            </div>
                        )}
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Or Drop a Pin</Label>
                    <MapView complaints={[]} route={[]} droppedPin={mapPin} onMapClick={handleMapClick} center={mapCenter}/>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm font-medium mt-4">
                  <AlertTriangle className="h-4 w-4"/>
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" size="lg" className="w-full" disabled={!location || !fileDataUri || !issueType}>
                Verify & Submit Report
              </Button>
            </CardFooter>
          </form>
        );
    }
  };

  return <Card className="w-full max-w-4xl transition-all duration-300 ease-in-out">{renderStep()}</Card>;
}
