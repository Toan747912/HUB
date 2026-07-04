"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Sparkles, Loader2, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/shared/stores/auth.store";
import { toast } from "@/shared/stores/toast.store";
import { api } from "@/shared/services/api";
import { getFriendlyErrorMessage } from "@/shared/utils/error-message";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setSubmitting(true);
    try {
      const res = await api.auth.authControllerLogin(data);
      const { accessToken, refreshToken } = res.data as any;
      login(accessToken, refreshToken);
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
        type: "success",
      });
      router.push("/dashboard");
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(err, "Invalid username or password.");
      toast({
        title: "Sign in failed",
        description: msg,
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 relative overflow-hidden">
      {/* Decorative gradient blur backdrop */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-violet-500/10 blur-[100px] pointer-events-none" />

      <Card className="w-full max-w-md relative z-10 border-zinc-800 bg-zinc-900/40">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-550 to-violet-600 bg-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">MEMENTO OS</CardTitle>
          <CardDescription>
            Enter your credentials to access your adaptive workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 block" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="username"
                  type="text"
                  placeholder="name@example.com"
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-md py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  {...register("username")}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-red-400 font-medium">{errors.username.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 block" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-md py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button type="submit" variant="gradient" className="w-full mt-2" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-indigo-400 hover:text-indigo-300 font-medium underline-offset-4 hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
