import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "ไม่พบ NEXT_PUBLIC_SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY"
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

/*
 * API นี้เป็น "Export สำหรับดูเท่านั้น"
 * ต่างจาก /api/export-requests ตรงที่:
 * - ไม่สร้าง export_batches / export_batch_items
 * - ไม่ล็อกรายการ ไม่เช็กว่าถูก HR คนอื่นรับไปแล้วหรือไม่
 * - HR สามารถกดส่งออกซ้ำกี่ครั้งก็ได้ ไม่มีผลต่อสถานะคำขอ
 */

type RequestType =
  | "ot"
  | "leave"
  | "shift"
  | "dayoff";

type Employee = {
  id: string;
  employee_code: string;
  full_name: string | null;
  position: string | null;
  role?: string | null;
  department_id?: string | null;
  department_name: string | null;
  active?: boolean | null;
};

type CurrentHr = {
  id: string;
  employee_code: string;
  full_name: string | null;
  position: string | null;
  role: string | null;
  active: boolean | null;
};

type RequestConfig = {
  tableName: string;
  label: string;
};

type MatchedRequest = {
  requestType: RequestType;
  requestTypeLabel: string;
  requestId: string;
  employeeCode: string;
  employee: Employee | null;
  item: Record<string, any>;
};

const requestConfigs: Record<
  RequestType,
  RequestConfig
> = {
  ot: {
    tableName: "ot_requests",
    label: "OT",
  },

  leave: {
    tableName: "leave_form_requests",
    label: "ลา",
  },

  shift: {
    tableName: "shift_change_requests",
    label: "เปลี่ยนกะ",
  },

  dayoff: {
    tableName: "day_off_change_requests",
    label: "เปลี่ยนวันหยุด",
  },
};

function normalizeEmployeeCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeDepartment(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_&/]+/g, "");
}

/*
 * ตาราง shift/dayoff บันทึกสถานะเริ่มต้นเป็น "pending"
 * ส่วน ot/leave บันทึกเป็น "pending_sm"
 * ให้ normalize ให้เป็นค่าเดียวกันก่อนเทียบกับตัวกรอง
 */
function normalizeStatusValue(
  value: unknown
): string {
  const status = String(value ?? "")
    .trim()
    .toLowerCase();

  return status === "pending"
    ? "pending_sm"
    : status;
}

function displayValue(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  return String(value);
}

function formatDateTime(value: unknown) {
  if (!value) {
    return "-";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: unknown) {
  if (!value || value === "-") {
    return "-";
  }

  const text = String(value).trim();

  const dateOnlyMatch = text.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]) + 543;
    const month = dateOnlyMatch[2];
    const day = dateOnlyMatch[3];

    return `${day}/${month}/${year}`;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return date.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function createExportRef() {
  const now = new Date();

  const datePart = now
    .toLocaleDateString("en-CA", {
      timeZone: "Asia/Bangkok",
    })
    .replaceAll("-", "");

  const timePart = now
    .toLocaleTimeString("en-GB", {
      timeZone: "Asia/Bangkok",
      hour12: false,
    })
    .replaceAll(":", "");

  const randomPart = Math.floor(
    1000 + Math.random() * 9000
  );

  return `VIEW-${datePart}-${timePart}-${randomPart}`;
}

function getRequestDate(
  requestType: RequestType,
  item: Record<string, any>
) {
  switch (requestType) {
    case "ot":
      return item.ot_date || "-";

    case "leave":
      return item.leave_day || "-";

    case "shift":
      return item.shift_date || "-";

    case "dayoff":
      return item.old_day_off || "-";

    default:
      return "-";
  }
}

function getEndDate(
  requestType: RequestType,
  item: Record<string, any>
) {
  switch (requestType) {
    case "leave":
      return item.leave_to_day || "-";

    case "dayoff":
      return item.new_day_off || "-";

    default:
      return "-";
  }
}

/*
 * คำนวณ "วันที่ของรายการจริง" ของแต่ละประเภทคำขอ
 * เพื่อใช้กรองตามช่วงวันที่ที่ HR เลือก
 * (ไม่ใช่วันที่พนักงานกดส่งฟอร์ม)
 */
