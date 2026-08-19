import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import EmployeeTable from "./EmployeeTable";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

type EmployeeRow = {
  id: string;
  employee_code: string;
  full_name: string;
  position: string | null;
  role: string;
  active: boolean;
  department_id: string | null;
  department_name: string | null;
  pincode: string | null;
};

type DepartmentRow = {
  id: string;
  name: string;
};

export default async function EmployeesPage() {
  const cookieStore = await cookies();
  const employeeId =
    cookieStore.get("employee_session")?.value;

  if (!employeeId) {
    redirect("/login");
  }

  const {
    data: currentUser,
    error: currentUserError,
  } = await supabaseAdmin
    .from("employees")
    .select("role, full_name")
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  if (currentUserError || !currentUser) {
    redirect("/login");
  }

  const role = String(currentUser.role || "")
    .trim()
    .toLowerCase();

  if (role !== "hr") {
    redirect("/dashboard");
  }

  const [
    { data: employees, error: employeesError },
    { data: departments, error: departmentsError },
  ] = await Promise.all([
    supabaseAdmin
      .from("employees")
      .select(`
        id,
        employee_code,
        full_name,
        position,
        role,
        active,
        department_id,
        department_name,
        pincode
      `)
      .order("employee_code", {
        ascending: true,
      }),

    supabaseAdmin
      .from("departments")
      .select("id, name")
      .order("name", {
        ascending: true,
      }),
  ]);

  if (employeesError) {
    console.error(
      "โหลดข้อมูลพนักงานไม่สำเร็จ:",
      employeesError
    );
  }

  if (departmentsError) {
    console.error(
      "โหลดข้อมูลแผนกไม่สำเร็จ:",
      departmentsError
    );
  }

  const employeeList =
    (employees || []) as EmployeeRow[];

  const departmentList =
    (departments || []) as DepartmentRow[];

  const totalEmployees = employeeList.length;

  const totalEmployee = employeeList.filter(
    (employee) =>
      String(employee.role || "")
        .trim()
        .toLowerCase() === "employee"
  ).length;

  const totalSM = employeeList.filter(
    (employee) =>
      String(employee.role || "")
        .trim()
        .toLowerCase() === "section_manager"
  ).length;

  const totalHR = employeeList.filter(
    (employee) =>
      String(employee.role || "")
        .trim()
        .toLowerCase() === "hr"
  ).length;

  const totalGM = employeeList.filter(
    (employee) =>
      String(employee.role || "")
        .trim()
        .toLowerCase() === "general_manager"
  ).length;

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
          <SummaryCard
            title="ทั้งหมด"
            value={totalEmployees}
          />

          <SummaryCard
            title="พนักงาน"
            value={totalEmployee}
          />

          <SummaryCard
            title="SM"
            value={totalSM}
          />

          <SummaryCard
            title="HR"
            value={totalHR}
          />

          <SummaryCard
            title="GM"
            value={totalGM}
          />
        </section>

        <EmployeeTable
          employees={employeeList}
          departments={departmentList}
        />
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-red-100 bg-white/90 p-5 shadow-xl">
      <p className="text-sm font-bold text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-black text-red-700">
        {value}

        <span className="ml-1 text-sm font-bold text-slate-500">
          คน
        </span>
      </p>
    </div>
  );
}