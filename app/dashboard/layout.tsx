export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { DashboardWrapper } from "@/components/layout/dashboard-wrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardWrapper
      userName={session.user.name}
      userEmail={session.user.email}
      userRole={session.user.role}
    >
      {children}
    </DashboardWrapper>
  );
}
