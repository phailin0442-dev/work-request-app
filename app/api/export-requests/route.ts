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

type AvailableRequest = {
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

  /*
   * คอลัมน์วันที่ในตารางคำขอเป็น text
   * ถ้าอยู่ในรูป YYYY-MM-DD ให้แปลงเอง
   * เพื่อป้องกันวันที่เลื่อนจาก Timezone
   */
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

function createBatchNo() {
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

  return `EXP-${datePart}-${timePart}-${randomPart}`;
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

function getRemark(item: Record<string, any>) {
  return (
    item.remark ||
    item.note ||
    item.comment ||
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

async function deleteCreatedBatch(
  batchId: string | null
) {
  if (!batchId) {
    return;
  }

  /*
   * export_batch_items ถูกลบตาม
   * เพราะ Foreign Key ใช้ ON DELETE CASCADE
   */
  const { error } = await supabaseAdmin
    .from("export_batches")
    .delete()
    .eq("id", batchId);

  if (error) {
    console.error(
      "ลบชุดงานที่สร้างไม่สำเร็จ:",
      error
    );
  }
}

export async function POST(req: Request) {
  let createdBatchId: string | null = null;

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

    const validTypes = [
      "all",
      "ot",
      "leave",
      "shift",
      "dayoff",
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
     *
     * ไม่กรอง active เพื่อให้คำขอเก่าของพนักงาน
     * ที่ถูกปิดสถานะแล้วยัง Export ได้
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

    /*
     * สร้าง Map จาก employee_code
     */
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

    const availableRequests: AvailableRequest[] =
      [];

    let skippedItems = 0;
    let totalMatchedBeforeLock = 0;

    /*
     * 4. โหลดข้อมูลจากตารางคำขอ
     */
    for (const requestType of typesToLoad) {
      const config =
        requestConfigs[requestType];

      let query = supabaseAdmin
        .from(config.tableName)
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      /*
       * กรองตามวันที่สร้างคำขอ
       */
      if (startDate) {
        query = query.gte(
          "created_at",
          `${startDate}T00:00:00.000+07:00`
        );
      }

      if (endDate) {
        query = query.lte(
          "created_at",
          `${endDate}T23:59:59.999+07:00`
        );
      }

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

        return true;
      });

      totalMatchedBeforeLock +=
        filteredRequests.length;

      if (filteredRequests.length === 0) {
        continue;
      }

      /*
       * Primary Key จริงของตารางคำขอคือ request_id
       * ไม่ใช่ id
       */
      const requestIds = filteredRequests
        .map((item) => item.request_id)
        .filter(
          (
            requestId
          ): requestId is string =>
            Boolean(requestId)
        );

      if (requestIds.length === 0) {
        continue;
      }

      /*
       * 6. เช็กว่ารายการใดถูก HR คนอื่นรับไปแล้ว
       */
      const {
        data: existingBatchItems,
        error: existingBatchError,
      } = await supabaseAdmin
        .from("export_batch_items")
        .select("request_id")
        .eq("request_type", requestType)
        .in("request_id", requestIds);

      if (existingBatchError) {
        throw new Error(
          `ตรวจสอบรายการที่ถูกล็อกไม่สำเร็จ: ${existingBatchError.message}`
        );
      }

      const claimedRequestIds = new Set(
        (existingBatchItems || []).map(
          (batchItem) =>
            String(batchItem.request_id)
        )
      );

      /*
       * 7. เลือกเฉพาะรายการที่ยังไม่มี HR รับ
       */
      for (const item of filteredRequests) {
        if (!item.request_id) {
          continue;
        }

        const requestId = String(
          item.request_id
        );

        if (
          claimedRequestIds.has(requestId)
        ) {
          skippedItems += 1;
          continue;
        }

        const employeeCode =
          normalizeEmployeeCode(
            item.employee_code
          );

        availableRequests.push({
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
     * 8. ไม่มีข้อมูลที่รับงานได้
     */
    if (availableRequests.length === 0) {
      if (
        totalMatchedBeforeLock > 0 &&
        skippedItems > 0
      ) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "รายการตามเงื่อนไขนี้ถูก HR รับไปดำเนินการแล้วทั้งหมด",
          },
          {
            status: 409,
          }
        );
      }

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

    /*
     * 9. สร้างชุดงาน Export
     */
    const batchNo = createBatchNo();

    const {
      data: batch,
      error: batchError,
    } = await supabaseAdmin
      .from("export_batches")
      .insert({
        batch_no: batchNo,

        request_type: selectedType,

        department_name:
          selectedDepartment === "all" ||
            selectedDepartment === "ทั้งหมด"
            ? null
            : selectedDepartment,

        start_date: startDate || null,
        end_date: endDate || null,

        total_items:
          availableRequests.length,

        status: "in_progress",

        claimed_by: currentHr.id,

        claimed_at:
          new Date().toISOString(),
      })
      .select(`
        id,
        batch_no
      `)
      .single();

    if (batchError || !batch) {
      throw new Error(
        `สร้างชุดงานไม่สำเร็จ: ${batchError?.message ||
        "ไม่พบข้อมูลชุดงาน"
        }`
      );
    }

    createdBatchId = batch.id;

    /*
     * 10. ล็อกรายการคำขอ
     */
    const batchItems =
      availableRequests.map(
        (requestItem) => ({
          batch_id: batch.id,

          request_type:
            requestItem.requestType,

          request_id:
            requestItem.requestId,

          employee_code:
            requestItem.employeeCode ||
            null,

          process_status:
            "in_progress",
        })
      );

    const { error: batchItemsError } =
      await supabaseAdmin
        .from("export_batch_items")
        .insert(batchItems);

    if (batchItemsError) {
      await deleteCreatedBatch(batch.id);

      createdBatchId = null;

      /*
       * Unique constraint จะกันกรณี
       * HR สองคนกดรับรายการเดียวกันพร้อมกัน
       */
      if (
        batchItemsError.code === "23505"
      ) {
        return NextResponse.json(
          {
            ok: false,
            message:
              "มี HR คนอื่นรับบางรายการไปพร้อมกัน กรุณากดรับงานใหม่อีกครั้ง",
          },
          {
            status: 409,
          }
        );
      }

      throw new Error(
        `ล็อกรายการไม่สำเร็จ: ${batchItemsError.message}`
      );
    }

    /*
     * 11. สร้างข้อมูล Excel
     */
    const excelRows =
      availableRequests.map(
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
            เลขชุดงาน: batch.batch_no,

            ประเภทคำขอ:
              requestTypeLabel,

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

            หมายเหตุ:
              displayValue(
                getRemark(item)
              ),

            ผู้อนุมัติ:
              displayValue(
                item.approved_by_name
              ),

            ผู้รับชุดงาน:
              currentHr.full_name ||
              currentHr.employee_code,

            สถานะดำเนินการ:
              "กำลังดำเนินการ",
          };
        }
      );

    /*
     * 12. สร้าง Excel .xlsx
     */
    const worksheet =
      XLSX.utils.json_to_sheet(
        excelRows
      );

    worksheet["!cols"] = [
      { wch: 28 }, // เลขชุดงาน
      { wch: 18 }, // ประเภทคำขอ
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
      { wch: 35 }, // หมายเหตุ
      { wch: 28 }, // ผู้อนุมัติ
      { wch: 28 }, // ผู้รับชุดงาน
      { wch: 20 }, // สถานะดำเนินการ
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
      "รายการดำเนินการ"
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
        `${batch.batch_no}.xlsx`
      );

    createdBatchId = null;

    /*
     * 13. ส่งไฟล์กลับไปให้หน้าเว็บดาวน์โหลด
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

          "X-Batch-Id": batch.id,

          "X-Batch-No":
            batch.batch_no,

          "X-Exported-Items": String(
            availableRequests.length
          ),

          "X-Skipped-Items": String(
            skippedItems
          ),

          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: unknown) {
    console.error(
      "Export requests error:",
      error
    );

    /*
     * ถ้าสร้างชุดงานแล้วเกิด Error ระหว่างทาง
     * ให้ลบชุดงานออก เพื่อไม่ให้รายการค้าง
     */
    if (createdBatchId) {
      await deleteCreatedBatch(
        createdBatchId
      );
    }

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