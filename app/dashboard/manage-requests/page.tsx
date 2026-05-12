import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import RequestTable from "./request-table";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ManageRequestsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const activeTab = params?.tab || "ot";

  const cookieStore = await cookies();
  const employeeId = cookieStore.get("employee_session")?.value;

  if (!employeeId) {
    redirect("/login");
  }

  const { data: employee } = await supabaseAdmin
    .from("employees")
    .select("role")
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  if (!employee) {
    redirect("/login");
  }

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
    ? [
        "pending_sm",
        "pending",
        "approved_sm",
        "approved_gm",
        "approved_hr",
        "rejected",
      ]
    : [];

  const otherStatus = isSM
    ? ["pending_sm", "pending"]
    : isHR
    ? [
        "pending_sm",
        "pending",
        "approved_sm",
        "approved_gm",
        "approved_hr",
        "rejected",
      ]
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

        {isGM && (
          <RequestTable
            title="คำขอ OT: รอ GM อนุมัติ"
            table="ot_requests"
            items={otRequests || []}
            type="ot"
            role={role}
          />
        )}

        {(isSM || isHR) && (
          <>
            <div className="rounded-2xl bg-white p-4 shadow">
              <div className="grid gap-3 sm:grid-cols-4">
                <TabButton href="/dashboard/manage-requests?tab=ot" active={activeTab === "ot"}>
                  OT ({otRequests?.length || 0})
                </TabButton>

                <TabButton href="/dashboard/manage-requests?tab=shift" active={activeTab === "shift"}>
                  เปลี่ยนกะ ({shiftRequests?.length || 0})
                </TabButton>

                <TabButton href="/dashboard/manage-requests?tab=dayoff" active={activeTab === "dayoff"}>
                  เปลี่ยนวันหยุด ({dayOffRequests?.length || 0})
                </TabButton>

                <TabButton href="/dashboard/manage-requests?tab=leave" active={activeTab === "leave"}>
                  ขอลา ({leaveRequests?.length || 0})
                </TabButton>
              </div>
            </div>

            {activeTab === "ot" && (
              <RequestTable
                title={isHR ? "คำขอ OT ทั้งหมด" : "คำขอ OT: รอ SM อนุมัติ"}
                table="ot_requests"
                items={otRequests || []}
                type="ot"
                role={role}
              />
            )}

            {activeTab === "shift" && (
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
            )}

            {activeTab === "dayoff" && (
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
            )}

            {activeTab === "leave" && (
              <RequestTable
                title={isHR ? "คำขอลาทั้งหมด" : "คำขอลา: รอ SM อนุมัติ"}
                table="leave_form_requests"
                items={leaveRequests || []}
                type="leave"
                role={role}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function TabButton({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-xl bg-red-700 px-4 py-3 text-center font-semibold text-white shadow"
          : "rounded-xl bg-slate-100 px-4 py-3 text-center font-semibold text-slate-700 hover:bg-red-100"
      }
    >
      {children}
    </Link>
  );
}