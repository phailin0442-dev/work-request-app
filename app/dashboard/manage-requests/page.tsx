import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import RequestTable from "./request-table";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ManageRequestsPage() {
  const cookieStore = await cookies();
  const employeeId = cookieStore.get("employee_session")?.value;

  if (!employeeId) redirect("/login");

  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("role")
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  if (!employee) redirect("/login");

  const role = String(employee.role || "").trim().toLowerCase();

  if (
    role !== "section_manager" &&
    role !== "general_manager" &&
    role !== "hr"
  ) {
    redirect("/dashboard");
  }

  const isSM = role === "section_manager";
  const isGM = role === "general_manager";
  const isHR = role === "hr";

  const otStatus = isSM
    ? ["pending_sm", "pending"]
    : isGM
    ? ["approved_sm"]
    : isHR
    ? ["pending_sm", "pending", "approved_sm", "approved_gm", "approved_hr", "rejected"]
    : [];

  const otherStatus = isSM
    ? ["pending_sm", "pending"]
    : isHR
    ? ["pending_sm", "pending", "approved_sm", "approved_gm", "approved_hr", "rejected"]
    : [];

  const { data: otRequests } =
    otStatus.length > 0
      ? await supabaseAdmin
          .from("ot_requests")
          .select("*")
          .in("status", otStatus)
          .order("created_at", { ascending: false })
      : { data: [] };

  const { data: shiftRequests } =
    otherStatus.length > 0
      ? await supabaseAdmin
          .from("shift_change_requests")
          .select("*")
          .in("status", otherStatus)
          .order("created_at", { ascending: false })
      : { data: [] };

  const { data: dayOffRequests } =
    otherStatus.length > 0
      ? await supabaseAdmin
          .from("day_off_change_requests")
          .select("*")
          .in("status", otherStatus)
          .order("created_at", { ascending: false })
      : { data: [] };

  const { data: leaveRequests } =
    otherStatus.length > 0
      ? await supabaseAdmin
          .from("leave_form_requests")
          .select("*")
          .in("status", otherStatus)
          .order("created_at", { ascending: false })
      : { data: [] };

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">จัดการคำขอ</h1>
            <p className="mt-1 text-slate-600">Role: {role}</p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          >
            กลับ Dashboard
          </Link>
        </div>

        {(isSM || isGM || isHR) && (
          <RequestTable
            title={
              isHR
                ? "คำขอ OT ทั้งหมด"
                : isSM
                ? "คำขอ OT: รอ SM อนุมัติ"
                : "คำขอ OT: รอ GM อนุมัติ"
            }
            table="ot_requests"
            items={otRequests || []}
            type="ot"
            role={role}
          />
        )}

        {(isSM || isHR) && (
          <>
            <RequestTable
              title={
                isHR
                  ? "คำขอเปลี่ยนกะทั้งหมด"
                  : "คำขอเปลี่ยนกะ: รอ SM อนุมัติ"
              }
              table="shift_change_requests"
              items={shiftRequests || []}
              type="shift"
              role={role}
            />

            <RequestTable
              title={
                isHR
                  ? "คำขอเปลี่ยนวันหยุดทั้งหมด"
                  : "คำขอเปลี่ยนวันหยุด: รอ SM อนุมัติ"
              }
              table="day_off_change_requests"
              items={dayOffRequests || []}
              type="dayoff"
              role={role}
            />

            <RequestTable
              title={
                isHR
                  ? "คำขอลาทั้งหมด"
                  : "คำขอลา: รอ SM อนุมัติ"
              }
              table="leave_form_requests"
              items={leaveRequests || []}
              type="leave"
              role={role}
            />
          </>
        )}
      </div>
    </main>
  );
}