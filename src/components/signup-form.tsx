// useForm
"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
// ------

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

interface SignupValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const [apiError, setApiError] = React.useState<string | null>(null);

  async function onSubmit(values: SignupValues) {
    setApiError(null);

    const payload = {
      username: values.username,
      email: values.email,
      password: values.password,
      confirmPassword: values.confirmPassword,
    };

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        let msg = "Signup failed.";
        try {
          const data = await res.json();
          if (typeof data?.error?.message === "string")
            msg = data.error.message;
        } catch {}
        setApiError(msg);
        return;
      }

      window.location.href = "/auth/login";
    } catch {
      setApiError("Network error: backend unreachable.");
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                id="username"
                type="text"
                placeholder="CoolPseudo42"
                autoComplete="username"
                {...register("username", { required: "Pseudo is required" })}
              />
              {errors.username && (
                <FieldDescription className="text-destructive">
                  {errors.username.message}
                </FieldDescription>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>

              <Input
                id="email"
                type="email"
                placeholder="mail@example.com"
                autoComplete="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Invalid email format",
                  },
                })}
              />

              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password", {
                  required: "Password is required",
                })}
              />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirmPassword">
                Confirm Password
              </FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (v) =>
                    v === getValues("password") || "Passwords do not match",
                })}
              />

              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            {apiError && (
              <FieldDescription className="text-destructive text-center">
                {apiError}
              </FieldDescription>
            )}
            <Field>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Account"}
              </Button>
              <FieldDescription className="px-6 text-center">
                Already have an account? <a href="/auth/login">Sign in</a>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
