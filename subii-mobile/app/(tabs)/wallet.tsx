import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";
import { api } from "../../src/lib/api";
import { storage } from "../../src/lib/storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function Payments() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [preview, setPreview] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showPaymentDetail, setShowPaymentDetail] = useState(false);
  const [showReports, setShowReports] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const token = await storage.getToken();
      if (!token) {
        router.replace("/login" as any);
        return;
      }

      const savedUser = await storage.getUser();
      setUser(savedUser);

      const [previewRes, historyRes, reportsRes] = await Promise.all([
        api.get("/api/billing/preview").catch(() => null),
        api.get("/api/billing/history").catch(() => null),
        api.get("/api/reports").catch(() => null),
      ]);

      if (previewRes) setPreview(previewRes.data);
      if (historyRes) setHistory(historyRes.data.history || []);
      if (reportsRes) setReports(reportsRes.data.reports || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        await storage.clearAuth();
        router.replace("/login" as any);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatPeriod = (from: string, to: string) => {
    const f = new Date(from).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const t = new Date(to).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${f} – ${t}`;
  };

  const formatPeriodLabel = (periodFrom: string, periodTo: string) => {
    const from = new Date(periodFrom).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
    });
    const to = new Date(periodTo).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${from} – ${to}`;
  };

  const getItemTag = (item: any) => {
    if (item.chargeType === "first_payment") {
      return {
        label: "Pierwsza płatność – zapłać później",
        color: "#7c3aed",
        bg: "#f5f3ff",
      };
    }
    if (item.chargeType === "cancelled_first_payment") {
      return {
        label: "Zapłać później – subskrypcja anulowana",
        color: "#dc2626",
        bg: "#fef2f2",
      };
    }
    if (item.chargeType === "upgrade_addon") {
      return {
        label: "Dopłata za zmianę planu",
        color: "#f59e0b",
        bg: "#fef3c7",
      };
    }
    return null;
  };

  const getNextBillingDate = () => {
    if (!user?.billingDay) return "—";
    const today = new Date();
    const candidate = new Date(today.getFullYear(), today.getMonth(), user.billingDay);
    if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
    return candidate.toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await api.post("/api/reports/generate");
      const reportsRes = await api.get("/api/reports");
      setReports(reportsRes.data.reports || []);
      Alert.alert("✅ Gotowe", "Raport został wygenerowany. Znajdziesz go w historii raportów.");
    } catch (error: any) {
      Alert.alert("Błąd", error.response?.data?.error || "Nie udało się wygenerować raportu");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleSendEmail = async () => {
    Alert.alert("Wyślij raport", `Raport zostanie wysłany na adres: ${user?.email}`, [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Wyślij",
        onPress: async () => {
          setSendingEmail(true);
          try {
            await api.post("/api/reports/generate", { sendEmail: true });
            const reportsRes = await api.get("/api/reports");
            setReports(reportsRes.data.reports || []);
            Alert.alert("✅ Wysłano", `Raport został wysłany na ${user?.email}`);
          } catch (error: any) {
            Alert.alert("Błąd", error.response?.data?.error || "Nie udało się wysłać raportu");
          } finally {
            setSendingEmail(false);
          }
        },
      },
    ]);
  };

  const handleDownloadPDF = async (reportId: string, period: string) => {
    setDownloadingId(reportId);
    try {
      const res = await api.get(`/api/reports/${reportId}`);
      const pdfBase64: string = res.data.pdfBase64;

      const safePeriod = String(period || "").replace(/[^\w.-]+/g, "_");
      const fileUri = `${FileSystem.cacheDirectory}subii-raport-${safePeriod}.pdf`;

      await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: `Raport Subii ${period}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Błąd", "Udostępnianie plików nie jest dostępne na tym urządzeniu");
      }
    } catch {
      Alert.alert("Błąd", "Nie udało się pobrać raportu");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      {/* ── EKRAN (ScrollView) ── */}
      <ScrollView
        style={{ flex: 1, backgroundColor: "#f5f5f5" }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />}
      >
        {/* Header */}
        <View
          style={{
            padding: 20,
            paddingTop: insets.top + 10,
            backgroundColor: "#fff",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: "800" }}>Płatności</Text>
          <Pressable onPress={() => setShowReports(true)}>
            <Ionicons name="document-text-outline" size={26} color="#000" />
          </Pressable>
        </View>

        <View style={{ padding: 16, gap: 16 }}>
          {/* Karta rozliczeniowa */}
          {user?.billingDay ? (
            <View style={{ backgroundColor: "#000", borderRadius: 20, padding: 24, gap: 4 }}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 12,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Dzień rozliczeniowy
              </Text>
              <Text style={{ color: "#fff", fontSize: 32, fontWeight: "900", marginTop: 2 }}>
                {user.billingDay}. każdego miesiąca
              </Text>
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(255,255,255,0.15)",
                }}
              >
                <Text
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 12,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Najbliższa płatność
                </Text>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 4 }}>
                  {getNextBillingDate()}
                </Text>
              </View>
            </View>
          ) : (
            <View
              style={{
                padding: 16,
                backgroundColor: "#fff3cd",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#ffc107",
              }}
            >
              <Text style={{ fontSize: 14, color: "#856404", fontWeight: "600" }}>
                ⚠️ Nie masz ustawionego dnia rozliczeniowego
              </Text>
              <Text style={{ fontSize: 12, color: "#856404", marginTop: 4 }}>
                Zostanie ustawiony przy dodaniu pierwszej subskrypcji.
              </Text>
            </View>
          )}

          {/* Najbliższa płatność — pozycje */}
          {preview && preview.items?.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowPaymentDetail(true)}
              style={{ backgroundColor: "#fff", borderRadius: 20, padding: 20, gap: 0 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "800" }}>Co wchodzi w tę płatność</Text>
                <Text style={{ fontSize: 12, color: "#999", fontWeight: "600" }}>Szczegóły →</Text>
              </View>

              {preview.items.map((item: any, idx: number) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 12,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: "#f0f0f0",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700" }}>{item.providerName}</Text>
                    <Text style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                      {item.planName}
                      {item.chargeType === "upgrade_addon" && item.pendingCharge > 0 && (
                        <Text style={{ color: "#f59e0b" }}>{" "}+ dopłata {item.pendingCharge.toFixed(2)} zł</Text>
                      )}
                      {item.chargeType === "first_payment" && (
                        <Text style={{ color: "#7c3aed" }}>{" "}· pierwsza płatność</Text>
                      )}
                      {item.chargeType === "cancelled_first_payment" && (
                        <Text style={{ color: "#dc2626" }}>{" "}· anulowana</Text>
                      )}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: "700" }}>{item.toPay.toFixed(2)} zł</Text>
                </View>
              ))}

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingTop: 14,
                  marginTop: 4,
                  borderTopWidth: 2,
                  borderTopColor: "#000",
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: "900" }}>Razem</Text>
                <Text style={{ fontSize: 17, fontWeight: "900" }}>{preview.totalToPay.toFixed(2)} zł</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 20, alignItems: "center" }}>
              <Text style={{ fontSize: 14, color: "#999" }}>Brak zaplanowanych płatności</Text>
            </View>
          )}

          {/* Historia płatności */}
          {history.length > 0 && (
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", paddingHorizontal: 2 }}>Historia płatności</Text>

              {history.map((cycle: any) => (
                <View
                  key={cycle.id}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 20,
                    padding: 16,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "700" }}>
                      {new Date(cycle.billingDate).toLocaleDateString("pl-PL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: cycle.status === "paid" ? "#d1fae5" : "#fef3c7",
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: cycle.status === "paid" ? "#065f46" : "#92400e",
                        }}
                      >
                        {cycle.status === "paid" ? "Opłacone" : "Oczekuje"}
                      </Text>
                    </View>
                  </View>

                  {cycle.items?.map((item: any, idx: number) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingVertical: 6,
                        borderTopWidth: 1,
                        borderTopColor: "#f0f0f0",
                      }}
                    >
                      <Text style={{ fontSize: 13, color: "#555" }}>
                        {item.providerCode.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                        {" · "}
                        {item.planName}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: "600" }}>{item.pricePLN.toFixed(2)} zł</Text>
                    </View>
                  ))}

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingTop: 10,
                      borderTopWidth: 2,
                      borderTopColor: "#000",
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "800" }}>Razem</Text>
                    <Text style={{ fontSize: 14, fontWeight: "800" }}>{cycle.totalPLN?.toFixed(2)} zł</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── MODAL: Szczegóły płatności (poza ScrollView) ── */}
      <Modal
        visible={showPaymentDetail}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPaymentDetail(false)}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.5)" }]}
            onPress={() => setShowPaymentDetail(false)}
          />

          <View
            style={{
              marginTop: "auto",
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              height: "85%",
              paddingTop: 24,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <View
              style={{
                paddingHorizontal: 24,
                paddingBottom: 16,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "900" }}>Szczegóły płatności</Text>
              <Pressable onPress={() => setShowPaymentDetail(false)}>
                <Text style={{ fontSize: 22, color: "#999" }}>✕</Text>
              </Pressable>
            </View>

            {/* Scroll */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingBottom: insets.bottom + 24,
                gap: 20,
              }}
            >
              {preview?.items?.map((item: any, idx: number) => {
                const tag = getItemTag(item);
                return (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: "#f9f9f9",
                      borderRadius: 16,
                      padding: 16,
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: "#000" }}>{item.providerName}</Text>
                        <Text style={{ fontSize: 13, color: "#666", marginTop: 2 }}>{item.planName}</Text>
                      </View>
                      <Text style={{ fontSize: 17, fontWeight: "900", color: "#000" }}>{item.toPay.toFixed(2)} zł</Text>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#999",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        Okres
                      </Text>
                      <Text style={{ fontSize: 12, color: "#333", fontWeight: "600" }}>
                        {formatPeriod(item.periodFrom, item.periodTo)}
                      </Text>
                    </View>

                    {item.chargeType === "upgrade_addon" && item.pendingCharge > 0 && (
                      <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 8 }}>
                        {item.planName && item.pendingPlanName && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <Text style={{ fontSize: 12, color: "#555" }}>{item.planName}</Text>
                            <Text style={{ fontSize: 12, color: "#999" }}>→</Text>
                            <Text style={{ fontSize: 12, color: "#555", fontWeight: "700" }}>{item.pendingPlanName}</Text>
                          </View>
                        )}

                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 12, color: "#555" }}>Subskrypcja</Text>
                          <Text style={{ fontSize: 12, fontWeight: "600", color: "#555" }}>{item.pricePLN.toFixed(2)} zł</Text>
                        </View>

                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 12, color: "#f59e0b" }}>Dopłata za zmianę planu</Text>
                          <Text style={{ fontSize: 12, fontWeight: "600", color: "#f59e0b" }}>
                            +{item.pendingCharge.toFixed(2)} zł
                          </Text>
                        </View>
                      </View>
                    )}

                    {tag && (
                      <View
                        style={{
                          alignSelf: "flex-start",
                          backgroundColor: tag.bg,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "700", color: tag.color }}>{tag.label}</Text>
                      </View>
                    )}
                  </View>
                );
              })}

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingTop: 4,
                  borderTopWidth: 2,
                  borderTopColor: "#000",
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: "900" }}>Razem</Text>
                <Text style={{ fontSize: 17, fontWeight: "900" }}>{preview?.totalToPay?.toFixed(2)} zł</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Raporty (poza ScrollView) ── */}
      <Modal visible={showReports} animationType="slide" transparent onRequestClose={() => setShowReports(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => setShowReports(false)}
          />

          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: insets.bottom + 24,
              gap: 20,
              height: "90%",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "900" }}>Raport miesięczny</Text>
              <Pressable onPress={() => setShowReports(false)}>
                <Text style={{ fontSize: 22, color: "#999" }}>✕</Text>
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: "#888", marginTop: -12 }}>
              Podsumowanie subskrypcji i obejrzanych tytułów za ostatni okres rozliczeniowy.
            </Text>

            <View style={{ gap: 10 }}>
              <Pressable
                onPress={handleGenerateReport}
                disabled={generatingReport || sendingEmail}
                style={{
                  backgroundColor: "#000",
                  borderRadius: 12,
                  padding: 14,
                  alignItems: "center",
                  opacity: generatingReport ? 0.6 : 1,
                }}
              >
                {generatingReport ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>📄 Generuj raport</Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleSendEmail}
                disabled={generatingReport || sendingEmail}
                style={{
                  backgroundColor: "#f5f5f5",
                  borderRadius: 12,
                  padding: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#e0e0e0",
                  opacity: sendingEmail ? 0.6 : 1,
                }}
              >
                {sendingEmail ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={{ color: "#000", fontWeight: "700", fontSize: 14 }}>✉️ Wyślij na {user?.email}</Text>
                )}
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {reports.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: "#999",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                    }}
                  >
                    Historia raportów
                  </Text>

                  {reports.map((report: any) => (
                    <View
                      key={report.id}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 12,
                        borderTopWidth: 1,
                        borderTopColor: "#f0f0f0",
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700" }}>
                          {formatPeriodLabel(report.periodFrom, report.periodTo)}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>
                          {report.sentAt ? `✉️ Wysłano ${new Date(report.sentAt).toLocaleDateString("pl-PL")}` : "Nie wysłano"}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => handleDownloadPDF(report.id, report.period)}
                        disabled={downloadingId === report.id}
                        style={{
                          backgroundColor: "#f0f0f0",
                          borderRadius: 8,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          marginLeft: 12,
                        }}
                      >
                        {downloadingId === report.id ? (
                          <ActivityIndicator size="small" color="#000" />
                        ) : (
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#000" }}>Pobierz PDF</Text>
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <Text style={{ fontSize: 13, color: "#bbb" }}>Brak wygenerowanych raportów</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}