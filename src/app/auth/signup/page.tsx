import { SignupForm } from "@/components/signup-form";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = cookies();
  const cookieHeader = (await cookieStore).toString();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (res.ok) {
    return redirect("/servers");
  }
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  );
}
