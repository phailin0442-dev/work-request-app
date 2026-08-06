"use client";

import Link from "next/link";
import { useState } from "react";

const DEPARTMENTS = [
  "Picker",
  "Picker2",
  "Loader",
  "Frozen",
  "F&V",
  "Tele-Sales",
  "HR",
];

export default function ExportPage() {
  const [type, setType] = useState("all");
  const [department, setDepartment] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  async function handleExport() {
    setMessage("");
    setMessageType("");

    if (startDate && endDate && startDate > endDate) {
      setMessage(
        "วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด"
      );
      setMessageType("error");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "/api/export-requests",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type,
            department,
            startDate,
            endDate,
          }),
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      if (!response.ok) {
        let errorMessage =
          "ไม่สามารถรับชุดงานและดาวน์โหลดไฟล์ได้";

        if (
          contentType.includes("application/json")
        ) {
          const result = await response.json();

          errorMessage =
            result?.message || errorMessage;
        }

        setMessage(errorMessage);
        setMessageType("error");
        return;
      }

      const blob = await response.blob();

      const disposition =
        response.headers.get(
          "content-disposition"
        ) || "";

      const utf8Match = disposition.match(
        /filename\*=UTF-8''([^;]+)/
      );

      const normalMatch = disposition.match(
        /filename="?([^"]+)"?/
      );

      let fileName = "report.xlsx";

      if (utf8Match?.[1]) {
        fileName = decodeURIComponent(
          utf8Match[1]
        );
      } else if (normalMatch?.[1]) {
        fileName = normalMatch[1];
      }

      const downloadUrl =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = downloadUrl;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(downloadUrl);

      const batchNo =
        response.headers.get("X-Batch-No");

      const exportedItems =
        response.headers.get(
          "X-Exported-Items"
        );

      const skippedItems =
        response.headers.get(
          "X-Skipped-Items"
        );

      let successMessage =
        `รับชุดงาน ${batchNo || ""
        } เรียบร้อย จำนวน ${exportedItems || "0"
        } รายการ`;

      if (Number(skippedItems || 0) > 0) {
        successMessage +=
          ` และข้าม ${skippedItems} รายการ` +
          " ที่ HR คนอื่นรับไปแล้ว";
      }

      setMessage(successMessage);
      setMessageType("success");
    } catch (error) {
      console.error("Export error:", error);

      setMessage(
        "เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ"
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  function handleClearFilters() {
    if (loading) return;

    setType("all");
    setDepartment("all");
    setStartDate("");
    setEndDate("");
    setMessage("");
    setMessageType("");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-100 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-red-700 via-red-600 to-rose-600 p-6 text-white shadow-2xl sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black tracking-[0.2em] text-red-100">
                EXPORT CENTER
              </p>

              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Export Report
              </h1>

              <p className="mt-2 text-red-100">
                เลือกประเภทรายการ แผนก
                และช่วงวันที่
                เพื่อรับชุดงานและดาวน์โหลด Excel
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

        <section className="grid gap-5 md:grid-cols-3">
          <InfoCard
            title="เลือกรายการ"
            value="OT / ลา / เปลี่ยนกะ"
            icon="📋"
          />

          <InfoCard
            title="เลือกแผนก"
            value="ส่งออกแยกตามแผนก"
            icon="🏢"
          />

          <InfoCard
            title="ดาวน์โหลดไฟล์"
            value="Excel .xlsx"
            icon="📤"
          />
        </section>

        <section className="overflow-hidden rounded-3xl border border-red-100 bg-white/95 shadow-xl">
          <div className="border-b border-red-100 bg-red-50 px-6 py-5">
            <h2 className="text-2xl font-black text-slate-900">
              ตั้งค่าการ Export
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              เมื่อกดรับงาน
              ระบบจะล็อกรายการให้ HR
              ที่กำลังใช้งานอยู่
            </p>
          </div>

          <div className="space-y-6 p-6">
            {message && (
              <div
                className={`rounded-2xl border px-5 py-4 text-sm font-bold ${messageType === "success"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                  }`}
              >
                {message}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-red-100 bg-white p-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  ประเภทรายการ
                </label>

                <select
                  value={type}
                  disabled={loading}
                  onChange={(event) =>
                    setType(event.target.value)
                  }
                  className="w-full rounded-2xl border border-red-100 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="all">
                    ทั้งหมด
                  </option>

                  <option value="ot">OT</option>

                  <option value="shift">
                    เปลี่ยนกะ
                  </option>

                  <option value="dayoff">
                    เปลี่ยนวันหยุด
                  </option>

                  <option value="leave">
                    ขอลา
                  </option>
                </select>
              </div>

              <div className="rounded-3xl border border-red-100 bg-white p-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  แผนก
                </label>

                <select
                  value={department}
                  disabled={loading}
                  onChange={(event) =>
                    setDepartment(
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-red-100 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="all">
                    ทุกแผนก
                  </option>

                  {DEPARTMENTS.map(
                    (departmentItem) => (
                      <option
                        key={departmentItem}
                        value={departmentItem}
                      >
                        {departmentItem}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-3xl border border-red-100 bg-white p-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  วันที่เริ่มต้น
                </label>

                <input
                  type="date"
                  value={startDate}
                  disabled={loading}
                  max={endDate || undefined}
                  onChange={(event) =>
                    setStartDate(
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-red-100 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>

              <div className="rounded-3xl border border-red-100 bg-white p-5">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  วันที่สิ้นสุด
                </label>

                <input
                  type="date"
                  value={endDate}
                  disabled={loading}
                  min={startDate || undefined}
                  onChange={(event) =>
                    setEndDate(event.target.value)
                  }
                  className="w-full rounded-2xl border border-red-100 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-bold text-amber-800">
                ระบบป้องกัน HR ทำงานซ้ำกัน
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                เมื่อ HR กดรับงาน
                ระบบจะบันทึกชุดงานและล็อกรายการ
                รายการที่ HR คนอื่นรับไปแล้ว
                จะไม่ถูกนำมาสร้างไฟล์ซ้ำ
              </p>
            </div>

            <div className="rounded-3xl bg-red-50 p-5">
              <p className="text-sm font-bold text-red-700">
                ไฟล์ที่ได้เป็น Excel
                นามสกุล .xlsx
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                หากไม่เลือกวันที่
                ระบบจะส่งออกรายการทั้งหมด
                ตามประเภทและแผนกที่เลือก
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={handleExport}
                disabled={loading}
                className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3 font-bold text-white shadow-lg shadow-red-200 transition hover:scale-[1.02] hover:from-red-700 hover:to-rose-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {loading
                  ? "กำลังรับชุดงาน..."
                  : "📤 รับงานและดาวน์โหลด Excel"}
              </button>

              <button
                type="button"
                onClick={handleClearFilters}
                disabled={loading}
                className="rounded-2xl border border-red-200 bg-white px-6 py-3 font-bold text-red-700 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="rounded-3xl border border-red-100 bg-white/90 p-5 shadow-xl">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-2xl">
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-lg font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}