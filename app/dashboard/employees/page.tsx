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

  if (!employeeId) redirect("/login");

  const { data: currentUser } = await supabaseAdmin
    .from("employees")
    .select("role, full_name")
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  const role = String(currentUser?.role || "").trim().toLowerCase();

  if (role !== "hr") redirect("/dashboard");

  const { data: employees }: { data: any[] | null } = await supabaseAdmin
    .from("employees")
    .select(`
      id,
      employee_code,
      full_name,
      position,
      role,
      active,
      department_name,
      pincode
    `)
    .order("employee_code", { ascending: true });

  const employeeList = employees ?? [];

  const totalEmployees = employeeList.length;
  const totalEmployee = employeeList.filter((e) => e.role === "employee").length;
  const totalSM = employeeList.filter((e) => e.role === "section_manager").length;
  const totalHR = employeeList.filter((e) => e.role === "hr").length;
  const totalGM = employeeList.filter((e) => e.role === "general_manager").length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-red-700 via-red-600 to-rose-600 p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black tracking-[0.2em] text-red-100">
                HR MANAGEMENT
              </p>

              <h1 className="mt-3 text-4xl font-black">
                จัดการข้อมูลพนักงาน
              </h1>

              <p className="mt-2 text-red-100">
                เพิ่ม / แก้ไข / ตรวจสอบข้อมูลพนักงานในระบบ
              </p>
            </div>

            <Link
              href="/dashboard"
              className="w-fit rounded-2xl border border-white/30 bg-white px-5 py-3 font-bold text-red-700 shadow transition hover:bg-red-50"
            >
              กลับ Dashboard
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard title="ทั้งหมด" value={totalEmployees} />
          <SummaryCard title="พนักงาน" value={totalEmployee} />
          <SummaryCard title="SM" value={totalSM} />
          <SummaryCard title="HR" value={totalHR} />
          <SummaryCard title="GM" value={totalGM} />
        </section>

        <EmployeeTable employees={employeeList} />
      </div>
    </main>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-red-100 bg-white/90 p-5 shadow-xl">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-red-700">
        {value}
        <span className="ml-1 text-sm font-bold text-slate-500">คน</span>
      </p>
    </div>
  );
}