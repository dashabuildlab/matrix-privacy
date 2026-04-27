import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';
import { trackPaywallShown, trackPaywallCtaTapped, trackPaywallDismissed } from '@/lib/analytics';
import { isRevenueCatAvailable, getOfferings, purchasePackage, restorePurchases, PlanPackage } from '@/lib/purchases';
import { calculateMatrix } from '@/lib/matrix-calc';

const { width } = Dimensions.get('window');

export default function PaywallScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const setPremium = useAppStore((s) => s.setPremium);
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly' | 'weekly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [rcPackages, setRcPackages] = useState<PlanPackage[]>([]);

  useEffect(() => {
    trackPaywallShown({ placement: 'main', paywall_id: 'pw_01' });
    // Fetch real prices from RevenueCat if available
    if (isRevenueCatAvailable()) {
      getOfferings().then(pkgs => { if (pkgs.length) setRcPackages(pkgs); });
    }
  }, []);

  // Use real prices from RevenueCat if available, fallback to localized defaults
  const rcPrice = (type: 'weekly' | 'monthly' | 'yearly') => rcPackages.find(p => p.planType === type);

  const PLANS = [
    {
      id: 'yearly' as const,
      label: t.paywall.year,
      price: rcPrice('yearly')?.price ?? t.paywall.priceYearly,
      pricePerMonth: rcPrice('yearly') ? `${(rcPrice('yearly')!.priceNumber / 12).toFixed(2)}/${locale === 'uk' ? 'міс' : 'mo'}` : t.paywall.priceYearlyPerMonth,
      badge: t.paywall.bestPrice,
      badgeColor: Colors.accent,
      savings: t.paywall.savingsYearly,
      gradient: ['#1E1B4B', '#4338CA'] as [string, string],
      popular: true,
    },
    {
      id: 'monthly' as const,
      label: t.paywall.month,
      price: rcPrice('monthly')?.price ?? t.paywall.priceMonthly,
      pricePerMonth: rcPrice('monthly')?.price ?? t.paywall.priceMonthlyPerMonth,
      badge: null,
      badgeColor: null,
      savings: null,
      gradient: ['#141428', '#1C1C3A'] as [string, string],
      popular: false,
    },
    {
      id: 'weekly' as const,
      label: t.paywall.week,
      price: rcPrice('weekly')?.price ?? t.paywall.priceWeekly,
      pricePerMonth: rcPrice('weekly') ? `${(rcPrice('weekly')!.priceNumber * 4).toFixed(2)}/${locale === 'uk' ? 'міс' : 'mo'}` : t.paywall.priceWeeklyPerMonth,
      badge: t.paywall.tryIt,
      badgeColor: Colors.primary,
      savings: null,
      gradient: ['#141428', '#1C1C3A'] as [string, string],
      popular: false,
    },
  ];

  const FEATURES = [
    { icon: 'grid-outline' as const, label: locale === 'uk' ? 'Повне розшифрування Матриці долі' : 'Full Destiny Matrix decoding' },
    { icon: 'layers-outline' as const, label: locale === 'uk' ? 'Всі тематичні розклади матриці' : 'All themed AI chats' },
    { icon: 'infinite-outline' as const, label: locale === 'uk' ? 'Безлімітний AI чат' : 'Unlimited AI chat' },
    { icon: 'people-outline' as const, label: locale === 'uk' ? 'Аналіз конфліктів' : 'Conflict analysis' },
    { icon: 'sunny-outline' as const, label: locale === 'uk' ? 'Персоналізована порада дня' : 'Personalized daily advice' },
    { icon: 'heart-outline' as const, label: locale === 'uk' ? 'Детальна сумісність' : 'Detailed compatibility' },
    { icon: 'scan-outline' as const, label: locale === 'uk' ? 'AI-портрет Вищого Я' : 'AI Higher Self portrait' },
  ];

  const TESTIMONIALS = [
    { name: t.paywall.testimonial1Name, avatar: '🌸', text: t.paywall.testimonial1Text, stars: 5 },
    { name: t.paywall.testimonial2Name, avatar: '⭐', text: t.paywall.testimonial2Text, stars: 5 },
    { name: t.paywall.testimonial3Name, avatar: '💫', text: t.paywall.testimonial3Text, stars: 5 },
  ];

  /** After successful purchase — generate matrix & navigate */
  const onPurchaseSuccess = (plan: 'weekly' | 'monthly' | 'yearly') => {
    const store = useAppStore.getState();
    let birthDate = store.userBirthDate;
    let matrixData = store.personalMatrix;

    if (!matrixData && birthDate) {
      try {
        let dateStr = birthDate;
        if (dateStr.includes('.')) {
          const parts = dateStr.split('.');
          dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        matrixData = calculateMatrix(dateStr);
        store.setPersonalMatrix(matrixData);
      } catch {}
    }

    let savedId: string | null = null;
    if (matrixData && birthDate) {
      const existing = store.savedMatrices.find((m) => m.birthDate === birthDate && m.name === (store.userName || ''));
      if (existing) {
        savedId = existing.id;
      } else {
        savedId = Date.now().toString();
        store.addMatrix({
          id: savedId,
          name: store.userName || (locale === 'uk' ? 'Моя матриця' : 'My matrix'),
          birthDate,
          data: matrixData,
          createdAt: new Date().toISOString(),
        });
      }
    }

    Alert.alert(
      t.paywall.welcomeToPremium,
      t.paywall.premiumActivated,
      [{
        text: t.paywall.start,
        onPress: () => {
          if (savedId) {
            router.replace({ pathname: '/matrix/[id]', params: { id: savedId } } as any);
          } else {
            router.replace('/(tabs)/matrix' as any);
          }
        },
      }]
    );
  };

  const handleSubscribe = async () => {
    setIsLoading(true);

    // Try real RevenueCat purchase
    const rcPkg = rcPackages.find(p => p.planType === selectedPlan);
    if (rcPkg) {
      trackPaywallCtaTapped(selectedPlan, 'main');
      const result = await purchasePackage(rcPkg);
      setIsLoading(false);
      if (result.success) {
        onPurchaseSuccess(selectedPlan);
      } else if (result.cancelled) {
        // User cancelled — do nothing
      } else if (result.error === 'entitlement_not_active') {
        // Payment went through but RC entitlement didn't activate — prompt restore
        Alert.alert(
          locale === 'uk' ? 'Оплата пройшла' : 'Payment received',
          locale === 'uk'
            ? 'Оплату зараховано, але активація затримується. Натисніть «Відновити покупки» нижче — це займе кілька секунд.'
            : 'Payment was received but activation is delayed. Tap "Restore Purchases" below — it will take a few seconds.',
          [{ text: 'OK' }],
        );
      } else {
        Alert.alert(
          locale === 'uk' ? 'Помилка оплати' : 'Payment Error',
          locale === 'uk'
            ? 'Не вдалося завершити покупку. Якщо кошти списались — натисніть «Відновити покупки» нижче.'
            : 'Could not complete purchase. If you were charged — tap "Restore Purchases" below.',
          [{ text: 'OK' }],
        );
      }
      return;
    }

    // No RevenueCat available (Expo Go or dev build)
    setIsLoading(false);
    Alert.alert(
      locale === 'uk' ? 'Покупки недоступні' : 'Purchases unavailable',
      locale === 'uk' ? 'Покупки доступні тільки у версії з App Store або Google Play.' : 'Purchases are only available in the App Store or Google Play version.',
    );
  };

  const handleRestore = async () => {
    // restore tracked by RevenueCat

    if (isRevenueCatAvailable()) {
      setIsLoading(true);
      const result = await restorePurchases();
      setIsLoading(false);
      if (result.success) {
        Alert.alert(
          locale === 'uk' ? 'Відновлено!' : 'Restored!',
          locale === 'uk' ? 'Вашу підписку відновлено.' : 'Your subscription has been restored.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/matrix' as any) }],
        );
      } else {
        Alert.alert(
          locale === 'uk' ? 'Підписку не знайдено' : 'No subscription found',
          locale === 'uk' ? 'Не знайдено активної підписки для цього акаунту.' : 'No active subscription found for this account.',
        );
      }
    } else {
      Alert.alert(t.paywall.restoreTitle, t.paywall.checkingPurchases, [{ text: 'OK' }]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Close button */}
      <TouchableOpacity testID="paywall-close-btn" style={styles.closeBtn} onPress={() => { trackPaywallDismissed(selectedPlan); router.back(); }}>
        <Ionicons name="close" size={24} color={Colors.textMuted} />
      </TouchableOpacity>

      {/* Hero */}
      <LinearGradient
        colors={['#0F0820', '#1E1B4B', '#312E81']}
        style={styles.hero}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <Text style={styles.heroEmoji}>💎</Text>
        <Text style={styles.heroTitle}>Matrix of Destiny</Text>
        <Text style={styles.heroBadge}>PREMIUM</Text>
        <Text style={styles.heroSubtitle}>
          {t.paywall.heroSubtitle}
        </Text>

        {/* Social proof */}
        <View style={styles.socialProof}>
          <Text style={styles.socialProofText}>⭐⭐⭐⭐⭐</Text>
          <Text style={styles.socialProofCount}>{t.paywall.satisfiedUsers}</Text>
        </View>
      </LinearGradient>

      {/* Features */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>{t.paywall.whatsIncluded}</Text>
        <View style={styles.featuresList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={18} color={Colors.primary} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            </View>
          ))}
        </View>
      </View>

      {/* Plans */}
      <View style={styles.plansSection}>
        <Text style={styles.sectionTitle}>{t.paywall.choosePlan}</Text>
        {PLANS.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            testID={`paywall-plan-${plan.id}`}
            style={[styles.planCard, selectedPlan === plan.id && styles.planCardSelected]}
            onPress={() => setSelectedPlan(plan.id)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedPlan === plan.id ? plan.gradient : ['#141428', '#1C1C3A']}
              style={styles.planGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {plan.badge && (
                <View style={[styles.planBadge, { backgroundColor: plan.badgeColor ?? Colors.primary }]}>
                  <Text style={styles.planBadgeText}>{plan.badge}</Text>
                </View>
              )}
              <View style={styles.planContent}>
                <View>
                  <Text style={styles.planLabel}>{plan.label}</Text>
                  {plan.savings && (
                    <Text style={styles.planSavings}>{plan.savings}</Text>
                  )}
                </View>
                <View style={styles.planPriceGroup}>
                  <Text testID={`paywall-price-${plan.id}`} style={styles.planPrice}>{plan.price}</Text>
                  <Text style={styles.planPricePerMonth}>{plan.pricePerMonth}</Text>
                </View>
                <View style={[styles.planRadio, selectedPlan === plan.id && styles.planRadioSelected]}>
                  {selectedPlan === plan.id && <View style={styles.planRadioInner} />}
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* Testimonials */}
      <View style={styles.testimonials}>
        <Text style={styles.sectionTitle}>{t.paywall.reviews}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.testimonialsRow}>
            {TESTIMONIALS.map((item, i) => (
              <View key={i} style={styles.testimonialCard}>
                <Text style={styles.testimonialAvatar}>{item.avatar}</Text>
                <Text style={styles.testimonialName}>{item.name}</Text>
                <Text style={styles.testimonialStars}>{'⭐'.repeat(item.stars)}</Text>
                <Text style={styles.testimonialText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        {/* Subscription name — required by Apple (must be visible before purchase button) */}
        <Text style={styles.subscriptionName}>
          {locale === 'uk' ? 'Matrix of Destiny Premium' : 'Matrix of Destiny Premium'}
        </Text>

        {/* Auto-renewal disclosure — required by Apple & Google before the purchase button */}
        {(() => {
          const plan = PLANS.find((p) => p.id === selectedPlan);
          if (!plan) return null;
          const periodLabel = selectedPlan === 'yearly'
            ? (locale === 'uk' ? 'рік' : 'year')
            : selectedPlan === 'monthly'
              ? (locale === 'uk' ? 'місяць' : 'month')
              : (locale === 'uk' ? 'тиждень' : 'week');
          return (
            <Text style={styles.renewalDisclosure}>
              {locale === 'uk'
                ? `${plan.price} / ${periodLabel} · автоматичне поновлення`
                : `${plan.price} / ${periodLabel} · auto-renews`}
            </Text>
          );
        })()}

        <TouchableOpacity
          testID="paywall-subscribe-btn"
          style={[styles.subscribeBtn, isLoading && { opacity: 0.7 }]}
          onPress={handleSubscribe}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#7C3AED', '#6D28D9', '#5B21B6']}
            style={styles.subscribeBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.subscribeBtnText} numberOfLines={1}>
                  {t.paywall.tryPlan(PLANS.find((p) => p.id === selectedPlan)?.label ?? '')}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity testID="paywall-restore-btn" onPress={handleRestore} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>{t.paywall.restorePurchases}</Text>
        </TouchableOpacity>

        <Text style={styles.legalText}>
          {t.paywall.legalText}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
          <TouchableOpacity onPress={() => Linking.openURL(
            locale === 'uk'
              ? 'https://dashabuildlab.github.io/matrix-privacy/uk/privacy/'
              : 'https://yourmatrixofdestiny.com/en/privacy'
          )}>
            <Text style={[styles.legalText, { textDecorationLine: 'underline' }]}>
              {locale === 'uk' ? 'Політика конфіденційності' : 'Privacy Policy'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(locale === 'uk' ? 'https://yourmatrixofdestiny.com/uk/terms' : 'https://yourmatrixofdestiny.com/en/terms')}>
            <Text style={[styles.legalText, { textDecorationLine: 'underline' }]}>
              {locale === 'uk' ? 'Умови використання' : 'Terms of Use'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 40 },

  closeBtn: {
    position: 'absolute',
    top: 48,
    right: Spacing.lg,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  hero: {
    padding: Spacing.xl,
    paddingTop: 64,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroEmoji: { fontSize: 56 },
  heroTitle: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroBadge: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '900',
    letterSpacing: 4,
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  socialProof: {
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: 4,
  },
  socialProofText: { fontSize: FontSize.md },
  socialProofCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.sm,
  },

  featuresSection: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  featuresList: { gap: Spacing.sm },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
    flex: 1,
  },

  plansSection: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  planCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  planCardSelected: {
    borderColor: Colors.primary,
  },
  planGradient: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    position: 'relative',
  },
  planBadge: {
    position: 'absolute',
    top: -1,
    right: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderBottomLeftRadius: BorderRadius.sm,
    borderBottomRightRadius: BorderRadius.sm,
  },
  planBadgeText: {
    color: Colors.bg,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  planLabel: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  planSavings: {
    color: Colors.success,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  planPriceGroup: {
    flex: 1,
    alignItems: 'flex-end',
  },
  planPrice: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  planPricePerMonth: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioSelected: {
    borderColor: Colors.primary,
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },

  testimonials: {
    paddingLeft: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  testimonialsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingRight: Spacing.lg,
  },
  testimonialCard: {
    width: 200,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  testimonialAvatar: { fontSize: 28 },
  testimonialName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  testimonialStars: { fontSize: FontSize.sm },
  testimonialText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },

  ctaSection: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  subscribeBtn: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  subscribeBtnGradient: {
    padding: Spacing.lg,
    paddingVertical: Platform.OS === 'web' ? Spacing.xl : Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  subscribeBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '800',
  },

  restoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  restoreText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },

  subscriptionName: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  renewalDisclosure: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  legalText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    lineHeight: 16,
    textAlign: 'center',
    paddingBottom: Spacing.md,
  },
});
