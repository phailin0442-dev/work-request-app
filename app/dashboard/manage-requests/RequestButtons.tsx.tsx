"use client";

import { useRouter } from "next/navigation";

export default function ApproveButtons({
  requestId,
  table,
}: {
  requestId: string;
  table: string;
}) {
  const router = useRouter();

  async function updateStatus(
    status: string
  ) {
    await fetch("/api/update-request-status", {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        request_id: requestId,
        table,
        status,
      }),
    });

    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() =>
          updateStatus("approved")
        }
        className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white"
      >
        อนุมัติ
      </button>

      <button
        onClick={() =>
          updateStatus("rejected")
        }
        className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white"
      >
        ไม่อนุมัติ
      </button>
    </div>
  );
}