"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { signUpUser } from "@/lib/firebase/service";
import { Building2, Loader2, User as UserIcon, Upload } from 'lucide-react';


export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
        toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: "Please enter your name.",
        });
        return;
    }
    setIsLoading(true);
    try {
      await signUpUser(email, password, name, profilePic);
      toast({
        title: "Account Created Successfully!",
        description: "Please login to continue.",
      });
      router.push("/login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message,
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-secondary/50">
      <Card className="w-full max-w-md">
      <CardHeader className="text-center">
            <div className="inline-flex items-center gap-3 justify-center mb-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                    <Building2 className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-headline font-bold text-foreground">
                    CityPulseAI
                </h1>
            </div>
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>
            Enter your information to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="profile-pic">Profile Picture (Optional)</Label>
                <div className="flex items-center gap-4">
                    <div
                        className="relative w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary bg-secondary/50"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*"
                        />
                        {previewUrl ? (
                            <Image src={previewUrl} alt="Profile preview" layout="fill" className="rounded-full object-cover" />
                        ) : (
                            <div className="text-muted-foreground flex flex-col items-center">
                                <Upload className="w-6 h-6"/>
                                <span className="text-xs mt-1">Upload</span>
                            </div>
                        )}
                    </div>
                    <span className="text-sm text-muted-foreground">Click the icon to upload an image.</span>
                </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Account
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
