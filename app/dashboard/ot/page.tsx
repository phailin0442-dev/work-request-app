"use client";

import Link from "next/link";
import { useState } from "react";

export default function OTPage() {
  const [otDate, setOtDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(
        "/api/ot-request",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ot_date: otDate,
            start_time: startTime,
            end_time: endTime,
            reason,
          }),
        }
      );

      const data = await res.json();

      if (!data.ok) {
        setMessage(
          data.message ||
            "บันทึกไม่สำเร็จ"
        );

        return;
      }

      setMessage("ยื่น OT สำเร็จแล้ว");

      setOtDate("");
      setStartTime("");
      setEndTime("");
      setReason("");
    } catch {
      setMessage("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow">

        <h1 className="text-2xl font-bold">
          ยื่น OT
        </h1>

        <p className="mt-2 text-slate-600">
          กรอกข้อมูลคำขอ OT
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
        >

          <div className="space-y-1">
            <label className="text-sm font-medium">
              วันที่ OT
            </label>

            <input
              type="text"
              value={otDate}
              onChange={(e) =>
                setOtDate(e.target.value)
              }
              placeholder="เช่น 2025-05-07"
              className="w-full rounded-lg border px-3 py-2"
            />

            <p className="text-xs text-slate-500">
              รูปแบบ: YYYY-MM-DD
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">

            <div className="space-y-1">
              <label className="text-sm font-medium">
                เวลาเริ่ม
              </label>

              <input
                type="text"
                value={startTime}
                onChange={(e) =>
                  setStartTime(
                    e.target.value
                  )
                }
                placeholder="เช่น 18:00"
                className="w-full rounded-lg border px-3 py-2"
              />

              <p className="text-xs text-slate-500">
                รูปแบบ: HH:mm
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">
                เวลาสิ้นสุด
              </label>

              <input
                type="text"
                value={endTime}
                onChange={(e) =>
                  setEndTime(
                    e.target.value
                  )
                }
                placeholder="เช่น 22:00"
                className="w-full rounded-lg border px-3 py-2"
              />

              <p className="text-xs text-slate-500">
                รูปแบบ: HH:mm
              </p>
            </div>

          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              เหตุผล
            </label>

            <textarea
              value={reason}
              onChange={(e) =>
                setReason(e.target.value)
              }
              rows={4}
              placeholder="กรอกเหตุผลการทำ OT"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          {message && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
              {message}
            </div>
          )}

          <div className="flex gap-3">

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {loading
                ? "กำลังบันทึก..."
                : "ส่งคำขอ OT"}
            </button>

            <Link
              href="/dashboard"
              className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
            >
              กลับ Dashboard
            </Link>

          </div>
        </form>
      </div>
    </main>
  );
}