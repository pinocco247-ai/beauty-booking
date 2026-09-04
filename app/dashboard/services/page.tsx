"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

type Category = {
  id: string;
  name: string;
  is_active: boolean;
};

type Service = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_type: "fixed" | "from" | "free" | "quote";
  price: number | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  deposit_mode:
    | "studio_default"
    | "none"
    | "custom_fixed"
    | "custom_percent";
  deposit_value: number | null;
  is_active: boolean;
  sort_order: number;
};

type FormState = {
  name: string;
  categoryId: string;
  description: string;
  priceType: "fixed" | "from" | "free" | "quote";
  price: string;
  durationMinutes: string;
  bufferBeforeMinutes: string;
  bufferAfterMinutes: string;
  depositMode:
    | "studio_default"
    | "none"
    | "custom_fixed"
    | "custom_percent";
  depositValue: string;
};

const emptyForm: FormState = {
  name: "",
  categoryId: "",
  description: "",
  priceType: "fixed",
  price: "",
  durationMinutes: "60",
  bufferBeforeMinutes: "0",
  bufferAfterMinutes: "0",
  depositMode: "studio_default",
  depositValue: "",
};

export default function ServicesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [studioId, setStudioId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState("all");

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

      const { data: categoryData, error: categoryError } =
        await supabase
          .from("service_categories")
          .select("id, name, is_active")
          .eq("studio_id", studio.id)
          .order("sort_order", { ascending: true });

      if (categoryError) {
        setMessage(`讀取分類失敗：${categoryError.message}`);
        setLoading(false);
        return;
      }

      setCategories(categoryData || []);

      const { data: serviceData, error: serviceError } =
        await supabase
          .from("services")
          .select(
            "id, category_id, name, description, price_type, price, duration_minutes, buffer_before_minutes, buffer_after_minutes, deposit_mode, deposit_value, is_active, sort_order"
          )
          .eq("studio_id", studio.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

      if (serviceError) {
        setMessage(`讀取服務失敗：${serviceError.message}`);
        setLoading(false);
        return;
      }

      setServices(serviceData || []);
      setLoading(false);
    }

    loadData();
  }, [router]);

  async function reloadServices() {
    if (!studioId) return;

    const { data, error } = await supabase
      .from("services")
      .select(
        "id, category_id, name, description, price_type, price, duration_minutes, buffer_before_minutes, buffer_after_minutes, deposit_mode, deposit_value, is_active, sort_order"
      )
      .eq("studio_id", studioId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(`更新失敗：${error.message}`);
      return;
    }

    setServices(data || []);
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

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setSuccess(false);
  }

  function validateForm() {
    if (!form.name.trim()) {
      setMessage("請輸入服務名稱。");
      return false;
    }

    const duration = Number(form.durationMinutes);

    if (!Number.isFinite(duration) || duration <= 0) {
      setMessage("請輸入正確的服務時間。");
      return false;
    }

    if (
      (form.priceType === "fixed" ||
        form.priceType === "from") &&
      (!form.price || Number(form.price) < 0)
    ) {
      setMessage("請輸入價格。");
      return false;
    }

    if (
      (form.depositMode === "custom_fixed" ||
        form.depositMode === "custom_percent") &&
      (!form.depositValue ||
        Number(form.depositValue) <= 0)
    ) {
      setMessage("請輸入訂金金額或比例。");
      return false;
    }

    if (
      form.depositMode === "custom_percent" &&
      Number(form.depositValue) > 100
    ) {
      setMessage("訂金比例不能超過 100%。");
      return false;
    }

    return true;
  }

  async function saveService() {
    setMessage("");
    setSuccess(false);

    if (!validateForm()) return;

    setSaving(true);

    const price =
      form.priceType === "free" ||
      form.priceType === "quote"
        ? null
        : Number(form.price);

    const depositValue =
      form.depositMode === "custom_fixed" ||
      form.depositMode === "custom_percent"
        ? Number(form.depositValue)
        : null;

    const payload = {
      studio_id: studioId,
      category_id: form.categoryId || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price_type: form.priceType,
      price,
      duration_minutes: Number(form.durationMinutes),
      buffer_before_minutes: Number(
        form.bufferBeforeMinutes || 0
      ),
      buffer_after_minutes: Number(
        form.bufferAfterMinutes || 0
      ),
      deposit_mode: form.depositMode,
      deposit_value: depositValue,
    };

    if (editingId) {
      const { error } = await supabase
        .from("services")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        setMessage(`修改失敗：${error.message}`);
        setSaving(false);
        return;
      }

      setSuccess(true);
      setMessage("服務已更新。");
    } else {
      const nextSortOrder =
        services.length === 0
          ? 0
          : Math.max(
              ...services.map(
                (item) => item.sort_order
              )
            ) + 1;

      const { error } = await supabase
        .from("services")
        .insert({
          ...payload,
          sort_order: nextSortOrder,
          is_active: true,
        });

      if (error) {
        setMessage(`新增失敗：${error.message}`);
        setSaving(false);
        return;
      }

      setSuccess(true);
      setMessage("服務已新增。");
    }

    await reloadServices();

    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);
  }

  function editService(service: Service) {
    setEditingId(service.id);
    setSuccess(false);
    setMessage("");

    setForm({
      name: service.name,
      categoryId: service.category_id || "",
      description: service.description || "",
      priceType: service.price_type,
      price:
        service.price === null
          ? ""
          : String(service.price),
      durationMinutes: String(
        service.duration_minutes
      ),
      bufferBeforeMinutes: String(
        service.buffer_before_minutes
      ),
      bufferAfterMinutes: String(
        service.buffer_after_minutes
      ),
      depositMode: service.deposit_mode,
      depositValue:
        service.deposit_value === null
          ? ""
          : String(service.deposit_value),
    });

    scrollToSection("service-form");
  }

  async function toggleActive(service: Service) {
    const { error } = await supabase
      .from("services")
      .update({
        is_active: !service.is_active,
      })
      .eq("id", service.id);

    if (error) {
      setMessage(`更新失敗：${error.message}`);
      return;
    }

    await reloadServices();
  }

  async function deleteService(service: Service) {
    const confirmed = window.confirm(
      `確定要刪除「${service.name}」嗎？`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", service.id);

    if (error) {
      setMessage(`刪除失敗：${error.message}`);
      return;
    }

    if (editingId === service.id) {
      resetForm();
    }

    await reloadServices();
  }

  const filteredServices = useMemo(() => {
    if (selectedCategory === "all") {
      return services;
    }

    if (selectedCategory === "uncategorized") {
      return services.filter(
        (item) => !item.category_id
      );
    }

    return services.filter(
      (item) =>
        item.category_id === selectedCategory
    );
  }, [services, selectedCategory]);

  function categoryName(
    categoryId: string | null
  ) {
    if (!categoryId) return "未分類";

    return (
      categories.find(
        (category) =>
          category.id === categoryId
      )?.name || "未分類"
    );
  }

  function priceText(service: Service) {
    if (service.price_type === "free") {
      return "免費";
    }

    if (service.price_type === "quote") {
      return "到店報價";
    }

    const formatted = Number(
      service.price || 0
    ).toLocaleString("zh-TW");

    if (service.price_type === "from") {
      return `NT$${formatted} 起`;
    }

    return `NT$${formatted}`;
  }

  function depositText(service: Service) {
    if (
      service.deposit_mode === "studio_default"
    ) {
      return "依工作室預設";
    }

    if (service.deposit_mode === "none") {
      return "不收訂金";
    }

    if (
      service.deposit_mode ===
      "custom_fixed"
    ) {
      return `訂金 NT$${Number(
        service.deposit_value || 0
      ).toLocaleString("zh-TW")}`;
    }

    return `訂金 ${
      service.deposit_value || 0
    }%`;
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
              SERVICES
            </div>

            <div
              style={{
                fontSize: "18px",
              }}
            >
              服務管理
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/services/categories"
              )
            }
            style={headerButton}
          >
            服務分類管理 →
          </button>
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
              scrollToSection("service-form")
            }
            style={sectionNavButton}
          >
            新增服務
          </button>

          <button
            type="button"
            onClick={() =>
              scrollToSection("deposit-settings")
            }
            style={sectionNavButton}
          >
            訂金設定
          </button>

          <button
            type="button"
            onClick={() =>
              scrollToSection("service-list")
            }
            style={sectionNavButton}
          >
            目前服務
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/dashboard/services/categories"
              )
            }
            style={sectionNavButton}
          >
            服務分類
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
            gridTemplateColumns:
              "260px minmax(0, 1fr)",
            gap: "70px",
          }}
        >
          <aside>
            <div style={eyebrow}>
              SERVICE SETTINGS
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
              服務管理
            </h1>

            <p
              style={{
                marginTop: "18px",
                color: "#777",
                fontSize: "14px",
                lineHeight: 1.8,
              }}
            >
              管理服務、價格、預約時間、緩衝時間與訂金。
            </p>
          </aside>

          <section>
            <div
              id="service-form"
              style={{
                scrollMarginTop: "160px",
                borderTop:
                  "1px solid #CACAC5",
                paddingTop: "30px",
              }}
            >
              <div style={eyebrow}>
                {editingId
                  ? "EDIT SERVICE"
                  : "ADD SERVICE"}
              </div>

              <h2 style={sectionTitle}>
                {editingId
                  ? "編輯服務"
                  : "新增服務"}
              </h2>

              <div style={formGrid}>
                <div
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >
                  <label style={labelStyle}>
                    服務名稱
                  </label>

                  <input
                    value={form.name}
                    onChange={(e) =>
                      updateForm(
                        "name",
                        e.target.value
                      )
                    }
                    placeholder="例如：單色凝膠"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    服務分類
                  </label>

                  <select
                    value={form.categoryId}
                    onChange={(e) =>
                      updateForm(
                        "categoryId",
                        e.target.value
                      )
                    }
                    style={selectStyle}
                  >
                    <option value="">
                      未分類
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>
                    價格類型
                  </label>

                  <select
                    value={form.priceType}
                    onChange={(e) =>
                      updateForm(
                        "priceType",
                        e.target
                          .value as FormState["priceType"]
                      )
                    }
                    style={selectStyle}
                  >
                    <option value="fixed">
                      固定價格
                    </option>

                    <option value="from">
                      起價
                    </option>

                    <option value="free">
                      免費
                    </option>

                    <option value="quote">
                      到店報價
                    </option>
                  </select>
                </div>

                {(form.priceType ===
                  "fixed" ||
                  form.priceType ===
                    "from") && (
                  <div>
                    <label
                      style={labelStyle}
                    >
                      價格 NT$
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={(e) =>
                        updateForm(
                          "price",
                          e.target.value
                        )
                      }
                      style={inputStyle}
                    />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>
                    預約佔用時間
                  </label>

                  <div style={numberField}>
                    <input
                      type="number"
                      min="1"
                      value={
                        form.durationMinutes
                      }
                      onChange={(e) =>
                        updateForm(
                          "durationMinutes",
                          e.target.value
                        )
                      }
                      style={numberInput}
                    />

                    <span style={unitText}>
                      分鐘
                    </span>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    前置緩衝
                  </label>

                  <div style={numberField}>
                    <input
                      type="number"
                      min="0"
                      value={
                        form.bufferBeforeMinutes
                      }
                      onChange={(e) =>
                        updateForm(
                          "bufferBeforeMinutes",
                          e.target.value
                        )
                      }
                      style={numberInput}
                    />

                    <span style={unitText}>
                      分鐘
                    </span>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>
                    後置緩衝
                  </label>

                  <div style={numberField}>
                    <input
                      type="number"
                      min="0"
                      value={
                        form.bufferAfterMinutes
                      }
                      onChange={(e) =>
                        updateForm(
                          "bufferAfterMinutes",
                          e.target.value
                        )
                      }
                      style={numberInput}
                    />

                    <span style={unitText}>
                      分鐘
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >
                  <label style={labelStyle}>
                    服務說明
                  </label>

                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      updateForm(
                        "description",
                        e.target.value
                      )
                    }
                    placeholder="可填寫服務內容、注意事項等"
                    style={textareaStyle}
                  />
                </div>
              </div>
            </div>

            <div
              id="deposit-settings"
              style={{
                scrollMarginTop: "160px",
                marginTop: "80px",
                borderTop:
                  "1px solid #CACAC5",
                paddingTop: "30px",
              }}
            >
              <div style={eyebrow}>
                DEPOSIT
              </div>

              <h2 style={sectionTitle}>
                訂金設定
              </h2>

              <div
                style={{
                  marginTop: "34px",
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "28px",
                }}
              >
                <div>
                  <label style={labelStyle}>
                    此服務訂金
                  </label>

                  <select
                    value={
                      form.depositMode
                    }
                    onChange={(e) =>
                      updateForm(
                        "depositMode",
                        e.target
                          .value as FormState["depositMode"]
                      )
                    }
                    style={selectStyle}
                  >
                    <option value="studio_default">
                      使用工作室預設
                    </option>

                    <option value="none">
                      不收訂金
                    </option>

                    <option value="custom_fixed">
                      自訂固定金額
                    </option>

                    <option value="custom_percent">
                      自訂百分比
                    </option>
                  </select>
                </div>

                {(form.depositMode ===
                  "custom_fixed" ||
                  form.depositMode ===
                    "custom_percent") && (
                  <div>
                    <label
                      style={labelStyle}
                    >
                      {form.depositMode ===
                      "custom_fixed"
                        ? "訂金金額 NT$"
                        : "訂金比例 %"}
                    </label>

                    <input
                      type="number"
                      min="0"
                      max={
                        form.depositMode ===
                        "custom_percent"
                          ? "100"
                          : undefined
                      }
                      value={
                        form.depositValue
                      }
                      onChange={(e) =>
                        updateForm(
                          "depositValue",
                          e.target.value
                        )
                      }
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>

              {message && (
                <div
                  style={{
                    marginTop: "34px",
                    borderTop:
                      "1px solid #D0D0CB",
                    paddingTop: "16px",
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
                  justifyContent:
                    "flex-end",
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
                  onClick={saveService}
                  disabled={saving}
                  style={{
                    ...primaryButton,
                    opacity: saving
                      ? 0.6
                      : 1,
                  }}
                >
                  {saving
                    ? "SAVING..."
                    : editingId
                    ? "SAVE CHANGES"
                    : "ADD SERVICE"}
                </button>
              </div>
            </div>

            <div
              id="service-list"
              style={{
                scrollMarginTop: "160px",
                marginTop: "90px",
                borderTop:
                  "1px solid #CACAC5",
                paddingTop: "30px",
              }}
            >
              <div style={eyebrow}>
                YOUR SERVICES
              </div>

              <h2 style={sectionTitle}>
                目前服務
              </h2>

              <div
                style={{
                  marginTop: "28px",
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCategory(
                      "all"
                    )
                  }
                  style={{
                    ...filterButton,
                    background:
                      selectedCategory ===
                      "all"
                        ? "#171717"
                        : "transparent",
                    color:
                      selectedCategory ===
                      "all"
                        ? "#FFF"
                        : "#171717",
                  }}
                >
                  全部
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedCategory(
                      "uncategorized"
                    )
                  }
                  style={{
                    ...filterButton,
                    background:
                      selectedCategory ===
                      "uncategorized"
                        ? "#171717"
                        : "transparent",
                    color:
                      selectedCategory ===
                      "uncategorized"
                        ? "#FFF"
                        : "#171717",
                  }}
                >
                  未分類
                </button>

                {categories.map(
                  (category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        setSelectedCategory(
                          category.id
                        )
                      }
                      style={{
                        ...filterButton,
                        background:
                          selectedCategory ===
                          category.id
                            ? "#171717"
                            : "transparent",
                        color:
                          selectedCategory ===
                          category.id
                            ? "#FFF"
                            : "#171717",
                      }}
                    >
                      {category.name}
                    </button>
                  )
                )}
              </div>

              {filteredServices.length ===
              0 ? (
                <div
                  style={{
                    marginTop: "28px",
                    padding: "38px 0",
                    borderTop:
                      "1px solid #D3D3CE",
                    borderBottom:
                      "1px solid #D3D3CE",
                    color: "#888",
                    fontSize: "14px",
                  }}
                >
                  目前沒有服務。
                </div>
              ) : (
                <div
                  style={{
                    marginTop: "28px",
                    borderTop:
                      "1px solid #CFCFCA",
                  }}
                >
                  {filteredServices.map(
                    (service) => (
                      <div
                        key={service.id}
                        style={{
                          padding:
                            "24px 0",
                          borderBottom:
                            "1px solid #D9D9D4",
                          opacity:
                            service.is_active
                              ? 1
                              : 0.45,
                          display: "grid",
                          gridTemplateColumns:
                            "minmax(220px, 1fr) 150px 220px",
                          gap: "20px",
                          alignItems:
                            "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize:
                                "16px",
                            }}
                          >
                            {service.name}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "8px",
                              fontSize:
                                "12px",
                              color: "#888",
                            }}
                          >
                            {categoryName(
                              service.category_id
                            )}
                            {" · "}
                            {
                              service.duration_minutes
                            }{" "}
                            分鐘
                            {" · "}
                            {depositText(
                              service
                            )}
                          </div>
                        </div>

                        <div>
                          {priceText(
                            service
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "flex-end",
                            gap: "14px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              editService(
                                service
                              )
                            }
                            style={
                              smallButton
                            }
                          >
                            EDIT
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggleActive(
                                service
                              )
                            }
                            style={
                              smallButton
                            }
                          >
                            {service.is_active
                              ? "HIDE"
                              : "SHOW"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteService(
                                service
                              )
                            }
                            style={{
                              ...smallButton,
                              color:
                                "#9A3D37",
                            }}
                          >
                            DELETE
                          </button>
                        </div>
                      </div>
                    )
                  )}
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
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 0",
  border: "none",
  borderBottom: "1px solid #AAA",
  background: "transparent",
  fontSize: "15px",
};

const numberField: React.CSSProperties = {
  display: "flex",
  borderBottom: "1px solid #AAA",
};

const numberInput: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "transparent",
  outline: "none",
  padding: "13px 0",
  fontSize: "16px",
};

const unitText: React.CSSProperties = {
  fontSize: "13px",
  color: "#888",
  alignSelf: "center",
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

const filterButton: React.CSSProperties = {
  border: "1px solid #C4C4BF",
  padding: "9px 13px",
  fontSize: "12px",
  cursor: "pointer",
};

const smallButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  fontSize: "10px",
  letterSpacing: "0.08em",
  cursor: "pointer",
};

const headerButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  fontSize: "11px",
  letterSpacing: "0.1em",
  cursor: "pointer",
};

const sectionNavButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  padding: "0",
  color: "#555",
  fontSize: "13px",
  cursor: "pointer",
  borderBottom: "1px solid transparent",
};
