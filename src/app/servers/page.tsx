import { SectionCards } from "@/components/section-cards";
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

  if (res.status === 401) {
    return redirect("/auth/login");
  }
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6 w-full">
      <SectionCards />
    </div>
  );
}
