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
import { MaterialIcons } from "@expo/vector-icons";
import {
  useFonts,
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";

export default function Payments() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({
    Inter_100Thin,
    Inter_200ExtraLight,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  const BG = "#f5f5f5";
  const WHITE = "#fff";
  const BLACK = "#252729";
  const MUTED = "#666";
  const SUBTLE = "#999";
  const LIGHT_BG = "#f0f0f0";
  const DIVIDER = "#f0f0f0";
  const BORDER = "#eee";
  const ITEM_BG = "#f5f5f5";
  const WARNING_BG = "#fef3c7";
  const WARNING_BORDER = "#fde68a";
  const WARNING_DARK = "#d97706";
  const WARNING_TEXT = "#92400e";
  const SUCCESS_BG = "rgba(134,239,172,0.2)";
  const SUCCESS_BORDER = "rgba(134,239,172,0.4)";
  const SUCCESS_TEXT = "#16a34a";
  const DANGER_BG = "rgba(239,68,68,0.12)";
  const DANGER_BORDER = "rgba(239,68,68,0.4)";
  const DANGER_TEXT = "#dc2626";
  const AMBER = "#f59e0b";
  const SHADOW = "#000";

  const FONT_REGULAR = "Inter_400Regular";
  const FONT_MEDIUM = "Inter_500Medium";
  const FONT_SEMI = "Inter_600SemiBold";
  const FONT_BOLD = "Inter_700Bold";
  const FONT_EXTRABOLD = "Inter_800ExtraBold";

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
  const [expandedCycles, setExpandedCycles] = useState<string[]>([]);

  useEffect(() => {
    loadData();
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
    if (item.chargeType === "upgrade_addon") {
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

  const toggleCycle = (cycleId: string) => {
    setExpandedCycles((prev) =>
      prev.includes(cycleId) ? prev.filter((id) => id !== cycleId) : [...prev, cycleId]
    );
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await api.post("/api/reports/generate");
      const reportsRes = await api.get("/api/reports");
      setReports(reportsRes.data.reports || []);
      Alert.alert("Gotowe", "Raport został wygenerowany. Znajdziesz go w historii raportów.");
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
            Alert.alert("Wysłano", `Raport został wysłany na ${user?.email}`);
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
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: BG,
        }}
      >
        <ActivityIndicator size="large" color={BLACK} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: BG }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BLACK}
          />
        }
      >
        <View
          style={{
            padding: 20,
            paddingTop: insets.top + 10,
            backgroundColor: WHITE,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 28, fontFamily: FONT_SEMI, color: BLACK }}>
            Płatności
          </Text>
          <Pressable
            onPress={() => setShowReports(true)}
            style={{
              position: "absolute",
              right: 30,
              top: insets.top + 16,
            }}
          >
            <MaterialIcons name="bar-chart" size={26} color={BLACK} />
          </Pressable>
        </View>

        {!user?.billingDay && (
          <View
            style={{
              paddingVertical: 12,
              paddingHorizontal: 20,
              backgroundColor: WARNING_BG,
              borderWidth: 1,
              borderColor: WARNING_BORDER,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Ionicons name="warning-outline" size={20} color={WARNING_DARK} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: WARNING_TEXT,
                  fontFamily: FONT_SEMI,
                }}
              >
                Nie masz ustawionego dnia rozliczeniowego
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: WARNING_TEXT,
                  marginTop: 4,
                  fontFamily: FONT_REGULAR,
                }}
              >
                Zostanie ustawiony przy dodaniu pierwszej subskrypcji.
              </Text>
            </View>
          </View>
        )}

        <View style={{ padding: 16, gap: 16 }}>
          {user?.billingDay && (
            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 12,
                padding: 16,
                gap: 0,
                shadowColor: SHADOW,
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  color: BLACK,
                  fontSize: 12,
                  fontFamily: FONT_REGULAR,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Dzień rozliczeniowy
              </Text>
              <Text
                style={{
                  color: BLACK,
                  fontSize: 24,
                  fontFamily: FONT_EXTRABOLD,
                  marginTop: 2,
                }}
              >
                {user.billingDay}. dnia każdego miesiąca
              </Text>
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: BLACK,
                }}
              >
                <Text
                  style={{
                    color: BLACK,
                    fontSize: 12,
                    fontFamily: FONT_REGULAR,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Najbliższa płatność
                </Text>
                <Text
                  style={{
                    color: BLACK,
                    fontSize: 18,
                    fontFamily: FONT_SEMI,
                    marginTop: 4,
                  }}
                >
                  {getNextBillingDate()}
                </Text>
              </View>
            </View>
          )}

          {preview && preview.items?.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowPaymentDetail(true)}
              style={{
                backgroundColor: WHITE,
                borderRadius: 12,
                padding: 16,
                gap: 0,
                shadowColor: SHADOW,
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: FONT_BOLD,
                    color: BLACK,
                  }}
                >
                  Co wchodzi w tę płatność
                </Text>
                <Text
                  style={{
                    fontSize: 22,
                    color: SUBTLE,
                    fontFamily: FONT_REGULAR,
                  }}
                >
                  ›
                </Text>
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
                    borderTopColor: DIVIDER,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontFamily: FONT_BOLD, color: BLACK }}>
                      {item.providerName}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#888",
                        marginTop: 2,
                        fontFamily: FONT_REGULAR,
                      }}
                    >
                      {item.pendingPlanName ?? item.planName}
                      {item.chargeType === "upgrade_addon" && item.pendingCharge > 0 && (
                        <Text style={{ color: AMBER, fontFamily: FONT_REGULAR }}>
                          {" "}
                          + dopłata {item.pendingCharge.toFixed(2)} zł
                        </Text>
                      )}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 15, fontFamily: FONT_BOLD, color: BLACK }}>
                    {item.toPay.toFixed(2)} zł
                  </Text>
                </View>
              ))}

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingTop: 14,
                  marginTop: 4,
                  borderTopWidth: 2,
                  borderTopColor: BLACK,
                }}
              >
                <Text style={{ fontSize: 17, fontFamily: FONT_EXTRABOLD, color: BLACK }}>
                  Razem
                </Text>
                <Text style={{ fontSize: 17, fontFamily: FONT_EXTRABOLD, color: BLACK }}>
                  {preview.totalToPay.toFixed(2)} zł
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 20,
                padding: 20,
                alignItems: "center",
              }}
            >
              <Text
                style={{ fontSize: 14, color: SUBTLE, fontFamily: FONT_REGULAR }}
              >
                Brak zaplanowanych płatności
              </Text>
            </View>
          )}

          {history.length > 0 && (
            <View
              style={{
                backgroundColor: WHITE,
                borderRadius: 12,
                padding: 16,
                gap: 0,
                shadowColor: SHADOW,
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: FONT_BOLD,
                  color: BLACK,
                  marginBottom: 12,
                }}
              >
                Historia płatności
              </Text>

              {history.map((cycle: any, index: number) => {
                const isExpanded = expandedCycles.includes(cycle.id);
                return (
                  <View key={cycle.id}>
                    <Pressable
                      onPress={() => toggleCycle(cycle.id)}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 14,
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: DIVIDER,
                      }}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontFamily: FONT_SEMI,
                            color: BLACK,
                          }}
                        >
                          {new Date(cycle.billingDate).toLocaleDateString("pl-PL", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: SUBTLE,
                            fontFamily: FONT_REGULAR,
                          }}
                        >
                          {cycle.totalPLN?.toFixed(2)} zł
                        </Text>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            backgroundColor:
                              cycle.status === "paid" ? SUCCESS_BG : DANGER_BG,
                            borderColor:
                              cycle.status === "paid" ? SUCCESS_BORDER : DANGER_BORDER,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              fontFamily: FONT_BOLD,
                              color:
                                cycle.status === "paid" ? SUCCESS_TEXT : DANGER_TEXT,
                            }}
                          >
                            {cycle.status === "paid" ? "Opłacone" : "Oczekuje"}
                          </Text>
                        </View>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={SUBTLE}
                        />
                      </View>
                    </Pressable>

                    {isExpanded && (
                      <View
                        style={{
                          backgroundColor: ITEM_BG,
                          borderRadius: 10,
                          padding: 14,
                          marginBottom: 8,
                          gap: 8,
                        }}
                      >
                        {cycle.items?.map((item: any, idx: number) => (
                          <View
                            key={idx}
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              paddingVertical: 4,
                              borderTopWidth: idx === 0 ? 0 : 1,
                              borderTopColor: "#e8e8e8",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                color: "#555",
                                fontFamily: FONT_REGULAR,
                              }}
                            >
                              {item.providerCode
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                              {" · "}
                              {item.planName}
                            </Text>
                            <Text
                              style={{
                                fontSize: 13,
                                fontFamily: FONT_SEMI,
                                color: "#555",
                              }}
                            >
                              {item.pricePLN.toFixed(2)} zł
                            </Text>
                          </View>
                        ))}

                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            paddingTop: 8,
                            borderTopWidth: 1,
                            borderTopColor: "#ccc",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontFamily: FONT_EXTRABOLD,
                              color: "#333",
                            }}
                          >
                            Razem
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              fontFamily: FONT_EXTRABOLD,
                              color: "#333",
                            }}
                          >
                            {cycle.totalPLN?.toFixed(2)} zł
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showPaymentDetail}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPaymentDetail(false)}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowPaymentDetail(false)}
          />

          <View
            style={{
              marginTop: "auto",
              backgroundColor: WHITE,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              height: "85%",
              paddingTop: 24,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                paddingHorizontal: 24,
                paddingBottom: 16,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 20, fontFamily: FONT_BOLD, color: BLACK }}>
                Szczegóły płatności
              </Text>
              <Pressable onPress={() => setShowPaymentDetail(false)}>
                <Text style={{ fontSize: 22, color: SUBTLE, fontFamily: FONT_REGULAR }}>
                  ✕
                </Text>
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingBottom: insets.bottom + 24,
                gap: 10,
              }}
            >
              {preview?.items?.map((item: any, idx: number) => {
                const tag = getItemTag(item);
                return (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: ITEM_BG,
                      borderRadius: 12,
                      padding: 16,
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontFamily: FONT_BOLD,
                            color: BLACK,
                          }}
                        >
                          {item.providerName}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: FONT_REGULAR,
                            color: MUTED,
                            marginTop: 2,
                          }}
                        >
                          {item.pendingPlanName ?? item.planName}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 17,
                          fontFamily: FONT_BOLD,
                          color: BLACK,
                        }}
                      >
                        {item.toPay.toFixed(2)} zł
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: MUTED,
                          fontFamily: FONT_MEDIUM,
                        }}
                      >
                        {formatPeriod(item.periodFrom, item.periodTo)}
                      </Text>
                    </View>

                    {item.chargeType === "upgrade_addon" && item.pendingCharge > 0 && (
                      <View
                        style={{
                          gap: 6,
                          borderTopWidth: 1,
                          borderTopColor: BORDER,
                          paddingTop: 8,
                        }}
                      >
                        {item.planName && item.pendingPlanName && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 2,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#555",
                                fontFamily: FONT_REGULAR,
                              }}
                            >
                              {item.planName}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: SUBTLE,
                                fontFamily: FONT_REGULAR,
                              }}
                            >
                              →
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#555",
                                fontFamily: FONT_BOLD,
                              }}
                            >
                              {item.pendingPlanName}
                            </Text>
                          </View>
                        )}
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#555",
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            Subskrypcja ({item.pendingPlanName ?? item.planName})
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: FONT_SEMI,
                              color: "#555",
                            }}
                          >
                            {item.pricePLN.toFixed(2)} zł
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: AMBER,
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            Dopłata za zmianę planu
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: FONT_SEMI,
                              color: AMBER,
                            }}
                          >
                            +{item.pendingCharge.toFixed(2)} zł
                          </Text>
                        </View>
                      </View>
                    )}

                    {item.chargeType === "renewal" && item.pendingPlanName && (
                      <View
                        style={{
                          gap: 6,
                          borderTopWidth: 1,
                          borderTopColor: BORDER,
                          paddingTop: 8,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 2,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#555",
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            {item.planName}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: SUBTLE,
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            →
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#555",
                              fontFamily: FONT_BOLD,
                            }}
                          >
                            {item.pendingPlanName}
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#555",
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            Subskrypcja ({item.pendingPlanName})
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: FONT_SEMI,
                              color: "#555",
                            }}
                          >
                            {item.pricePLN.toFixed(2)} zł
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
                        <Text
                          style={{
                            fontSize: 11,
                            fontFamily: FONT_BOLD,
                            color: tag.color,
                          }}
                        >
                          {tag.label}
                        </Text>
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
                  borderTopWidth: 1,
                  borderTopColor: BLACK,
                }}
              >
                <Text style={{ fontSize: 17, fontFamily: FONT_EXTRABOLD, color: BLACK }}>
                  Razem
                </Text>
                <Text style={{ fontSize: 17, fontFamily: FONT_EXTRABOLD, color: BLACK }}>
                  {preview?.totalToPay?.toFixed(2)} zł
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReports}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReports(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
            onPress={() => setShowReports(false)}
          />

          <View
            style={{
              backgroundColor: WHITE,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: insets.bottom + 24,
              gap: 20,
              height: "90%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 20, fontFamily: FONT_BOLD, color: BLACK }}>
                Podsumowanie
              </Text>
              <Pressable onPress={() => setShowReports(false)}>
                <Text
                  style={{
                    fontSize: 22,
                    color: SUBTLE,
                    fontFamily: FONT_REGULAR,
                  }}
                >
                  ✕
                </Text>
              </Pressable>
            </View>

            <Text
              style={{
                fontSize: 12,
                color: MUTED,
                marginTop: -12,
                fontFamily: FONT_REGULAR,
              }}
            >
              Podsumowanie subskrypcji i obejrzanych tytułów za ostatni okres
              rozliczeniowy.
            </Text>

            <View style={{ gap: 10 }}>
              <Pressable
                onPress={handleGenerateReport}
                disabled={generatingReport || sendingEmail}
                style={{
                  paddingVertical: 16,
                  backgroundColor: BLACK,
                  borderRadius: 12,
                  marginBottom: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {generatingReport ? (
                  <ActivityIndicator color={WHITE} size="small" />
                ) : (
                  <Text
                    style={{
                      color: WHITE,
                      fontFamily: FONT_BOLD,
                      fontSize: 15,
                    }}
                  >
                    Raport
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleSendEmail}
                disabled={generatingReport || sendingEmail}
                style={{
                  padding: 14,
                  backgroundColor: LIGHT_BG,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: -12,
                }}
              >
                {sendingEmail ? (
                  <ActivityIndicator color={BLACK} size="small" />
                ) : (
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                  >
                    <Ionicons name="mail" size={16} color="#333" />
                    <Text
                      style={{
                        color: "#333",
                        fontFamily: FONT_BOLD,
                        fontSize: 14,
                      }}
                    >
                      Wyślij na {user?.email}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 320 }}
            >
              {reports.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: SUBTLE,
                      fontFamily: FONT_SEMI,
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
                        borderTopColor: DIVIDER,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontFamily: FONT_BOLD,
                            color: BLACK,
                          }}
                        >
                          {formatPeriodLabel(report.periodFrom, report.periodTo)}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 2,
                          }}
                        >
                          <Ionicons name="mail" size={12} color="#bbb" />
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#bbb",
                              fontFamily: FONT_REGULAR,
                            }}
                          >
                            {report.sentAt
                              ? `Wysłano ${new Date(report.sentAt).toLocaleDateString("pl-PL")}`
                              : "Nie wysłano"}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => handleDownloadPDF(report.id, report.period)}
                        disabled={downloadingId === report.id}
                        style={{
                          backgroundColor: WHITE,
                          borderRadius: 8,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          marginLeft: 12,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {downloadingId === report.id ? (
                          <ActivityIndicator size="small" color={BLACK} />
                        ) : (
                          <MaterialIcons
                            name="file-download"
                            size={20}
                            color={BLACK}
                          />
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <View
                  style={{ alignItems: "center", paddingVertical: 20 }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: SUBTLE,
                      fontFamily: FONT_REGULAR,
                    }}
                  >
                    Brak wygenerowanych raportów
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}