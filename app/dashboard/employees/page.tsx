import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import EmployeeTable from "./EmployeeTable.tsx";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function EmployeesPage() {
  const cookieStore = await cookies();
  const employeeId = cookieStore.get("employee_session")?.value;

  if (!employeeId) {
    redirect("/login");
  }

  const { data: currentUser } = await supabaseAdmin
    .from("employees")
    .select("role")
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  const role = String(currentUser?.role || "").trim().toLowerCase();

  if (role !== "hr") {
    redirect("/dashboard");
  }

  const { data: employees } = await supabaseAdmin
    .from("employees")
    .select(`
      id,
      employee_code,
      full_name,
      position,
      role,
      active
    `)
    .order("employee_code", { ascending: true });

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">จัดการข้อมูลพนักงาน</h1>
            <p className="mt-1 text-slate-600">
              สำหรับ HR แก้ไขข้อมูลพนักงาน
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          >
            กลับ Dashboard
          </Link>
        </div>

        <EmployeeTable employees={employees || []} />
      </div>
    </main>
  );
}