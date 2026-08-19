import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type RequestType = "ot" | "shift" | "dayoff" | "leave";

const tableByType: Record<RequestType, string> = {
  ot: "ot_requests",
  shift: "shift_change_requests",
  dayoff: "day_off_change_requests",
  leave: "leave_form_requests",
};

const allowedStatuses = [
  "pending",
  "pending_sm",
  "approved_sm",
  "approved_gm",
  "approved_hr",
  "rejected",
] as const;

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const table = cleanString(body.table);
    const type = cleanString(body.type) as RequestType;
    const requestId = cleanString(body.request_id);
    const data = body.data ?? {};

    if (!Object.prototype.hasOwnProperty.call(tableByType, type)) {
      return NextResponse.json(
        {
          ok: false,
          message: "ประเภทคำขอไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    const expectedTable = tableByType[type];

    if (table !== expectedTable) {
      return NextResponse.json(
        {
          ok: false,
          message: "ตารางไม่ตรงกับประเภทคำขอ",
        },
        { status: 400 }
      );
    }

    if (!requestId) {
      return NextResponse.json(
        {
          ok: false,
          message: "ไม่พบ request_id",
        },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const employeeId = cookieStore.get("employee_session")?.value;

    if (!employeeId) {
      return NextResponse.json(
        {
          ok: false,
          message: "กรุณาเข้าสู่ระบบใหม่",
        },
        { status: 401 }
      );
    }

    const { data: approver, error: approverError } = await supabaseAdmin
      .from("employees")
      .select("id, role, active")
      .eq("id", employeeId)
      .eq("active", true)
      .maybeSingle();

    if (approverError) {
      console.error("Load approver error:", approverError);

      return NextResponse.json(
        {
          ok: false,
          message: "ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้งานได้",
        },
        { status: 500 }
      );
    }

    if (!approver) {
      return NextResponse.json(
        {
          ok: false,
          message: "ไม่พบบัญชีผู้ใช้งาน",
        },
        { status: 401 }
      );
    }

    const role = cleanString(approver.role).toLowerCase();

    if (role !== "hr") {
      return NextResponse.json(
        {
          ok: false,
          message: "เฉพาะ HR เท่านั้นที่แก้ไขข้อมูลคำขอได้",
        },
        { status: 403 }
      );
    }

    const status = cleanString(data.status);

    if (
      status &&
      !allowedStatuses.includes(
        status as (typeof allowedStatuses)[number]
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "สถานะคำขอไม่ถูกต้อง",
        },
        { status: 400 }
      );
    }

    let updateData: Record<string, string | number | null>;

    switch (type) {
      case "ot":
        updateData = {
          ot_date: cleanString(data.ot_date),
          start_time: cleanString(data.start_time),
          end_time: cleanString(data.end_time),
          reason: cleanString(data.reason),
          status,
        };
        break;

      case "shift":
        updateData = {
          shift_date: cleanString(data.shift_date),
          old_shift_code: cleanString(data.old_shift_code),
          old_shift_time: cleanString(data.old_shift_time),
          new_shift_code: cleanString(data.new_shift_code),
          new_shift_time: cleanString(data.new_shift_time),
          reason: cleanString(data.reason),
          status,
        };
        break;

      case "dayoff":
        updateData = {
          old_day_off: cleanString(data.old_day_off),
          new_day_off: cleanString(data.new_day_off),
          reason: cleanString(data.reason),
          status,
        };
        break;

      case "leave": {
        const leaveTotalDaysText = cleanString(data.leave_total_days);

        const leaveTotalDays =
          leaveTotalDaysText === ""
            ? null
            : Number(leaveTotalDaysText);

        if (
          leaveTotalDays !== null &&
          (!Number.isFinite(leaveTotalDays) || leaveTotalDays < 0)
        ) {
          return NextResponse.json(
            {
              ok: false,
              message: "จำนวนวันลาไม่ถูกต้อง",
            },
            { status: 400 }
          );
        }

        updateData = {
          leave_type: cleanString(data.leave_type),
          leave_day: cleanString(data.leave_day),
          leave_to_day: cleanString(data.leave_to_day) || null,
          leave_total_days: leaveTotalDays,
          leave_reason: cleanString(data.leave_reason),
          status,
        };
        break;
      }

      default:
        return NextResponse.json(
          {
            ok: false,
            message: "ประเภทคำขอไม่ถูกต้อง",
          },
          { status: 400 }
        );
    }

    const { data: updatedRequest, error: updateError } =
      await supabaseAdmin
        .from(table)
        .update(updateData)
        .eq("request_id", requestId)
        .select("request_id")
        .maybeSingle();

    if (updateError) {
      console.error("Update request data error:", updateError);

      return NextResponse.json(
        {
          ok: false,
          message: updateError.message,
        },
        { status: 500 }
      );
    }

    if (!updatedRequest) {
      return NextResponse.json(
        {
          ok: false,
          message: "ไม่พบรายการที่ต้องการแก้ไข",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "แก้ไขข้อมูลสำเร็จ",
    });
  } catch (error: unknown) {
    console.error("Update request data API error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "เกิดข้อผิดพลาด";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 }
    );
  }
}