function getEventDateRange(
  requestType: RequestType,
  item: Record<string, any>
): { start: string; end: string } | null {
  switch (requestType) {
    case "ot": {
      const date = String(
        item.ot_date || ""
      ).trim();

      if (!date) return null;

      return { start: date, end: date };
    }

    case "shift": {
      const date = String(
        item.shift_date || ""
      ).trim();

      if (!date) return null;

      return { start: date, end: date };
    }

    case "dayoff": {
      /*
       * ใช้ old_day_off เพราะเป็นวันที่จริง
       * ที่ตารางงานจะได้รับผลกระทบ
       */
      const date = String(
        item.old_day_off || ""
      ).trim();

      if (!date) return null;

      return { start: date, end: date };
    }

    case "leave": {
      const start = String(
        item.leave_day || ""
      ).trim();

      if (!start) return null;

      const end =
        String(
          item.leave_to_day || ""
        ).trim() || start;

      return { start, end };
    }

    default:
      return null;
  }
}

/*
 * เช็กว่าวันที่ของรายการ (event date)
 * ทับซ้อนกับช่วงวันที่ที่ HR เลือกหรือไม่
 * รองรับกรณีลาหลายวัน (ช่วงเทียบกับช่วง)
 */
function isWithinDateFilter(
  eventRange: {
    start: string;
    end: string;
  } | null,
  startDate: string,
  endDate: string
) {
  if (!startDate && !endDate) {
    return true;
  }

  if (!eventRange) {
    return false;
  }

  if (
    startDate &&
    eventRange.end < startDate
  ) {
    return false;
  }

  if (
    endDate &&
    eventRange.start > endDate
  ) {
    return false;
  }

  return true;
}

function getOldShift(item: Record<string, any>) {
  const code = String(
    item.old_shift_code || ""
  ).trim();

  const time = String(
    item.old_shift_time || ""
  ).trim();

  if (code && time) {
    return `${code} (${time})`;
  }

  return code || time || "-";
}

function getNewShift(item: Record<string, any>) {
  const code = String(
    item.new_shift_code || ""
  ).trim();

  const time = String(
    item.new_shift_time || ""
  ).trim();

  if (code && time) {
    return `${code} (${time})`;
  }

  return code || time || "-";
}

function getReason(item: Record<string, any>) {
  return (
    item.reason ||
    item.leave_reason ||
    item.detail ||
    "-"
  );
}

async function getCurrentHr(): Promise<CurrentHr | null> {
  const cookieStore = await cookies();

  const employeeId = cookieStore.get(
    "employee_session"
  )?.value;

  if (!employeeId) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("employees")
    .select(`
      id,
      employee_code,
      full_name,
      position,
      role,
      active
    `)
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    console.error(
      "Current HR error:",
      error
    );

    return null;
  }

  const normalizedRole = String(
    data.role || ""
  )
    .trim()
    .toLowerCase();

  if (
    normalizedRole !== "hr" &&
    normalizedRole !== "human resources"
  ) {
    return null;
  }

  return data as CurrentHr;
}

