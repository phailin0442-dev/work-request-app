import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import LogoutButton from "./logout-button";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const employeeId = cookieStore.get("employee_session")?.value;

  if (!employeeId) redirect("/login");

  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select(`
      id,
      employee_code,
      full_name,
      position,
      role,
      active,
      department_name
    `)
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  if (!employee) redirect("/login");

  const role = String(employee.role || "").trim().toLowerCase();
  const departmentName = employee.department_name || "-";

  const isEmployee = role === "employee";
  const isSM = role === "section_manager";
  const isGM = role === "general_manager";
  const isHR = role === "hr";

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-100">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <section className="overflow-hidden rounded-[32px] bg-gradient-to-r from-red-700 via-red-600 to-rose-600 text-white shadow-2xl">
          <div className="relative p-6 sm:p-8">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

            <div className="relative flex items-center justify-between gap-5">
              <div className="min-w-0">
                <p className="text-xs font-black tracking-[0.25em] text-red-100">
                  HR APPROVAL WORKFLOW SYSTEM
                </p>

                <h1 className="mt-3 truncate text-3xl font-black sm:text-4xl">
                  สวัสดี, {employee.full_name}
                </h1>

                <p className="mt-2 truncate text-sm text-red-100 sm:text-base">
                  {employee.employee_code} · แผนก {departmentName}
                </p>
              </div>

              <div className="shrink-0 rounded-3xl border border-white/20 bg-white/10 p-4 text-right backdrop-blur-xl">
                <p className="text-xs text-red-100">สถานะผู้ใช้งาน</p>
                <p className="mt-1 text-xl font-black uppercase">{role}</p>
                <div className="mt-3">
                  <LogoutButton />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-4">
          <InfoCard title="ชื่อ-นามสกุล" value={employee.full_name} icon="👤" />
          <InfoCard title="รหัสพนักงาน" value={employee.employee_code} icon="🪪" />
          <InfoCard title="แผนก" value={departmentName} icon="🏢" />
        </section>

        {isEmployee && (
          <DashboardSection title="เมนูพนักงาน" subtitle="ยื่นคำขอและตรวจสอบสถานะ">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MenuCard href="/dashboard/ot" title="ยื่น OT" desc="ขอทำงานล่วงเวลา" icon="⏱️" />
              <MenuCard href="/dashboard/shift-change" title="เปลี่ยนกะ" desc="ยื่นคำขอเปลี่ยนกะ" icon="🔁" />
              <MenuCard href="/dashboard/day-off" title="เปลี่ยนวันหยุด" desc="ยื่นคำขอเปลี่ยนวันหยุด" icon="📅" />
              <MenuCard href="/dashboard/leave" title="ขอลา" desc="ยื่นคำขอลางาน" icon="📝" />
              <MenuCard href="/dashboard/my-requests" title="รายการของฉัน" desc="ตรวจสอบสถานะคำขอ" icon="📋" highlight />
            </div>
          </DashboardSection>
        )}

        {(isSM || isGM) && (
          <DashboardSection
            title={isGM ? "General Manager" : "เมนูผู้อนุมัติ"}
            subtitle="ตรวจสอบและอนุมัติคำขอ"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <MenuCard
                href="/dashboard/manage-requests"
                title="จัดการคำขอ"
                desc="อนุมัติ / ตรวจสอบรายการคำขอ"
                icon="✅"
                highlight
              />
            </div>
          </DashboardSection>
        )}

        {isHR && (
          <DashboardSection title="เมนู HR" subtitle="จัดการข้อมูลระบบ">
            <div className="grid gap-4 md:grid-cols-3">
              <MenuCard href="/dashboard/manage-requests" title="จัดการคำขอ" desc="อนุมัติ / ตรวจสอบรายการ" icon="✅" highlight />
              <MenuCard href="/dashboard/employees" title="จัดการพนักงาน" desc="เพิ่ม / แก้ไข / ค้นหา" icon="👥" />
              <MenuCard href="/dashboard/export" title="Export Report" desc="ดาวน์โหลดรายงาน" icon="📤" />
            </div>
          </DashboardSection>
        )}

        {!isGM && (
          <section className="rounded-[32px] border border-red-100 bg-white p-6 shadow-xl">
            <p className="text-sm font-black tracking-[0.25em] text-red-500">
              ANNOUNCEMENT
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-900">
              ประชาสัมพันธ์
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              กรุณาตรวจสอบข้อมูลก่อนส่งคำขอทุกครั้ง หากพบปัญหาในการใช้งานกรุณาติดต่อ HR
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <img
                src="/images/9hr.jpg"
                alt="9hr"
                className="h-[360px] w-full rounded-3xl object-contain shadow-xl"
              />

              <img
                src="/images/8hr.jpg"
                alt="8hr"
                className="h-[360px] w-full rounded-3xl object-contain shadow-xl"
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function DashboardSection({ title, subtitle, children }: any) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      {children}
    </section>
  );
}

function InfoCard({ title, value, icon }: any) {
  return (
    <div className="min-h-[96px] rounded-3xl border border-red-100 bg-white p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-2xl">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-500">{title}</p>
          <p className="mt-1 truncate text-base font-black text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function MenuCard({ href, title, desc, icon, highlight = false }: any) {
  return (
    <Link
      href={href}
      className={
        highlight
          ? "flex min-h-[190px] flex-col rounded-3xl bg-gradient-to-br from-red-700 via-red-600 to-rose-600 p-5 text-white shadow-xl transition hover:-translate-y-1"
          : "flex min-h-[190px] flex-col rounded-3xl border border-red-100 bg-white p-5 shadow-lg transition hover:-translate-y-1 hover:border-red-300"
      }
    >
      <div
        className={
          highlight
            ? "flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-3xl"
            : "flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-3xl"
        }
      >
        {icon}
      </div>

      <h3
        className={
          highlight
            ? "mt-4 text-xl font-black text-white"
            : "mt-4 text-xl font-black text-slate-900"
        }
      >
        {title}
      </h3>

      <p
        className={
          highlight
            ? "mt-2 text-sm leading-6 text-red-100"
            : "mt-2 text-sm leading-6 text-slate-500"
        }
      >
        {desc}
      </p>

      <div
        className={
          highlight
            ? "mt-auto pt-4 text-sm font-black text-white"
            : "mt-auto pt-4 text-sm font-black text-red-600"
        }
      >
        เข้าใช้งาน →
      </div>
    </Link>
  );
}

function ProfileCard({ employee, departmentName }: any) {
  return (
    <div className="flex min-h-[190px] flex-col rounded-3xl border border-red-100 bg-white p-5 shadow-lg">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-3xl">
        👤
      </div>

      <h3 className="mt-4 text-xl font-black text-slate-900">ข้อมูลส่วนตัว</h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ProfileRow label="ชื่อ" value={employee.full_name} />
        <ProfileRow label="รหัส" value={employee.employee_code} />
        <ProfileRow label="ตำแหน่ง" value={employee.position || "-"} />
        <ProfileRow label="แผนก" value={departmentName} />
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: any) {
  return (
    <div className="rounded-2xl bg-red-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 truncate font-black text-slate-900">{value}</p>
    </div>
  );
}