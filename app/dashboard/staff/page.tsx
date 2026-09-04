"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

type Service = {
  id: string;
  name: string;
  is_active: boolean;
};

type Staff = {
  id: string;
  name: string;
  title: string | null;
  photo_url: string | null;
  bio: string | null;
  is_active: boolean;
  sort_order: number;
};

type FormState = {
  name: string;
  title: string;
  photoUrl: string;
  bio: string;
  serviceIds: string[];
};

const emptyForm: FormState = {
  name: "",
  title: "",
  photoUrl: "",
  bio: "",
  serviceIds: [],
};

export default function StaffPage() {
  const router = useRouter();
  const supabase = createClient();

  const [studioId, setStudioId] = useState("");
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffServiceMap, setStaffServiceMap] = useState<
    Record<string, string[]>
  >({});

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: studio, error: studioError } = await supabase
        .from("studios")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (studioError) {
        setMessage(`讀取工作室失敗：${studioError.message}`);
        setLoading(false);
        return;
      }

      if (!studio) {
        router.replace("/onboarding");
        return;
      }

      setStudioId(studio.id);

      const { data: serviceData, error: serviceError } = await supabase
        .from("services")
        .select("id, name, is_active")
        .eq("studio_id", studio.id)
        .order("sort_order", { ascending: true });

      if (serviceError) {
        setMessage(`讀取服務失敗：${serviceError.message}`);
        setLoading(false);
        return;
      }

      setServices(serviceData || []);

      await loadStaff(studio.id);
      setLoading(false);
    }

    loadData();
  }, [router]);

  async function loadStaff(targetStudioId = studioId) {
    if (!targetStudioId) return;

    const { data: staffData, error: staffError } = await supabase
      .from("staff")
      .select(
        "id, name, title, photo_url, bio, is_active, sort_order"
      )
      .eq("studio_id", targetStudioId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (staffError) {
      setMessage(`讀取服務人員失敗：${staffError.message}`);
      return;
    }

    const list = staffData || [];
    setStaffList(list);

    if (list.length === 0) {
      setStaffServiceMap({});
      return;
    }

    const ids = list.map((item) => item.id);

    const { data: relationData, error: relationError } =
      await supabase
        .from("staff_services")
        .select("staff_id, service_id")
        .in("staff_id", ids);

    if (relationError) {
      setMessage(`讀取服務關聯失敗：${relationError.message}`);
      return;
    }

    const map: Record<string, string[]> = {};

    ids.forEach((id) => {
      map[id] = [];
    });

    (relationData || []).forEach(
      (item: { staff_id: string; service_id: string }) => {
        if (!map[item.staff_id]) {
          map[item.staff_id] = [];
        }

        map[item.staff_id].push(item.service_id);
      }
    );

    setStaffServiceMap(map);
  }

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function updateForm<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleService(serviceId: string) {
    setForm((current) => {
      const exists = current.serviceIds.includes(serviceId);

      return {
        ...current,
        serviceIds: exists
          ? current.serviceIds.filter((id) => id !== serviceId)
          : [...current.serviceIds, serviceId],
      };
    });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setSuccess(false);
  }

  function validateForm() {
    if (!form.name.trim()) {
      setMessage("請輸入服務人員姓名。");
      return false;
    }

    return true;
  }

  async function saveStaff() {
    setMessage("");
    setSuccess(false);

    if (!validateForm()) return;

    setSaving(true);

    let staffId = editingId;

    const payload = {
      studio_id: studioId,
      name: form.name.trim(),
      title: form.title.trim() || null,
      photo_url: form.photoUrl.trim() || null,
      bio: form.bio.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("staff")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        setMessage(`修改失敗：${error.message}`);
        setSaving(false);
        return;
      }
    } else {
      const nextSortOrder =
        staffList.length === 0
          ? 0
          : Math.max(
              ...staffList.map((item) => item.sort_order)
            ) + 1;

      const { data, error } = await supabase
        .from("staff")
        .insert({
          ...payload,
          sort_order: nextSortOrder,
          is_active: true,
        })
        .select("id")
        .single();

      if (error) {
        setMessage(`新增失敗：${error.message}`);
        setSaving(false);
        return;
      }

      staffId = data.id;
    }

    if (!staffId) {
      setMessage("服務人員建立失敗。");
      setSaving(false);
      return;
    }

    const { error: deleteRelationError } = await supabase
      .from("staff_services")
      .delete()
      .eq("staff_id", staffId);

    if (deleteRelationError) {
      setMessage(
        `更新可提供服務失敗：${deleteRelationError.message}`
      );
      setSaving(false);
      return;
    }

    if (form.serviceIds.length > 0) {
      const rows = form.serviceIds.map((serviceId) => ({
        staff_id: staffId,
        service_id: serviceId,
        studio_id: studioId,
      }));

      const { error: relationError } = await supabase
        .from("staff_services")
        .insert(rows);

      if (relationError) {
        setMessage(
          `更新可提供服務失敗：${relationError.message}`
        );
        setSaving(false);
        return;
      }
    }

    setSuccess(true);
    setMessage(
      editingId ? "服務人員已更新。" : "服務人員已新增。"
    );

    await loadStaff();
    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
  }

  function editStaff(person: Staff) {
    setEditingId(person.id);

    setForm({
      name: person.name,
      title: person.title || "",
      photoUrl: person.photo_url || "",
      bio: person.bio || "",
      serviceIds: staffServiceMap[person.id] || [],
    });

    setMessage("");
    setSuccess(false);

    scrollToSection("staff-form");
  }

  async function toggleActive(person: Staff) {
    setMessage("");
    setSuccess(false);

    const { error } = await supabase
      .from("staff")
      .update({
        is_active: !person.is_active,
      })
      .eq("id", person.id);

    if (error) {
      setMessage(`更新失敗：${error.message}`);
      return;
    }

    await loadStaff();
  }

  async function deleteStaff(person: Staff) {
    const confirmed = window.confirm(
      `確定要刪除「${person.name}」嗎？`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("staff")
      .delete()
      .eq("id", person.id);

    if (error) {
      setMessage(`刪除失敗：${error.message}`);
      return;
    }

    if (editingId === person.id) {
      resetForm();
    }

    await loadStaff();
  }

  async function moveStaff(
    index: number,
    direction: "up" | "down"
  ) {
    const targetIndex =
      direction === "up" ? index - 1 : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= staffList.length
    ) {
      return;
    }

    const current = staffList[index];
    const target = staffList[targetIndex];

    const { error: firstError } = await supabase
      .from("staff")
      .update({
        sort_order: target.sort_order,
      })
      .eq("id", current.id);

    if (firstError) {
      setMessage(`排序失敗：${firstError.message}`);
      return;
    }

    const { error: secondError } = await supabase
      .from("staff")
      .update({
        sort_order: current.sort_order,
      })
      .eq("id", target.id);

    if (secondError) {
      setMessage(`排序失敗：${secondError.message}`);
      return;
    }

    await loadStaff();
  }

  const activeServices = useMemo(
    () => services.filter((item) => item.is_active),
    [services]
  );

  function serviceNames(personId: string) {
    const ids = staffServiceMap[personId] || [];

    if (ids.length === 0) {
      return "尚未指定服務";
    }

    return ids
      .map(
        (id) =>
          services.find((service) => service.id === id)?.name
      )
      .filter(Boolean)
      .join("、");
  }

  if (loading) {
    return (
      <main style={loadingStyle}>
        LOADING...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F7F7F5",
        color: "#171717",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "#F7F7F5",
          borderBottom: "1px solid #DADAD5",
        }}
      >
        <div
          style={{
            minHeight: "76px",
            padding: "0 54px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={eyebrow}>
              STAFF
            </div>

            <div
              style={{
                fontSize: "18px",
              }}
            >
              服務人員
            </div>
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "#888",
            }}
          >
            {staffList.length} 位服務人員
          </div>
        </div>

        <div
          style={{
            padding: "0 54px",
            height: "52px",
            display: "flex",
            alignItems: "center",
            gap: "30px",
            borderTop: "1px solid #E4E4E0",
          }}
        >
          <button
            type="button"
            onClick={() =>
              scrollToSection("staff-form")
            }
            style={sectionNavButton}
          >
            新增服務人員
          </button>

          <button
            type="button"
            onClick={() =>
              scrollToSection("staff-services")
            }
            style={sectionNavButton}
          >
            可提供服務
          </button>

          <button
            type="button"
            onClick={() =>
              scrollToSection("staff-list")
            }
            style={sectionNavButton}
          >
            目前人員
          </button>
        </div>
      </div>

      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "64px 54px 110px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px minmax(0, 1fr)",
            gap: "70px",
          }}
        >
          <aside>
            <div style={eyebrow}>
              STAFF MANAGEMENT
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "42px",
                fontWeight: 500,
                lineHeight: 1.08,
                letterSpacing: "-0.04em",
              }}
            >
              服務人員
            </h1>

            <p
              style={{
                marginTop: "18px",
                color: "#777",
                fontSize: "14px",
                lineHeight: 1.8,
              }}
            >
              每位服務人員可以有自己的職稱與可提供服務。
            </p>
          </aside>

          <section>
            <div
              id="staff-form"
              style={{
                scrollMarginTop: "160px",
                borderTop: "1px solid #CACAC5",
                paddingTop: "30px",
              }}
            >
              <div style={eyebrow}>
                {editingId ? "EDIT STAFF" : "ADD STAFF"}
              </div>

              <h2 style={sectionTitle}>
                {editingId
                  ? "編輯服務人員"
                  : "新增服務人員"}
              </h2>

              <div style={formGrid}>
                <div>
                  <label style={labelStyle}>
                    姓名
                  </label>

                  <input
                    value={form.name}
                    onChange={(e) =>
                      updateForm("name", e.target.value)
                    }
                    placeholder="例如：Amy"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    職稱
                  </label>

                  <input
                    value={form.title}
                    onChange={(e) =>
                      updateForm("title", e.target.value)
                    }
                    placeholder="例如：美甲師 / 美睫師"
                    style={inputStyle}
                  />
                </div>

                <div
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >
                  <label style={labelStyle}>
                    照片網址
                  </label>

                  <input
                    value={form.photoUrl}
                    onChange={(e) =>
                      updateForm(
                        "photoUrl",
                        e.target.value
                      )
                    }
                    placeholder="https://..."
                    style={inputStyle}
                  />
                </div>

                <div
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >
                  <label style={labelStyle}>
                    簡介
                  </label>

                  <textarea
                    rows={4}
                    value={form.bio}
                    onChange={(e) =>
                      updateForm("bio", e.target.value)
                    }
                    placeholder="可填寫擅長風格、資歷、服務特色等"
                    style={textareaStyle}
                  />
                </div>
              </div>
            </div>

            <div
              id="staff-services"
              style={{
                scrollMarginTop: "160px",
                marginTop: "80px",
                borderTop: "1px solid #CACAC5",
                paddingTop: "30px",
              }}
            >
              <div style={eyebrow}>
                SERVICES
              </div>

              <h2 style={sectionTitle}>
                可提供服務
              </h2>

              <p
                style={{
                  marginTop: "12px",
                  color: "#888",
                  fontSize: "14px",
                  lineHeight: 1.7,
                }}
              >
                顧客選擇服務後，只會看到有提供該服務的人員。
              </p>

              {activeServices.length === 0 ? (
                <div
                  style={{
                    marginTop: "28px",
                    padding: "28px 0",
                    borderTop: "1px solid #D4D4CF",
                    borderBottom: "1px solid #D4D4CF",
                    color: "#888",
                    fontSize: "14px",
                  }}
                >
                  目前還沒有已上架服務，請先到服務管理建立服務。
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "28px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1px",
                    border: "1px solid #DADAD5",
                    background: "#DADAD5",
                  }}
                >
                  {activeServices.map((service) => {
                    const selected =
                      form.serviceIds.includes(service.id);

                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() =>
                          toggleService(service.id)
                        }
                        style={{
                          border: "none",
                          padding: "18px 20px",
                          background: selected
                            ? "#171717"
                            : "#F7F7F5",
                          color: selected
                            ? "#FFF"
                            : "#171717",
                          textAlign: "left",
                          fontSize: "14px",
                          cursor: "pointer",
                        }}
                      >
                        {selected ? "✓ " : ""}
                        {service.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {message && (
                <div
                  style={{
                    marginTop: "34px",
                    paddingTop: "16px",
                    borderTop: "1px solid #D0D0CB",
                    color: success
                      ? "#3D6C4D"
                      : "#9A3D37",
                    fontSize: "14px",
                  }}
                >
                  {message}
                </div>
              )}

              <div
                style={{
                  marginTop: "40px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "14px",
                }}
              >
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    style={secondaryButton}
                  >
                    CANCEL
                  </button>
                )}

                <button
                  type="button"
                  onClick={saveStaff}
                  disabled={saving}
                  style={{
                    ...primaryButton,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving
                    ? "SAVING..."
                    : editingId
                    ? "SAVE CHANGES"
                    : "ADD STAFF"}
                </button>
              </div>
            </div>

            <div
              id="staff-list"
              style={{
                scrollMarginTop: "160px",
                marginTop: "90px",
                borderTop: "1px solid #CACAC5",
                paddingTop: "30px",
              }}
            >
              <div style={eyebrow}>
                CURRENT STAFF
              </div>

              <h2 style={sectionTitle}>
                目前人員
              </h2>

              {staffList.length === 0 ? (
                <div
                  style={{
                    marginTop: "28px",
                    padding: "38px 0",
                    borderTop: "1px solid #D3D3CE",
                    borderBottom: "1px solid #D3D3CE",
                    color: "#888",
                    fontSize: "14px",
                  }}
                >
                  還沒有服務人員。
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "28px",
                    borderTop: "1px solid #CFCFCA",
                  }}
                >
                  {staffList.map((person, index) => (
                    <div
                      key={person.id}
                      style={{
                        padding: "25px 0",
                        borderBottom: "1px solid #D9D9D4",
                        display: "grid",
                        gridTemplateColumns:
                          "46px minmax(240px, 1fr) 150px 240px",
                        gap: "18px",
                        alignItems: "center",
                        opacity: person.is_active
                          ? 1
                          : 0.45,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#999",
                        }}
                      >
                        {String(index + 1).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: "16px",
                          }}
                        >
                          {person.name}
                        </div>

                        <div
                          style={{
                            marginTop: "7px",
                            fontSize: "12px",
                            color: "#888",
                          }}
                        >
                          {person.title || "未設定職稱"}
                        </div>

                        <div
                          style={{
                            marginTop: "7px",
                            fontSize: "12px",
                            color: "#999",
                            lineHeight: 1.6,
                          }}
                        >
                          {serviceNames(person.id)}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: "11px",
                          letterSpacing: "0.08em",
                          color: person.is_active
                            ? "#477255"
                            : "#999",
                        }}
                      >
                        {person.is_active
                          ? "ACTIVE"
                          : "HIDDEN"}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: "13px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() =>
                            moveStaff(index, "up")
                          }
                          style={{
                            ...smallButton,
                            opacity:
                              index === 0 ? 0.3 : 1,
                          }}
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          disabled={
                            index ===
                            staffList.length - 1
                          }
                          onClick={() =>
                            moveStaff(index, "down")
                          }
                          style={{
                            ...smallButton,
                            opacity:
                              index ===
                              staffList.length - 1
                                ? 0.3
                                : 1,
                          }}
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            editStaff(person)
                          }
                          style={smallButton}
                        >
                          EDIT
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleActive(person)
                          }
                          style={smallButton}
                        >
                          {person.is_active
                            ? "HIDE"
                            : "SHOW"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteStaff(person)
                          }
                          style={{
                            ...smallButton,
                            color: "#9A3D37",
                          }}
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

const loadingStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#F7F7F5",
};

const eyebrow: React.CSSProperties = {
  fontSize: "11px",
  color: "#888",
  letterSpacing: "0.16em",
  marginBottom: "12px",
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: "28px",
  fontWeight: 500,
  letterSpacing: "-0.03em",
};

const formGrid: React.CSSProperties = {
  marginTop: "34px",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "30px 28px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "10px",
  fontSize: "11px",
  letterSpacing: "0.12em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 0",
  border: "none",
  borderBottom: "1px solid #AAA",
  background: "transparent",
  outline: "none",
  fontSize: "16px",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #C7C7C2",
  background: "transparent",
  padding: "15px",
  resize: "vertical",
  fontSize: "14px",
  lineHeight: 1.7,
};

const primaryButton: React.CSSProperties = {
  border: "none",
  background: "#171717",
  color: "#FFF",
  padding: "15px 26px",
  fontSize: "11px",
  letterSpacing: "0.1em",
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  border: "1px solid #BEBEB9",
  background: "transparent",
  padding: "15px 26px",
  fontSize: "11px",
  cursor: "pointer",
};

const smallButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  fontSize: "10px",
  letterSpacing: "0.08em",
  cursor: "pointer",
};

const sectionNavButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  padding: 0,
  color: "#555",
  fontSize: "13px",
  cursor: "pointer",
};
