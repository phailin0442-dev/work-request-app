"use client";

import Link from "next/link";
import { useState } from "react";

const leaveTypes = [
  "ลากิจได้รับค่าจ้าง",
  "ลากิจไม่ได้รับค่าจ้าง",
  "การขอใช้สิทธิ์วันหยุด CDO",
  "ลาคลอดบุตร",
  "ลางานศพ",
  "ลาดูแลคู่สมรส",
  "ลาต่อเนื่องดูแลบุตร",
  "ลาป่วย",
  "ลาพักร้อน",
  "ลารับราชการทหาร",
  "ลาเพื่อทำหมัน",
  "ลาเพื่อฝึกอบรม",
  "ลาเพื่ออุปสมบท",
];

export default function LeavePage() {
  const [leaveType, setLeaveType] = useState("");
  const [leaveDay, setLeaveDay] = useState("");
  const [leaveToDay, setLeaveToDay] = useState("");
  const [leaveTotalDays, setLeaveTotalDays] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!leaveType) {
      setMessage("กรุณาเลือกประเภทการลา");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/leave-form-request", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leave_type: leaveType,
          leave_day: leaveDay,
          leave_to_day: leaveToDay,
          leave_total_days: leaveTotalDays,
          leave_reason: leaveReason,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMessage(data.message || "บันทึกไม่สำเร็จ");
        return;
      }

      setMessage("ส่งคำขอลาสำเร็จแล้ว");
      setLeaveType("");
      setLeaveDay("");
      setLeaveToDay("");
      setLeaveTotalDays("");
      setLeaveReason("");
    } catch (error: any) {
      setMessage(error?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-100 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-red-700 via-red-600 to-rose-600 p-8 text-white shadow-2xl">
          <h1 className="text-4xl font-black">แบบฟอร์มขอลา</h1>
          <p className="mt-2 text-red-100">
            เลือกประเภทการลา กรอกวันที่ และเหตุผลให้ครบถ้วน
          </p>
        </section>

        <section className="rounded-3xl border border-red-100 bg-white/95 p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                ประเภทการลา
              </label>

              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full rounded-2xl border border-red-100 bg-white px-4 py-3 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
              >
                <option value="">-- เลือกประเภทการลา --</option>

                {leaveTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  ลาตั้งแต่วันที่
                </label>

                <input
                  type="date"
                  value={leaveDay}
                  onChange={(e) => setLeaveDay(e.target.value)}
                  className="w-full rounded-2xl border border-red-100 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  ลาถึงวันที่
                </label>

                <input
                  type="date"
                  value={leaveToDay}
                  onChange={(e) => setLeaveToDay(e.target.value)}
                  className="w-full rounded-2xl border border-red-100 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                จำนวนวันลา
              </label>

              <input
                value={leaveTotalDays}
                onChange={(e) => setLeaveTotalDays(e.target.value)}
                placeholder="เช่น 1 / 2 / 3"
                className="w-full rounded-2xl border border-red-100 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                เหตุผล
              </label>

              <textarea
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                rows={5}
                placeholder="กรอกเหตุผลการลา..."
                className="w-full rounded-2xl border border-red-100 px-4 py-3 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
              />
            </div>

            {message && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                {message}
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-3 font-bold text-white shadow-lg shadow-red-200 transition hover:scale-[1.02] hover:from-red-700 hover:to-rose-700 disabled:opacity-50"
              >
                {loading ? "กำลังบันทึก..." : "ส่งคำขอลา"}
              </button>

              <Link
                href="/dashboard"
                className="rounded-2xl border border-red-200 bg-white px-6 py-3 font-bold text-red-700 shadow-sm transition hover:bg-red-50"
              >
                กลับ Dashboard
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}