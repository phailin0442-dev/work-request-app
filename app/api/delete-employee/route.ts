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

function cleanString(value: unknown): string {
    return String(value ?? "").trim();
}

function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value
    );
}

export async function DELETE(request: Request) {
    try {
        const cookieStore = await cookies();
        const currentEmployeeId =
            cookieStore.get("employee_session")?.value || "";

        if (!isUuid(currentEmployeeId)) {
            return NextResponse.json(
                { ok: false, message: "กรุณาเข้าสู่ระบบใหม่" },
                { status: 401 }
            );
        }

        const { data: currentUser, error: currentUserError } =
            await supabaseAdmin
                .from("employees")
                .select("id, role, active")
                .eq("id", currentEmployeeId)
                .eq("active", true)
                .maybeSingle();

        if (currentUserError) {
            console.error("Load current HR error:", currentUserError);

            return NextResponse.json(
                { ok: false, message: "ไม่สามารถตรวจสอบสิทธิ์ได้" },
                { status: 500 }
            );
        }

        const role = cleanString(currentUser?.role).toLowerCase();

        if (!currentUser || role !== "hr") {
            return NextResponse.json(
                { ok: false, message: "เฉพาะ HR เท่านั้นที่ลบพนักงานได้" },
                { status: 403 }
            );
        }

        const body: Record<string, unknown> = await request.json();
        const employeeId = cleanString(body.id);

        if (!isUuid(employeeId)) {
            return NextResponse.json(
                { ok: false, message: "รหัสข้อมูลพนักงานไม่ถูกต้อง" },
                { status: 400 }
            );
        }

        if (employeeId === currentEmployeeId) {
            return NextResponse.json(
                { ok: false, message: "ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้" },
                { status: 400 }
            );
        }

        const { data: targetEmployee, error: targetError } =
            await supabaseAdmin
                .from("employees")
                .select("id, employee_code, full_name")
                .eq("id", employeeId)
                .maybeSingle();

        if (targetError) {
            console.error("Load target employee error:", targetError);

            return NextResponse.json(
                { ok: false, message: "ไม่สามารถตรวจสอบข้อมูลพนักงานได้" },
                { status: 500 }
            );
        }

        if (!targetEmployee) {
            return NextResponse.json(
                { ok: false, message: "ไม่พบข้อมูลพนักงานที่ต้องการลบ" },
                { status: 404 }
            );
        }

        const { error: managerDeleteError } = await supabaseAdmin
            .from("department_managers")
            .delete()
            .eq("manager_id", employeeId);

        if (managerDeleteError) {
            console.error(
                "Delete department manager mappings error:",
                managerDeleteError
            );

            return NextResponse.json(
                {
                    ok: false,
                    message: "ไม่สามารถลบข้อมูลแผนกที่หัวหน้ารับผิดชอบได้",
                },
                { status: 500 }
            );
        }

        const { error: deleteError } = await supabaseAdmin
            .from("employees")
            .delete()
            .eq("id", employeeId);

        if (deleteError) {
            console.error("Delete employee error:", deleteError);

            const message =
                deleteError.code === "23503"
                    ? "ลบไม่ได้ เพราะพนักงานคนนี้มีข้อมูลคำขอที่เชื่อมโยงอยู่ ให้เปลี่ยนเป็นปิดใช้งานแทน"
                    : deleteError.message;

            return NextResponse.json(
                { ok: false, message },
                { status: 409 }
            );
        }

        return NextResponse.json({
            ok: true,
            message: "ลบพนักงานสำเร็จ",
        });
    } catch (error: unknown) {
        console.error("Delete employee API error:", error);

        return NextResponse.json(
            {
                ok: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "เกิดข้อผิดพลาดระหว่างลบพนักงาน",
            },
            { status: 500 }
        );
    }
}