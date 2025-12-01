// components/AiTransparencyModal.tsx
import React, { useState } from "react";
import {
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

type Props = {
  visible: boolean;
  onAccept: () => void;
};

const AiTransparencyModal: React.FC<Props> = ({ visible, onAccept }) => {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;

    if (
      contentOffset.y + layoutMeasurement.height >=
      contentSize.height - paddingToBottom
    ) {
      if (!hasScrolledToEnd) {
        setHasScrolledToEnd(true);
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>AI Transparency & Safety Notice</Text>
          <Text style={styles.subtitle}>
            Please read this carefully before using PantryPal’s AI features.
          </Text>

          <ScrollView
            style={styles.scroll}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* SECTION 1 – What this app does */}
            <Text style={styles.sectionTitle}>1. What PantryPal’s AI Does</Text>
            <Text style={styles.paragraph}>
              PantryPal helps you reduce food waste and make cooking easier. It
              lets you track your pantry and fridge, scan receipts or items to
              capture ingredients and expiry dates, and generate recipe ideas
              using an AI assistant. The AI prioritizes ingredients that are
              closer to expiring and can factor in your dietary preferences and
              restrictions.
            </Text>

            {/* SECTION 2 – How the AI works (high level) */}
            <Text style={styles.sectionTitle}>2. How the AI Assistant Works</Text>
            <Text style={styles.paragraph}>
              PantryPal uses a large language model (LLM). LLMs are predictive
              models that generate text by guessing likely next words based on
              patterns they learned from large datasets. They do not “think” or
              “understand” like humans and do not have real-time awareness of
              your life or environment.
            </Text>
            <Text style={styles.paragraph}>
              When you ask PantryPal for recipes or advice, the LLM combines:
            </Text>
            <Text style={styles.bullet}>
              • The ingredients and preferences you provide (e.g., scanned items,
              cuisines, macronutrient goals, allergies).
            </Text>
            <Text style={styles.bullet}>
              • General cooking, nutrition, and food-handling patterns learned
              from training data.
            </Text>
            <Text style={styles.bullet}>
              • Simple rules from our app logic (for example, trying to use
              items close to expiry or avoid marked allergens).
            </Text>

            {/* SECTION 3 – Data the system uses */}
            <Text style={styles.sectionTitle}>3. What Data the System Uses</Text>
            <Text style={styles.paragraph}>
              To work properly, PantryPal may use:
            </Text>
            <Text style={styles.bullet}>
              • Inventory data you enter or scan (item names, quantities, and
              expiry dates).
            </Text>
            <Text style={styles.bullet}>
              • Preferences you set (cuisine types, macronutrient preferences,
              dietary restrictions, allergens).
            </Text>
            <Text style={styles.bullet}>
              • Optional usage data, such as which recipes you try, to improve
              recommendations over time.
            </Text>
            <Text style={styles.paragraph}>
              Inventory and expiry information can come from receipts, labels,
              or manual entry and may be incomplete, misread, or outdated. You
              should always double-check your own food and labels before eating.
            </Text>

            {/* SECTION 4 – Limitations & risks of LLMs */}
            <Text style={styles.sectionTitle}>
              4. Limitations and Risks of AI & LLMs
            </Text>
            <Text style={styles.paragraph}>
              Although we designed PantryPal to support food sustainability and
              reduce waste, there are important limitations to understand:
            </Text>
            <Text style={styles.bullet}>
              • <Text style={styles.bold}>Hallucinations:</Text> The AI may
              sometimes generate incorrect or misleading information that sounds
              confident (e.g., wrong cooking times, unsafe substitutions, or
              incorrect nutritional facts).
            </Text>
            <Text style={styles.bullet}>
              • <Text style={styles.bold}>Out-of-date knowledge:</Text> The AI
              is not guaranteed to reflect the latest science, safety guidance,
              or product information.
            </Text>
            <Text style={styles.bullet}>
              • <Text style={styles.bold}>Incomplete allergy handling:</Text>{" "}
              While you can mark allergens and restrictions, the AI might miss
              hidden ingredients (for example, sauces or processed items that
              contain allergens).
            </Text>
            <Text style={styles.bullet}>
              • <Text style={styles.bold}>Scanning errors:</Text> OCR and
              computer vision may misread labels or receipts, leading to
              incorrect names, quantities, or expiry dates.
            </Text>
            <Text style={styles.bullet}>
              • <Text style={styles.bold}>Context gaps:</Text> The AI does not
              know your full medical history, kitchen equipment, skill level, or
              the exact condition of your food.
            </Text>

            <Text style={styles.paragraph}>
              Because of these limitations, you should treat AI-generated
              output as suggestions, not instructions that are guaranteed to be
              correct or safe.
            </Text>

            {/* SECTION 5 – Not medical, nutritional, or safety advice */}
            <Text style={styles.sectionTitle}>
              5. No Medical, Nutritional, or Food-Safety Advice
            </Text>
            <Text style={styles.paragraph}>
              PantryPal is for educational and convenience purposes only. It does
              not provide medical, nutritional, or professional food-safety
              advice. The AI is not a doctor, dietitian, or food-safety expert.
            </Text>
            <Text style={styles.paragraph}>
              Always consult a qualified professional for:
            </Text>
            <Text style={styles.bullet}>
              • Medical conditions, allergies, or intolerances.
            </Text>
            <Text style={styles.bullet}>
              • Special diets (e.g., pregnancy, chronic illness, recovery from
              surgery).
            </Text>
            <Text style={styles.bullet}>
              • Questions about whether a specific food is safe to eat.
            </Text>

            {/* SECTION 6 – Your responsibilities as a user */}
            <Text style={styles.sectionTitle}>
              6. Your Responsibilities When Using PantryPal
            </Text>
            <Text style={styles.paragraph}>
              By using PantryPal, you agree that you are responsible for your
              own food choices and safety. This includes:
            </Text>
            <Text style={styles.bullet}>
              • Double-checking expiry dates and the visual/smell condition of
              food before cooking or eating.
            </Text>
            <Text style={styles.bullet}>
              • Verifying ingredients and labels for allergens, especially if you
              or someone you cook for has severe allergies.
            </Text>
            <Text style={styles.bullet}>
              • Adjusting recipes to match your skill level, available tools, and
              dietary needs.
            </Text>
            <Text style={styles.bullet}>
              • Using your own judgment if a suggestion seems unsafe or
              unreasonable.
            </Text>
            <Text style={styles.paragraph}>
              You should never consume food that looks, smells, or tastes off,
              even if the app suggests it is okay to use.
            </Text>

            {/* SECTION 7 – Sustainability & transparency */}
            <Text style={styles.sectionTitle}>
              7. Sustainability & Transparency Goals
            </Text>
            <Text style={styles.paragraph}>
              PantryPal’s mission is to help reduce food waste and support more
              intentional cooking habits. That includes:
            </Text>
            <Text style={styles.bullet}>
              • Suggesting recipes that use items that are closer to expiring,
              when possible.
            </Text>
            <Text style={styles.bullet}>
              • Providing visibility into why a recipe is recommended (for
              example, highlighting which items it helps you use up).
            </Text>
            <Text style={styles.bullet}>
              • Showing you insights about your waste and usage patterns so you
              can make more sustainable decisions over time.
            </Text>
            <Text style={styles.paragraph}>
              However, the app cannot guarantee zero waste, perfect inventory
              tracking, or perfect nutritional outcomes.
            </Text>

            {/* SECTION 8 – Privacy & data handling (high level) */}
            <Text style={styles.sectionTitle}>
              8. Privacy & Data Handling (High Level)
            </Text>
            <Text style={styles.paragraph}>
              PantryPal is designed to respect your privacy. We only collect the
              information necessary to provide core features, such as inventory
              tracking and recipe recommendations. Some data may be processed by
              third-party AI providers to generate responses.
            </Text>
            <Text style={styles.paragraph}>
              Please review our full Privacy Policy and Terms of Use for details
              on data storage, retention, and your rights.
            </Text>

            {/* SECTION 9 – Agreement */}
            <Text style={styles.sectionTitle}>9. Your Agreement</Text>
            <Text style={styles.paragraph}>
              By tapping “I accept” below, you confirm that:
            </Text>
            <Text style={styles.bullet}>
              • You have read and understood this AI Transparency & Safety
              Notice.
            </Text>
            <Text style={styles.bullet}>
              • You understand that PantryPal’s AI may be inaccurate or
              incomplete and that you must use your own judgment.
            </Text>
            <Text style={styles.bullet}>
              • You will not rely on PantryPal as a substitute for professional
              medical, nutritional, or food-safety advice.
            </Text>
            <Text style={styles.bullet}>
              • You accept responsibility for your own food choices and any
              outcomes related to using this app.
            </Text>

            <View style={{ height: 40 }} />
          </ScrollView>

          <Pressable
            style={[
              styles.acceptButton,
              !hasScrolledToEnd && styles.acceptButtonDisabled,
            ]}
            disabled={!hasScrolledToEnd}
            onPress={onAccept}
          >
            <Text style={styles.acceptText}>
              {hasScrolledToEnd ? "I Accept" : "Scroll to the bottom to accept"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default AiTransparencyModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  sheet: {
    backgroundColor: "#020617",
    borderRadius: 16,
    maxHeight: "90%",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f9fafb",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 12,
  },
  scroll: {
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5e7eb",
    marginTop: 12,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 13,
    color: "#d1d5db",
    lineHeight: 18,
    marginBottom: 4,
  },
  bullet: {
    fontSize: 13,
    color: "#cbd5f5",
    lineHeight: 18,
    marginBottom: 2,
  },
  bold: {
    fontWeight: "700",
  },
  acceptButton: {
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#4f46e5",
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptText: {
    color: "#f9fafb",
    fontSize: 14,
    fontWeight: "600",
  },
});