export async function POST(req: Request) {
  try {
    /*
     * 1. ตรวจสอบ HR ที่กำลังล็อกอิน
     */
    const currentHr = await getCurrentHr();

    if (!currentHr) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "ไม่พบสิทธิ์ HR หรือ Session หมดอายุ กรุณาเข้าสู่ระบบใหม่",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * 2. รับค่าตัวกรองจากหน้า Export
     */
    const body = await req.json();

    const selectedType = String(
      body.type || "all"
    )
      .trim()
      .toLowerCase();

    const selectedDepartment = String(
      body.department || "all"
    ).trim();

    const startDate = String(
      body.startDate || ""
    ).trim();

    const endDate = String(
      body.endDate || ""
    ).trim();

    const selectedStatus = String(
      body.status || "all"
    ).trim();

    const validTypes = [
      "all",
      "ot",
      "leave",
      "shift",
      "dayoff",
    ];

    const validStatuses = [
      "all",
      "pending_sm",
      "approved_sm",
      "approved_gm",
      "approved_hr",
      "rejected",
    ];

    if (!validTypes.includes(selectedType)) {
      return NextResponse.json(
        {
          ok: false,
          message: "ประเภทรายการไม่ถูกต้อง",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !validStatuses.includes(
        selectedStatus
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "สถานะไม่ถูกต้อง",
        },
        {
          status: 400,
        }
      );
    }

    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * 3. โหลดข้อมูลพนักงาน
     */
    const {
      data: employees,
      error: employeesError,
    } = await supabaseAdmin
      .from("employees")
      .select(`
        id,
        employee_code,
        full_name,
        position,
        role,
        department_id,
        department_name,
        active
      `);

    if (employeesError) {
      throw new Error(
        `โหลดข้อมูลพนักงานไม่สำเร็จ: ${employeesError.message}`
      );
    }

    const employeeMap = new Map<
      string,
      Employee
    >();

    for (const employee of employees || []) {
      const employeeCode =
        normalizeEmployeeCode(
          employee.employee_code
        );

      if (!employeeCode) {
        continue;
      }

      employeeMap.set(
        employeeCode,
        employee as Employee
      );
    }

    const typesToLoad: RequestType[] =
      selectedType === "all"
        ? [
          "ot",
          "leave",
          "shift",
          "dayoff",
        ]
        : [selectedType as RequestType];

    const matchedRequests: MatchedRequest[] =
      [];

    /*
     * 4. โหลดข้อมูลจากตารางคำขอ
     *    (ไม่มีการเช็กหรือบันทึกการล็อกใด ๆ
     *    เพราะเป็นโหมด "ดูเท่านั้น" ส่งออกซ้ำได้ไม่จำกัด)
     */
    for (const requestType of typesToLoad) {
      const config =
        requestConfigs[requestType];

      /*
       * ไม่กรองวันที่ตรงนี้แล้ว เพราะตัวกรองวันที่
       * ต้องอิงจาก "วันที่ของรายการจริง" เช่น
       * วันที่ OT / วันที่เปลี่ยนกะ / วันที่ลา
       * ไม่ใช่วันที่พนักงานกดส่งฟอร์ม (created_at)
       * จะไปกรองด้วย getEventDateRange ในขั้นตอนถัดไป
       */
      const query = supabaseAdmin
        .from(config.tableName)
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      const {
        data: requestData,
        error: requestError,
      } = await query;

      if (requestError) {
        throw new Error(
          `โหลดข้อมูลจาก ${config.tableName} ไม่สำเร็จ: ${requestError.message}`
        );
      }

      /*
       * 5. กรองตามแผนก
       */
      const filteredRequests = (
        requestData || []
      ).filter((item) => {
        const employeeCode =
          normalizeEmployeeCode(
            item.employee_code
          );

        const employee =
          employeeMap.get(employeeCode);

        const requestDepartment =
          item.department_name ||
          employee?.department_name ||
          "";

        const currentDepartment =
          normalizeDepartment(
            requestDepartment
          );

        const wantedDepartment =
          normalizeDepartment(
            selectedDepartment
          );

        const isAllDepartments =
          selectedDepartment === "all" ||
          selectedDepartment === "ทั้งหมด";

        if (
          !isAllDepartments &&
          currentDepartment !== wantedDepartment
        ) {
          return false;
        }

        const eventDateRange =
          getEventDateRange(
            requestType,
            item
          );

        if (
          !isWithinDateFilter(
            eventDateRange,
            startDate,
            endDate
          )
        ) {
          return false;
        }

        if (selectedStatus !== "all") {
          const currentStatus =
            normalizeStatusValue(
              item.status
            );

          if (
            currentStatus !==
            selectedStatus
          ) {
            return false;
          }
        }

        return true;
      });

      for (const item of filteredRequests) {
        if (!item.request_id) {
          continue;
        }

        const requestId = String(
          item.request_id
        );

        const employeeCode =
          normalizeEmployeeCode(
            item.employee_code
          );

        matchedRequests.push({
          requestType,
          requestTypeLabel:
            config.label,
          requestId,
          employeeCode,
          employee:
            employeeMap.get(
              employeeCode
            ) || null,
          item,
        });
      }
    }

    /*
     * 6. ไม่มีข้อมูลตามเงื่อนไข
     */
    if (matchedRequests.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "ไม่มีข้อมูลตามเงื่อนไขที่เลือก",
        },
        {
          status: 404,
        }
      );
    }

    const exportRef = createExportRef();

    /*
     * 7. สร้างข้อมูล Excel
     */
    const excelRows =
      matchedRequests.map(
        ({
          requestType,
          requestTypeLabel,
          employeeCode,
          employee,
          item,
        }) => {
          const fullName =
            item.full_name ||
            employee?.full_name ||
            "-";

          const departmentName =
            item.department_name ||
            employee?.department_name ||
            "-";

          const position =
            item.position ||
            employee?.position ||
            "-";

          return {
            เลขอ้างอิง: exportRef,

            ประเภทคำขอ:
              requestTypeLabel,

            ประเภทOT:
              requestType === "ot"
                ? displayValue(item.ot_type)
                : "-",

            วันที่สร้าง:
              formatDateTime(
                item.created_at
              ),

            รหัสพนักงาน:
              employeeCode || "-",

            ชื่อพนักงาน:
              displayValue(fullName),

            แผนก:
              displayValue(
                departmentName
              ),

            ตำแหน่ง:
              displayValue(position),

            สถานะ:
              displayValue(item.status),

            วันที่: formatDate(
              getRequestDate(
                requestType,
                item
              )
            ),

            วันที่สิ้นสุด:
              formatDate(
                getEndDate(
                  requestType,
                  item
                )
              ),

            เวลาเริ่ม:
              displayValue(
                item.start_time
              ),

            เวลาสิ้นสุด:
              displayValue(
                item.end_time
              ),

            กะเดิม:
              requestType === "shift"
                ? getOldShift(item)
                : "-",

            กะใหม่:
              requestType === "shift"
                ? getNewShift(item)
                : "-",

            ประเภทการลา:
              displayValue(
                item.leave_type
              ),

            จำนวนวัน:
              displayValue(
                item.leave_total_days
              ),

            เหตุผล:
              displayValue(
                getReason(item)
              ),

            ผู้Export:
              currentHr.full_name ||
              currentHr.employee_code,
          };
        }
      );

    /*
     * 8. สร้าง Excel .xlsx
     */
    const worksheet =
      XLSX.utils.json_to_sheet(
        excelRows
      );

    worksheet["!cols"] = [
      { wch: 28 }, // เลขอ้างอิง
      { wch: 18 }, // ประเภทคำขอ
      { wch: 24 }, // ประเภท OT
      { wch: 22 }, // วันที่สร้าง
      { wch: 16 }, // รหัสพนักงาน
      { wch: 28 }, // ชื่อพนักงาน
      { wch: 24 }, // แผนก
      { wch: 22 }, // ตำแหน่ง
      { wch: 18 }, // สถานะ
      { wch: 16 }, // วันที่
      { wch: 16 }, // วันที่สิ้นสุด
      { wch: 13 }, // เวลาเริ่ม
      { wch: 13 }, // เวลาสิ้นสุด
      { wch: 24 }, // กะเดิม
      { wch: 24 }, // กะใหม่
      { wch: 20 }, // ประเภทการลา
      { wch: 12 }, // จำนวนวัน
      { wch: 40 }, // เหตุผล
      { wch: 28 }, // ผู้ Export
    ];

    if (worksheet["!ref"]) {
      worksheet["!autofilter"] = {
        ref: worksheet["!ref"],
      };
    }

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "รายการ (ดูเท่านั้น)"
    );

    const excelBuffer = XLSX.write(
      workbook,
      {
        type: "buffer",
        bookType: "xlsx",
      }
    );

    const encodedFileName =
      encodeURIComponent(
        `${exportRef}.xlsx`
      );

    /*
     * 9. ส่งไฟล์กลับไปให้หน้าเว็บดาวน์โหลด
     *    ไม่มีการล็อกหรือบันทึกชุดงานใด ๆ
     */
    return new NextResponse(
      new Uint8Array(excelBuffer),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

          "Content-Disposition":
            `attachment; filename*=UTF-8''${encodedFileName}`,

          "X-Export-Ref": exportRef,

          "X-Exported-Items": String(
            matchedRequests.length
          ),

          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: unknown) {
    console.error(
      "Export requests (view-only) error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        message:
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการ Export",
      },
      {
        status: 500,
      }
    );
  }
}
