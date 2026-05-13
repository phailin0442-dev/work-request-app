import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type") || "all";

    const rows: any[] = [];

    async function loadTable(
      tableName: string,
      requestType: string
    ) {
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(error);
        return;
      }

      for (const item of data || []) {
        rows.push({
          ประเภทคำขอ: requestType,

          วันที่สร้าง:
            item.created_at
              ? new Date(
                  item.created_at
                ).toLocaleString("th-TH")
              : "-",

          รหัสพนักงาน:
            item.employee_code || "-",

          ชื่อพนักงาน:
            item.full_name || "-",

          แผนก:
            item.department_name || "-",

          ตำแหน่ง:
            item.position || "-",

          สถานะ:
            item.status || "-",

          วันที่:
            item.request_date ||
            item.leave_day ||
            item.day_off_date ||
            "-",

          วันที่สิ้นสุด:
            item.leave_to_day || "-",

          เวลาเริ่ม:
            item.start_time || "-",

          เวลาสิ้นสุด:
            item.end_time || "-",

          กะเดิม:
            item.old_shift || "-",

          กะใหม่:
            item.new_shift || "-",

          ประเภทการลา:
            item.leave_type || "-",

          จำนวนวัน:
            item.leave_total_days || "-",

          เหตุผล:
            item.reason ||
            item.leave_reason ||
            item.detail ||
            "-",

          หมายเหตุ:
            item.remark || "-",

          ผู้อนุมัติ:
            item.approved_by_name || "-",
        });
      }
    }

    if (type === "all" || type === "ot") {
      await loadTable("ot_requests", "OT");
    }

    if (type === "all" || type === "leave") {
      await loadTable(
        "leave_form_requests",
        "LEAVE"
      );
    }

    if (type === "all" || type === "shift") {
      await loadTable(
        "shift_change_requests",
        "SHIFT"
      );
    }

    if (type === "all" || type === "dayoff") {
      await loadTable(
        "day_off_change_requests",
        "DAYOFF"
      );
    }

    const headers = Object.keys(rows[0] || {});

    const csv = [
      headers.join(","),

      ...rows.map((row) =>
        headers
          .map((field) =>
            `"${String(
              row[field] ?? ""
            ).replace(/"/g, '""')}"`
          )
          .join(",")
      ),
    ].join("\n");

    return new NextResponse(
      "\uFEFF" + csv,
      {
        status: 200,
        headers: {
          "Content-Type":
            "text/csv; charset=utf-8",

          "Content-Disposition":
            'attachment; filename="report.csv"',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error?.message ||
          "เกิดข้อผิดพลาด",
      },
      {
        status: 500,
      }
    );
  }
}