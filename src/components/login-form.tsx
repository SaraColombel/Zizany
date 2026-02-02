// useForm
"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
// ------

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// useForm : Define the shape of the form data
type LoginValues = {
  email: string;
  password: string;
};
// ------

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  // useForm here
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
  });

  const [apiError, setApiError] = React.useState<string | null>(null);

  async function onSubmit(values: LoginValues) {
    setApiError(null);
    const res = await fetch(
      `${process.env.EXPRESS_PUBLIC_API_URL}/api/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      },
    );

    if (!res.ok) {
      try {
        const data = await res.json();
        setApiError(data?.error?.message ?? "Login failed");
      } catch {
        setApiError("Login failed");
      }
      return;
    }

    window.location.href = "/servers";
  }
  // -----------------

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* HERE useForm */}
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* ---------- */}
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>

                {/* HERE useForm */}
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="mail@example.com"
                  // react-hook-form branché ici
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Invalid email format",
                    },
                  })}
                />
                {errors.email && (
                  <FieldDescription className="text-destructive">
                    {errors.email.message}
                  </FieldDescription>
                )}
                {/* ---------- */}
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                {/* HERE useForm */}
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password", {
                    required: "Password is required",
                  })}
                />
                {errors.password && (
                  <FieldDescription className="text-destructive">
                    {errors.password.message}
                  </FieldDescription>
                )}
                {/* ---------- */}
              </Field>

              {apiError && (
                <FieldDescription className="text-destructive text-center">
                  {apiError}
                </FieldDescription>
              )}

              <Field>
                {/* HERE useForm */}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Logging in..." : "Login"}
                </Button>
                {/* ---------- */}

                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="/auth/signup">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
