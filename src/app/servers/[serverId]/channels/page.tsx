import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ChannelsPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const cookieStore = cookies();
  const cookieHeader = (await cookieStore).toString();

  const isAuth = await fetch(`${apiBase}/api/auth/me`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (isAuth.status === 401) {
    return redirect("/auth/login");
  }

  return redirect("/servers");
}
