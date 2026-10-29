import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ---- MOCK BACKEND (replace when the API is ready) ----
const USE_MOCK = true; // change to false when the API is ready

type ScanState = "verified" | "needs_verification" | "no_results";

// Each scan shows the next scenario: verified -> needs_verification -> no_results -> repeat
const MOCK_STATES: ScanState[] = ["verified", "needs_verification", "no_results"];
let mockIndex = 0;

async function scanImage(base64: string): Promise<ScanState> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1000)); // fake waiting time
    console.log("MOCK: pretending to send", Math.round(base64.length / 1024), "KB");

    const state = MOCK_STATES[mockIndex];
    mockIndex = (mockIndex + 1) % MOCK_STATES.length;
    console.log("MOCK result:", state);
    return state;
  }

  const response = await fetch("https://PLACEHOLDER-URL/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64 }),
  });

  if (!response.ok) throw new Error("Server error: " + response.status);

  const data = await response.json();
  return data.status; // adjust to match the real API response format
}
// ---- END MOCK BACKEND ----

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  const [isProcessing, setIsProcessing] = useState(false);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [torchOn, setTorchOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Single place where every image ends up (camera or gallery)
  const handleImage = async (uri: string) => {
    try {
      setIsProcessing(true);

      // Step 1: resize + compress, and Step 2: convert to base64
      const result = await manipulateAsync(
        uri,
        [{ resize: { width: 1600 } }], // bigger so small text stays sharp
        { compress: 0.85, format: SaveFormat.JPEG, base64: true } // light compression
      );

      if (!result.base64) throw new Error("No base64 returned");

      setSelectedImage(result.uri);
      setBase64Image(result.base64);

      // Checks
      const sizeKB = Math.round((result.base64.length * 0.75) / 1024);
      console.log("Processed:", result.width, "x", result.height, "~", sizeKB, "KB");
      console.log("Base64 starts with:", result.base64.substring(0, 20));

      // Step 3: send to backend (mock for now)
      const state = await scanImage(result.base64);
      console.log("Image scan result:", state);

      // Step 4: open the Scan Result screen with the matching scenario
      router.push({ pathname: "/result", params: { state } });
    } catch (e) {
      console.log("Processing failed:", e);
      Alert.alert("Error", "Could not process or send the image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Flashlight toggle (back camera only)
  const onToggleTorch = () => {
    if (facing === "front" || !cameraReady) return;
    setTorchOn((t) => !t);
  };

  // Flip camera
  const onFlip = () => {
    setFacing((f) => (f === "back" ? "front" : "back"));
    setTorchOn(false);
  };

  // Take a photo with the live camera
  const onCapture = async () => {
    if (!cameraRef.current || !cameraReady || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (photo?.uri) handleImage(photo.uri);
    } catch (e) {
      console.log("Capture failed:", e);
      Alert.alert("Error", "Could not take the photo. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  // Gallery: ask permission first, then open picker (one photo only)
  const onPickFromGallery = async () => {
    let perm = mediaPermission;

    if (!perm?.granted) {
      if (perm?.canAskAgain !== false) {
        perm = await requestMediaPermission();
      }
    }

    if (!perm?.granted) {
      Alert.alert(
        "Gallery access needed",
        "Allow photo access so you can choose an existing photo to scan.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open settings", onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) return;

    handleImage(result.assets[0].uri);
  };

  // 1) Camera permission status still loading
  if (!permission) return <View style={styles.permWrap} />;

  // 2) Camera permission not granted
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permWrap}>
        <Ionicons name="camera-outline" size={48} color="#444" />
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permBody}>Allow camera access to scan medicine packaging.</Text>
        <Pressable
          style={styles.permBtn}
          onPress={permission.canAskAgain ? requestPermission : Linking.openSettings}
        >
          <Text style={styles.permBtnText}>
            {permission.canAskAgain ? "Allow camera" : "Open settings"}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={styles.permLink}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // 3) Granted -> camera screen
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={torchOn && facing === "back"}
        onCameraReady={() => setCameraReady(true)}
      />

      <SafeAreaView style={styles.overlay}>
        {/* Top bar: back, flashlight */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </Pressable>

          <Pressable
            onPress={onToggleTorch}
            disabled={facing === "front"}
            hitSlop={12}
            style={facing === "front" && { opacity: 0.4 }}
          >
            <Ionicons
              name={torchOn ? "flash" : "flash-outline"}
              size={26}
              color={torchOn ? "#FFE14D" : "#fff"}
            />
          </Pressable>
        </View>

        {/* Scan brackets */}
        <View style={styles.frameWrap} pointerEvents="none">
          <View style={styles.frame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
        </View>

        {/* Bottom: gallery / capture / flip */}
        <View style={styles.bottom}>
          <View style={styles.controls}>
            <Pressable style={styles.thumb} onPress={onPickFromGallery} disabled={isProcessing}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.thumbImg} />
              ) : (
                <Ionicons name="images-outline" size={24} color="#fff" />
              )}
            </Pressable>

            <Pressable
              style={[styles.captureOuter, (isCapturing || isProcessing) && { opacity: 0.6 }]}
              onPress={onCapture}
              disabled={isCapturing || isProcessing}
            >
              <View style={styles.captureInner}>
                <Ionicons name="camera" size={28} color="#fff" />
              </View>
            </Pressable>

            <Pressable onPress={onFlip} hitSlop={12}>
              <Ionicons name="sync-outline" size={30} color="#fff" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const CORNER = 36;
const W = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  overlay: { flex: 1, justifyContent: "space-between" },

  // Permission screen
  permWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#fff" },
  permTitle: { fontSize: 18, fontWeight: "600", marginTop: 16 },
  permBody: { fontSize: 14, color: "#555", textAlign: "center", marginTop: 8 },
  permBtn: { backgroundColor: "#1F5C4D", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24, marginTop: 20 },
  permBtnText: { color: "#fff", fontWeight: "600" },
  permLink: { color: "#1F5C4D", fontWeight: "500" },

  // Top bar
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8 },

  // Scan brackets
  frameWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: { width: "82%", aspectRatio: 1.1 },
  corner: { position: "absolute", width: CORNER, height: CORNER, borderColor: "#fff" },
  tl: { top: 0, left: 0, borderTopWidth: W, borderLeftWidth: W, borderTopLeftRadius: 14 },
  tr: { top: 0, right: 0, borderTopWidth: W, borderRightWidth: W, borderTopRightRadius: 14 },
  bl: { bottom: 0, left: 0, borderBottomWidth: W, borderLeftWidth: W, borderBottomLeftRadius: 14 },
  br: { bottom: 0, right: 0, borderBottomWidth: W, borderRightWidth: W, borderBottomRightRadius: 14 },

  // Bottom
  bottom: { paddingBottom: 24 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 36 },
  thumb: { width: 44, height: 44, borderRadius: 8, borderWidth: 2, borderColor: "#fff", overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)" },
  thumbImg: { width: "100%", height: "100%" },
  captureOuter: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#E8F1EE", alignItems: "center", justifyContent: "center" },
  captureInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: "#1F5C4D", alignItems: "center", justifyContent: "center" },
});