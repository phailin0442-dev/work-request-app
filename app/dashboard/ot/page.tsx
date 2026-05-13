"use client";

import Link from "next/link";
import { useState } from "react";

export default function OTPage() {
  const [otType, setOtType] = useState("");
  const [otDate, setOtDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/ot-request", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ot_type: otType,
          ot_date: otDate,
          start_time: startTime,
          end_time: endTime,
          reason,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMessage(data.message || "บันทึกไม่สำเร็จ");
        return;
      }

      setMessage("ส่งคำขอ OT สำเร็จแล้ว");

      setOtType("");
      setOtDate("");
      setStartTime("");
      setEndTime("");
      setReason("");
    } catch (error: any) {
      setMessage(error?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-100 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 to-rose-600 p-8 text-white shadow-2xl">
          <h1 className="text-3xl font-bold">แบบฟอร์มขอ OT</h1>

          <p className="mt-2 text-red-100">
            ยื่นคำขอทำงานล่วงเวลาและวันหยุด
          </p>
        </div>

        <div className="rounded-3xl border border-white/50 bg-white/90 p-8 shadow-xl backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-700">
                ประเภท OT
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setOtType("ทำงานล่วงเวลา")}
                  className={`rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${
                    otType === "ทำงานล่วงเวลา"
                      ? "border-red-600 bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg"
                      : "border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50"
                  }`}
                >
                  <div className="text-lg font-bold">
                    ทำงานล่วงเวลา
                  </div>

                  <div className="mt-1 text-sm opacity-80">
                    OT หลังเวลางานหรือก่อนเวลางาน
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setOtType("ทำงานในวันหยุด")}
                  className={`rounded-2xl border px-5 py-4 text-left transition-all duration-200 ${
                    otType === "ทำงานในวันหยุด"
                      ? "border-red-600 bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg"
                      : "border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50"
                  }`}
                >
                  <div className="text-lg font-bold">
                    ทำงานในวันหยุด
                  </div>

                  <div className="mt-1 text-sm opacity-80">
                    ทำงานในวันหยุดประจำสัปดาห์หรือวันนักขัตฤกษ์
                  </div>
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                วันที่ OT
              </label>

              <input
                type="date"
                value={otDate}
                onChange={(e) => setOtDate(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  เวลาเริ่ม
                </label>

                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-5">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  เวลาสิ้นสุด
                </label>

                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                เหตุผล
              </label>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                placeholder="กรอกรายละเอียดเหตุผลการขอ OT..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
              />
            </div>

            {message && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {message}
              </div>
            )}

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3 font-semibold text-white shadow-lg shadow-red-200 transition-all duration-200 hover:scale-[1.02] hover:from-red-700 hover:to-rose-700 disabled:opacity-50"
              >
                {loading ? "กำลังบันทึก..." : "ส่งคำขอ OT"}
              </button>

              <Link
                href="/dashboard"
                className="rounded-2xl border border-red-200 bg-white px-6 py-3 font-semibold text-red-600 shadow-sm transition-all duration-200 hover:bg-red-50"
              >
                กลับ Dashboard
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}