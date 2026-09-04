"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

const NAV_ITEMS = [
  {
    label: "總覽",
    path: "/dashboard",
  },
  {
    label: "預約管理",
    path: "/dashboard/bookings",
  },
  {
    label: "服務管理",
    path: "/dashboard/services",
  },
  {
    label: "服務人員",
    path: "/dashboard/staff",
  },
  {
    label: "營業 / 班表",
    path: "/dashboard/schedule",
  },
  {
    label: "客戶管理",
    path: "/dashboard/customers",
  },
  {
    label: "訂金設定",
    path: "/dashboard/deposit",
  },
  {
    label: "工作室設定",
    path: "/dashboard/studio",
  },
  {
    label: "方案管理",
    path: "/dashboard/plan",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(path: string) {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(path);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        background: "#F7F7F5",
        color: "#171717",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <aside
        style={{
          minHeight: "100vh",
          borderRight: "1px solid #DADAD5",
          padding: "34px 26px",
          position: "sticky",
          top: 0,
          alignSelf: "start",
          height: "100vh",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            letterSpacing: "0.18em",
            marginBottom: "46px",
          }}
        >
          BEAUTY BOOKING
        </div>

        <div
          style={{
            fontSize: "10px",
            color: "#999",
            letterSpacing: "0.14em",
            marginBottom: "18px",
          }}
        >
          STUDIO
        </div>

        <nav>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => router.push(item.path)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 0",
                  border: "none",
                  borderBottom: "1px solid #E1E1DD",
                  background: "transparent",
                  color: active ? "#171717" : "#8A8A85",
                  fontSize: "14px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span>{item.label}</span>

                {active && (
                  <span
                    style={{
                      fontSize: "14px",
                    }}
                  >
                    →
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <div
        style={{
          minWidth: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
