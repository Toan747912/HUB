"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Sparkles, Loader2, Lock, User, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "@/shared/stores/toast.store";
import { api } from "@/shared/services/api";
import { getFriendlyErrorMessage } from "@/shared/utils/error-message";

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: z.enum(["STUDENT", "TEACHER"]),
});

type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "STUDENT",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterInput) => {
    setSubmitting(true);
    try {
      await api.auth.authControllerRegister({
        username: data.username,
        password: data.password,
        roles: [data.role],
      });
      toast({
        title: "Registration successful!",
        description: "Please sign in with your credentials.",
        type: "success",
      });
      router.push("/login");
    } catch (err: any) {
      const msg = getFriendlyErrorMessage(
        err,
        "Registration failed. That username might already be taken — try another.",
      );
      toast({
        title: "Registration failed",
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
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Join Memento OS to orchestrate your adaptive learning journey
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
                  placeholder="Choose a username"
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
                  placeholder="Create a strong password"
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-md py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Role Pick Buttons */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 block">
                Select Profile Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue("role", "STUDENT")}
                  className={`flex items-center justify-center space-x-2 py-2 px-4 rounded-md border text-sm font-semibold transition-all ${
                    selectedRole === "STUDENT"
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.15)]"
                      : "border-zinc-800 bg-zinc-950/30 text-zinc-400 hover:text-white"
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setValue("role", "TEACHER")}
                  className={`flex items-center justify-center space-x-2 py-2 px-4 rounded-md border text-sm font-semibold transition-all ${
                    selectedRole === "TEACHER"
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.15)]"
                      : "border-zinc-800 bg-zinc-950/30 text-zinc-400 hover:text-white"
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Teacher</span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button type="submit" variant="gradient" className="w-full mt-4" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-indigo-400 hover:text-indigo-300 font-medium underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
