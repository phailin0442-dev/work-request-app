import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import LogoutButton from "./logout-button";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const employeeId = cookieStore.get("employee_session")?.value;

  if (!employeeId) redirect("/login");

  const { data: employee, error } = await supabaseAdmin
    .from("employees")
    .select("id, employee_code, full_name, position, role, active")
    .eq("id", employeeId)
    .eq("active", true)
    .maybeSingle();

  if (error || !employee) redirect("/login");

  const role = String(employee.role || "").trim().toLowerCase();

  const canRequest = role === "employee";

  const canManage = [
    "section_manager",
    "general_manager",
    "hr",
  ].includes(role);

  const isHR = role === "hr";

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <section style={styles.hero}>
          <div>
            <div style={styles.systemName}>HR APPROVAL WORKFLOW SYSTEM</div>
            <h1 style={styles.heroTitle}>สวัสดี, {employee.full_name}</h1>
            <p style={styles.heroText}>
              {employee.position || "-"} · {employee.employee_code}
            </p>
          </div>

          <div style={styles.heroRight}>
            <span style={styles.roleBadge}>ROLE : {role}</span>
            <LogoutButton />
          </div>
        </section>

        <section style={styles.infoGrid}>
          <InfoCard title="ชื่อ" value={employee.full_name} icon="👤" />
          <InfoCard title="รหัสพนักงาน" value={employee.employee_code} icon="🪪" />
          <InfoCard title="ตำแหน่ง" value={employee.position || "-"} icon="💼" />
        </section>

        {canRequest && (
          <section style={styles.section}>
            <SectionTitle
              title="เมนูพนักงาน"
              subtitle="เลือกประเภทคำขอที่ต้องการยื่น"
            />

            <div style={styles.menuGrid}>
              <MenuCard href="/dashboard/ot" title="ยื่น OT" desc="ขอ OT ล่วงเวลา / วันหยุด" icon="⏱️" />
              <MenuCard href="/dashboard/shift-change" title="ขอเปลี่ยนกะ" desc="ยื่นคำขอเปลี่ยนกะการทำงาน" icon="🔁" />
              <MenuCard href="/dashboard/day-off" title="ขอเปลี่ยนวันหยุด" desc="ยื่นคำขอเปลี่ยนวันหยุด" icon="📅" />
              <MenuCard href="/dashboard/leave" title="ขอลา" desc="ยื่นคำขอลาหยุดงาน" icon="📝" />
              <MenuCard href="/dashboard/my-requests" title="รายการคำขอของฉัน" desc="ดูสถานะคำขอทั้งหมด" icon="📋" />
            </div>
          </section>
        )}

        {canManage && (
          <section style={styles.section}>
            <SectionTitle
              title="เมนูผู้จัดการ"
              subtitle="จัดการและอนุมัติคำขอ"
            />

            <div style={styles.fullGrid}>
              <MenuCard
                href="/dashboard/manage-requests"
                title="จัดการคำขอ"
                desc="อนุมัติ / ไม่อนุมัติ / แก้ไขคำขอ"
                icon="✅"
                fullWidth
              />
            </div>
          </section>
        )}

        {isHR && (
          <section style={styles.section}>
            <SectionTitle
              title="เมนู HR"
              subtitle="จัดการข้อมูลระบบและรายงาน"
            />

            <div style={styles.menuGrid}>
              <MenuCard
                href="/dashboard/employees"
                title="จัดการข้อมูลพนักงาน"
                desc="เพิ่ม / แก้ไข / ปิดใช้งานพนักงาน"
                icon="👥"
              />

              <MenuCard
                href="/dashboard/export"
                title="Export Excel"
                desc="เลือกประเภทรายการและช่วงวันที่"
                icon="📤"
              />
            </div>
          </section>
        )}
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
    <div style={styles.infoCard}>
      <div style={styles.infoIcon}>{icon}</div>
      <div>
        <p style={styles.infoTitle}>{title}</p>
        <p style={styles.infoValue}>{value}</p>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <p style={styles.sectionSubtitle}>{subtitle}</p>
    </div>
  );
}

function MenuCard({
  href,
  title,
  desc,
  icon,
  fullWidth = false,
}: {
  href: string;
  title: string;
  desc: string;
  icon: string;
  fullWidth?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        ...styles.menuCard,
        minHeight: fullWidth ? 240 : 190,
      }}
    >
      <div>
        <div style={styles.menuIcon}>{icon}</div>
        <h3 style={styles.menuTitle}>{title}</h3>
        <p style={styles.menuDesc}>{desc}</p>
      </div>

      <div style={styles.menuLink}>เข้าใช้งาน →</div>
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #fff5f5 0%, #ffffff 45%, #ffe4e6 100%)",
    padding: "24px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  container: {
    maxWidth: "1280px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
  },

  hero: {
    background: "linear-gradient(135deg, #b91c1c, #dc2626)",
    borderRadius: "28px",
    padding: "32px",
    color: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    boxShadow: "0 18px 40px rgba(185, 28, 28, 0.28)",
  },

  systemName: {
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#fee2e2",
  },

  heroTitle: {
    marginTop: "10px",
    fontSize: "34px",
    fontWeight: 800,
  },

  heroText: {
    marginTop: "8px",
    color: "#fee2e2",
    fontSize: "16px",
  },

  heroRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "12px",
  },

  roleBadge: {
    background: "white",
    color: "#b91c1c",
    padding: "10px 16px",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: 800,
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
  },

  infoCard: {
    background: "white",
    borderRadius: "22px",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.08)",
    border: "1px solid #fee2e2",
  },

  infoIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "18px",
    background: "#fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
  },

  infoTitle: {
    color: "#64748b",
    fontSize: "14px",
    fontWeight: 600,
  },

  infoValue: {
    marginTop: "8px",
    color: "#0f172a",
    fontSize: "22px",
    fontWeight: 800,
  },

  section: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  sectionTitle: {
    fontSize: "28px",
    fontWeight: 900,
    color: "#0f172a",
  },

  sectionSubtitle: {
    marginTop: "4px",
    color: "#64748b",
    fontSize: "15px",
  },

  menuGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
  },

  fullGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "20px",
  },

  menuCard: {
    background: "white",
    borderRadius: "28px",
    padding: "28px",
    textDecoration: "none",
    color: "inherit",
    border: "1px solid #fecaca",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },

  menuIcon: {
    width: "70px",
    height: "70px",
    borderRadius: "22px",
    background: "#fee2e2",
    color: "#b91c1c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "36px",
    marginBottom: "22px",
  },

  menuTitle: {
    fontSize: "26px",
    fontWeight: 900,
    color: "#0f172a",
  },

  menuDesc: {
    marginTop: "10px",
    color: "#64748b",
    fontSize: "16px",
    lineHeight: 1.7,
  },

  menuLink: {
    marginTop: "24px",
    color: "#dc2626",
    fontSize: "16px",
    fontWeight: 800,
  },
};