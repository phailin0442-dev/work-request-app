import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function MyRequestsPage({
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
    .select("employee_code")
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  if (!employee) {
    redirect("/login");
  }

  const employeeCode = employee.employee_code;

  const { data: otRequests } = await supabaseAdmin
    .from("ot_requests")
    .select("*")
    .eq("employee_code", employeeCode)
    .order("created_at", { ascending: false });

  const { data: shiftRequests } = await supabaseAdmin
    .from("shift_change_requests")
    .select("*")
    .eq("employee_code", employeeCode)
    .order("created_at", { ascending: false });

  const { data: dayOffRequests } = await supabaseAdmin
    .from("day_off_change_requests")
    .select("*")
    .eq("employee_code", employeeCode)
    .order("created_at", { ascending: false });

  const { data: leaveRequests } = await supabaseAdmin
    .from("leave_form_requests")
    .select("*")
    .eq("employee_code", employeeCode)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">คำขอของฉัน</h1>
            <p className="mt-1 text-slate-600">
              ดูสถานะคำขอทั้งหมดของพนักงาน
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          >
            กลับ Dashboard
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="grid gap-3 sm:grid-cols-4">
            <TabButton
              href="/dashboard/my-requests?tab=ot"
              active={activeTab === "ot"}
            >
              OT ({otRequests?.length || 0})
            </TabButton>

            <TabButton
              href="/dashboard/my-requests?tab=shift"
              active={activeTab === "shift"}
            >
              เปลี่ยนกะ ({shiftRequests?.length || 0})
            </TabButton>

            <TabButton
              href="/dashboard/my-requests?tab=dayoff"
              active={activeTab === "dayoff"}
            >
              เปลี่ยนวันหยุด ({dayOffRequests?.length || 0})
            </TabButton>

            <TabButton
              href="/dashboard/my-requests?tab=leave"
              active={activeTab === "leave"}
            >
              ลา ({leaveRequests?.length || 0})
            </TabButton>
          </div>
        </div>

        {activeTab === "ot" && (
          <RequestCard
            title="รายการ OT"
            items={otRequests || []}
            type="ot"
          />
        )}

        {activeTab === "shift" && (
          <RequestCard
            title="รายการเปลี่ยนกะ"
            items={shiftRequests || []}
            type="shift"
          />
        )}

        {activeTab === "dayoff" && (
          <RequestCard
            title="รายการเปลี่ยนวันหยุด"
            items={dayOffRequests || []}
            type="dayoff"
          />
        )}

        {activeTab === "leave" && (
          <RequestCard
            title="รายการลา"
            items={leaveRequests || []}
            type="leave"
          />
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

function RequestCard({
  title,
  items,
  type,
}: {
  title: string;
  items: any[];
  type: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow">
      <div className="bg-red-700 px-6 py-4 text-white">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>

      {items.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">ไม่มีรายการ</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-100 text-left">
                <th className="p-3">วันที่</th>
                <th className="p-3">รายละเอียด</th>
                <th className="p-3">เหตุผล</th>
                <th className="p-3">สถานะ</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.request_id} className="border-b align-top">
                  <td className="p-3">
                    {type === "ot" && item.ot_date}

                    {type === "shift" && item.shift_date}

                    {type === "dayoff" && item.old_day_off}

                    {type === "leave" && (
                      <>
                        {item.leave_day}
                        {item.leave_to_day
                          ? ` ถึง ${item.leave_to_day}`
                          : ""}
                      </>
                    )}
                  </td>

                  <td className="p-3">
                    {type === "ot" && (
                      <>
                        <div>{item.ot_type}</div>
                        <div>
                          {item.start_time} - {item.end_time}
                        </div>
                      </>
                    )}

                    {type === "shift" && (
                      <>
                        {item.old_shift_code} {item.old_shift_time}
                        <br />→<br />
                        {item.new_shift_code} {item.new_shift_time}
                      </>
                    )}

                    {type === "dayoff" && (
                      <>
                        {item.old_day_off} → {item.new_day_off}
                      </>
                    )}

                    {type === "leave" && (
                      <>
                        <div>{item.leave_type}</div>

                        {item.leave_total_days && (
                          <div>{item.leave_total_days} วัน</div>
                        )}
                      </>
                    )}
                  </td>

                  <td className="p-3">
                    {type === "leave"
                      ? item.leave_reason
                      : item.reason}
                  </td>

                  <td className="p-3">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "pending" || status === "pending_sm"
      ? "รอ SM อนุมัติ"
      : status === "approved_sm"
      ? "SM อนุมัติแล้ว"
      : status === "approved_gm"
      ? "GM อนุมัติแล้ว"
      : status === "approved_hr"
      ? "HR อนุมัติแล้ว"
      : status === "rejected"
      ? "ไม่อนุมัติ"
      : status;

  const className =
    status === "approved_gm" || status === "approved_hr"
      ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
      : status === "approved_sm"
      ? "rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
      : status === "rejected"
      ? "rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
      : "rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700";

  return <span className={className}>{label}</span>;
}