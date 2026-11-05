import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Printer,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  Store,
  User,
  Phone,
  MapPin,
  Globe,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  KeyRound,
  RefreshCw,
} from 'lucide-react-native';
import { Palette, Shadows } from '@/constants/theme';
import { useAuth } from '@/services/authContext';
import { Api } from '@/services/api';

export default function LoginScreen() {
  const { login, registerVendor } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1);

  // Sign In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up State
  const [vendorName, setVendorName] = useState('');
  const [vendorSlug, setVendorSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [address, setAddress] = useState('');

  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP Verification States
  const [signupOtp, setSignupOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleVendorNameChange = (val: string) => {
    setVendorName(val);
    if (!slugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 25);
      setVendorSlug(generated);
    }
  };

  const handleSlugChange = (val: string) => {
    setSlugManuallyEdited(true);
    const cleaned = val
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 30);
    setVendorSlug(cleaned);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password.trim());
    } catch (err: any) {
      console.warn('Login failure:', err);
      setError(err?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Next = () => {
    if (!vendorName.trim()) {
      setError('Please enter your shop or business name.');
      return;
    }
    if (!vendorSlug.trim() || vendorSlug.trim().length < 3) {
      setError('Shop URL handle must be at least 3 characters.');
      return;
    }
    if (!address.trim() || address.trim().length < 5) {
      setError('Please enter your store address (at least 5 characters).');
      return;
    }
    setError(null);
    setSignupStep(2);
  };

  // Step 2 -> Validate owner profile and send email OTP
  const handleStep2Next = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Owner full name is required (at least 2 characters).');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    const cleanPhone = signupPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile phone number.');
      return;
    }
    if (!signupPassword.trim() || signupPassword.trim().length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await Api.sendOtp(signupEmail.trim());
      setSignupStep(3);
      setResendTimer(60);
    } catch (err: any) {
      console.warn('Send OTP error:', err);
      setError(err?.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    try {
      await Api.sendOtp(signupEmail.trim());
      setResendTimer(60);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  // Step 3 -> Verify OTP and complete registration
  const handleRegister = async () => {
    if (signupOtp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    const cleanPhone = signupPhone.replace(/\D/g, '');
    setError(null);
    setLoading(true);
    try {
      await registerVendor({
        vendorName: vendorName.trim(),
        vendorSlug: vendorSlug.trim().toLowerCase(),
        fullName: fullName.trim(),
        email: signupEmail.trim(),
        contactPhone: cleanPhone,
        address: address.trim(),
        password: signupPassword.trim(),
        otp: signupOtp.trim(),
      });
    } catch (err: any) {
      console.warn('Registration failure:', err);
      setError(err?.message || 'Registration failed. The code may be incorrect or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Brand */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Printer size={32} color={Palette.saffron.DEFAULT} />
            </View>
            <Text style={styles.title}>Print2Me Partner</Text>
            <Text style={styles.subtitle}>Vendor Mobile Workstation</Text>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, authMode === 'signin' && styles.tabButtonActive]}
              onPress={() => {
                setAuthMode('signin');
                setError(null);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.tabButtonText, authMode === 'signin' && styles.tabButtonTextActive]}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, authMode === 'signup' && styles.tabButtonActive]}
              onPress={() => {
                setAuthMode('signup');
                setError(null);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.tabButtonText, authMode === 'signup' && styles.tabButtonTextActive]}
              >
                Register Shop
              </Text>
            </TouchableOpacity>
          </View>

          {/* Auth Card */}
          <View style={styles.card}>
            {authMode === 'signin' ? (
              /* ================== SIGN IN VIEW ================== */
              <>
                <Text style={styles.cardTitle}>Sign In</Text>
                <Text style={styles.cardSubtitle}>
                  Enter your credentials to access live print queues and counter orders.
                </Text>

                {error && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={16} color={Palette.danger.DEFAULT} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Email Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color={Palette.ink.muted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="vendor@print2me.in"
                      placeholderTextColor={Palette.ink.muted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Password Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color={Palette.ink.muted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { paddingRight: 40 }]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor={Palette.ink.muted}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color={Palette.ink.muted} />
                      ) : (
                        <Eye size={18} color={Palette.ink.muted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.btnDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Sign In to Dashboard</Text>
                  )}
                </TouchableOpacity>

                {/* Switch to Register link */}
                <TouchableOpacity
                  style={styles.switchModeLink}
                  onPress={() => {
                    setAuthMode('signup');
                    setSignupStep(1);
                    setError(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchModeText}>
                    New vendor partner?{' '}
                    <Text style={styles.switchModeHighlight}>Register your shop</Text>
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ================== REGISTER SHOP 2-STEP WIZARD ================== */
              <>
                {/* Value Banner */}
                <View style={styles.partnerBanner}>
                  <Sparkles size={14} color={Palette.saffron.DEFAULT} />
                  <Text style={styles.partnerBannerText}>
                    Zero Commission • Instant WiFi Printing • Online UPI
                  </Text>
                </View>

                {/* Visual Step Progress Indicator */}
                <View style={styles.stepperContainer}>
                  <View style={styles.stepperPillsRow}>
                    <TouchableOpacity
                      style={[styles.stepPill, signupStep === 1 && styles.stepPillActive]}
                      onPress={() => {
                        setSignupStep(1);
                        setError(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.stepNumberBadge, signupStep === 1 && styles.stepNumberBadgeActive]}>
                        <Text style={[styles.stepNumberText, signupStep === 1 && styles.stepNumberTextActive]}>
                          1
                        </Text>
                      </View>
                      <Text style={[styles.stepPillLabel, signupStep === 1 && styles.stepPillLabelActive]}>
                        Shop Profile
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.stepperArrow}>
                      <ArrowRight size={14} color={Palette.ink.muted} />
                    </View>

                    <TouchableOpacity
                      style={[styles.stepPill, signupStep === 2 && styles.stepPillActive]}
                      onPress={() => {
                        if (vendorName.trim() && vendorSlug.trim() && address.trim()) {
                          setSignupStep(2);
                          setError(null);
                        } else {
                          handleStep1Next();
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.stepNumberBadge, signupStep === 2 && styles.stepNumberBadgeActive]}>
                        <Text style={[styles.stepNumberText, signupStep === 2 && styles.stepNumberTextActive]}>
                          2
                        </Text>
                      </View>
                      <Text style={[styles.stepPillLabel, signupStep === 2 && styles.stepPillLabelActive]}>
                        Owner Details
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.stepperArrow}>
                      <ArrowRight size={14} color={Palette.ink.muted} />
                    </View>

                    <View
                      style={[styles.stepPill, signupStep === 3 && styles.stepPillActive]}
                    >
                      <View style={[styles.stepNumberBadge, signupStep === 3 && styles.stepNumberBadgeActive]}>
                        <Text style={[styles.stepNumberText, signupStep === 3 && styles.stepNumberTextActive]}>
                          3
                        </Text>
                      </View>
                      <Text style={[styles.stepPillLabel, signupStep === 3 && styles.stepPillLabelActive]}>
                        Verify
                      </Text>
                    </View>
                  </View>
                </View>

                {error && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={16} color={Palette.danger.DEFAULT} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {signupStep === 1 ? (
                  /* --- STEP 1: SHOP PROFILE --- */
                  <>
                    <View style={styles.stepHeader}>
                      <Text style={styles.cardTitle}>Shop Details</Text>
                      <Text style={styles.cardSubtitle}>
                        Set your store name, customer URL, and physical address.
                      </Text>
                    </View>

                    {/* Shop Name */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Store Name <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <View style={styles.inputWrapper}>
                        <Store size={18} color={Palette.saffron.DEFAULT} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={vendorName}
                          onChangeText={handleVendorNameChange}
                          placeholder="e.g. Apex Xerox & Digital Prints"
                          placeholderTextColor={Palette.ink.muted}
                          autoCapitalize="words"
                          autoCorrect={false}
                        />
                      </View>
                    </View>

                    {/* Shop URL Handle */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Customer Web Link Handle <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <View style={styles.inputWrapper}>
                        <Globe size={18} color={Palette.saffron.DEFAULT} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={vendorSlug}
                          onChangeText={handleSlugChange}
                          placeholder="e.g. apex-prints"
                          placeholderTextColor={Palette.ink.muted}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>

                      {/* Live URL Pill Preview */}
                      <View style={styles.urlPreviewPill}>
                        <Text style={styles.urlPreviewPrefix}>print2me.in/v/</Text>
                        <Text style={styles.urlPreviewSlug}>
                          {vendorSlug || 'your-shop'}
                        </Text>
                        {vendorSlug.length >= 3 && (
                          <View style={styles.urlReadyBadge}>
                            <CheckCircle2 size={12} color={Palette.success.DEFAULT} />
                            <Text style={styles.urlReadyText}>Ready</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Shop Physical Address */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Shop Physical Address <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <View style={[styles.inputWrapper, { alignItems: 'flex-start', paddingTop: 10 }]}>
                        <MapPin size={18} color={Palette.saffron.DEFAULT} style={[styles.inputIcon, { marginTop: 2 }]} />
                        <TextInput
                          style={[styles.input, { minHeight: 46 }]}
                          value={address}
                          onChangeText={setAddress}
                          placeholder="Shop #, Building/Campus Market, Street, City"
                          placeholderTextColor={Palette.ink.muted}
                          multiline
                          numberOfLines={2}
                          autoCapitalize="sentences"
                        />
                      </View>
                    </View>

                    {/* Next Step Button */}
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={handleStep1Next}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.primaryBtnText}>Continue to Owner Details</Text>
                      <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  </>
                ) : signupStep === 2 ? (
                  /* --- STEP 2: OWNER & CREDENTIALS --- */
                  <>
                    <View style={styles.stepHeader}>
                      <Text style={styles.cardTitle}>Owner & Login</Text>
                      <Text style={styles.cardSubtitle}>
                        Create your partner account to manage queues and payouts.
                      </Text>
                    </View>

                    {/* Owner Name */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Owner Full Name <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <View style={styles.inputWrapper}>
                        <User size={18} color={Palette.saffron.DEFAULT} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={fullName}
                          onChangeText={setFullName}
                          placeholder="e.g. Rahul Sharma"
                          placeholderTextColor={Palette.ink.muted}
                          autoCapitalize="words"
                          autoCorrect={false}
                        />
                      </View>
                    </View>

                    {/* Email Address */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Email Address <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <View style={styles.inputWrapper}>
                        <Mail size={18} color={Palette.saffron.DEFAULT} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={signupEmail}
                          onChangeText={setSignupEmail}
                          placeholder="owner@printshop.in"
                          placeholderTextColor={Palette.ink.muted}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>

                    {/* Contact Phone */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Contact Mobile Number <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <View style={styles.inputWrapper}>
                        <View style={styles.phoneCodePrefix}>
                          <Text style={styles.phoneCodeText}>🇮🇳 +91</Text>
                        </View>
                        <TextInput
                          style={styles.input}
                          value={signupPhone}
                          onChangeText={setSignupPhone}
                          placeholder="98765 43210"
                          placeholderTextColor={Palette.ink.muted}
                          keyboardType="phone-pad"
                          maxLength={12}
                        />
                      </View>
                    </View>

                    {/* Password */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        Create Password <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <View style={styles.inputWrapper}>
                        <Lock size={18} color={Palette.saffron.DEFAULT} style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, { paddingRight: 40 }]}
                          value={signupPassword}
                          onChangeText={setSignupPassword}
                          placeholder="At least 8 characters"
                          placeholderTextColor={Palette.ink.muted}
                          secureTextEntry={!showSignupPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TouchableOpacity
                          style={styles.eyeBtn}
                          onPress={() => setShowSignupPassword(!showSignupPassword)}
                        >
                          {showSignupPassword ? (
                            <EyeOff size={18} color={Palette.ink.muted} />
                          ) : (
                            <Eye size={18} color={Palette.ink.muted} />
                          )}
                        </TouchableOpacity>
                      </View>

                      {/* Password check hint */}
                      <View style={styles.passwordHintRow}>
                        <ShieldCheck
                          size={13}
                          color={signupPassword.length >= 8 ? Palette.success.DEFAULT : Palette.ink.muted}
                        />
                        <Text
                          style={[
                            styles.passwordHintText,
                            signupPassword.length >= 8 && { color: Palette.success.DEFAULT, fontWeight: '700' },
                          ]}
                        >
                          {signupPassword.length >= 8
                            ? 'Password length looks good!'
                            : 'Must be at least 8 characters'}
                        </Text>
                      </View>
                    </View>

                    {/* Continue to Verification Button */}
                    <TouchableOpacity
                      style={[styles.primaryBtn, loading && styles.btnDisabled]}
                      onPress={handleStep2Next}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryBtnText}>
                          Continue to Email Verification ✉️
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* Back to Step 1 */}
                    <TouchableOpacity
                      style={styles.backStepBtn}
                      onPress={() => {
                        setSignupStep(1);
                        setError(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <ArrowLeft size={15} color={Palette.ink.soft} />
                      <Text style={styles.backStepText}>Back to Shop Details</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  /* --- STEP 3: EMAIL VERIFICATION --- */
                  <>
                    <View style={styles.stepHeader}>
                      <Text style={styles.cardTitle}>Verify Your Email</Text>
                      <Text style={styles.cardSubtitle}>
                        We sent a 6-digit verification code to{' '}
                        <Text style={{ fontWeight: '700', color: Palette.ink.DEFAULT }}>
                          {signupEmail}
                        </Text>
                      </Text>
                    </View>

                    {/* OTP Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        6-Digit Verification Code <Text style={styles.requiredStar}>*</Text>
                      </Text>
                      <View style={styles.inputWrapper}>
                        <KeyRound size={18} color={Palette.saffron.DEFAULT} style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, styles.otpInput]}
                          placeholder="••••••"
                          placeholderTextColor={Palette.ink.muted}
                          value={signupOtp}
                          onChangeText={(t) => setSignupOtp(t.replace(/\D/g, '').slice(0, 6))}
                          keyboardType="number-pad"
                          maxLength={6}
                          autoFocus
                        />
                      </View>
                    </View>

                    {/* Resend Code row */}
                    <View style={styles.resendRow}>
                      <Text style={styles.resendText}>Didn't receive the code? </Text>
                      {resendTimer > 0 ? (
                        <Text style={styles.resendTimerText}>Resend in {resendTimer}s</Text>
                      ) : (
                        <TouchableOpacity onPress={handleResendOtp} disabled={isResending}>
                          <Text style={styles.resendBtnText}>Resend Code</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Submit Registration Button */}
                    <TouchableOpacity
                      style={[styles.primaryBtn, (loading || signupOtp.length !== 6) && styles.btnDisabled]}
                      onPress={handleRegister}
                      disabled={loading || signupOtp.length !== 6}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryBtnText}>
                          Verify & Launch Store 🚀
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* Back to Step 2 */}
                    <TouchableOpacity
                      style={styles.backStepBtn}
                      onPress={() => {
                        setSignupStep(2);
                        setError(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <ArrowLeft size={15} color={Palette.ink.soft} />
                      <Text style={styles.backStepText}>Back to Owner Details</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Footer Switch to Sign In */}
                <TouchableOpacity
                  style={styles.switchModeLink}
                  onPress={() => {
                    setAuthMode('signin');
                    setError(null);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchModeText}>
                    Already registered?{' '}
                    <Text style={styles.switchModeHighlight}>Sign in here</Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.paper,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 80,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Palette.saffron.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: Palette.ink.DEFAULT,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: Palette.ink.soft,
    marginTop: 2,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    padding: 4,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: Palette.saffron.DEFAULT,
    ...Shadows.soft,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.ink.soft,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: Palette.hairline,
    ...Shadows.card,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Palette.ink.DEFAULT,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Palette.ink.soft,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.saffron.tint,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Palette.saffron.DEFAULT + '25',
  },
  partnerBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.saffron.DEFAULT,
    flex: 1,
  },
  stepperContainer: {
    marginBottom: 18,
  },
  stepperPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.paper,
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  stepPillActive: {
    backgroundColor: Palette.surface,
    ...Shadows.soft,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.hairline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberBadgeActive: {
    backgroundColor: Palette.saffron.DEFAULT,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.ink.soft,
  },
  stepNumberTextActive: {
    color: '#FFFFFF',
  },
  stepPillLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.ink.soft,
  },
  stepPillLabelActive: {
    color: Palette.ink.DEFAULT,
    fontWeight: '800',
  },
  stepperArrow: {
    paddingHorizontal: 4,
  },
  stepHeader: {
    marginBottom: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.danger.tint,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Palette.danger.DEFAULT + '20',
  },
  errorText: {
    fontSize: 13,
    color: Palette.danger.DEFAULT,
    flex: 1,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.ink.DEFAULT,
    marginBottom: 6,
  },
  requiredStar: {
    color: Palette.danger.DEFAULT,
    fontWeight: '900',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Palette.hairline,
    borderRadius: 14,
    backgroundColor: Palette.paper,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: Palette.ink.DEFAULT,
  },
  urlPreviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.paper,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  urlPreviewPrefix: {
    fontSize: 12,
    color: Palette.ink.muted,
    fontWeight: '500',
  },
  urlPreviewSlug: {
    fontSize: 12,
    color: Palette.saffron.DEFAULT,
    fontWeight: '800',
    flex: 1,
  },
  urlReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.success.tint,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  urlReadyText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.success.DEFAULT,
  },
  phoneCodePrefix: {
    marginRight: 6,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: Palette.hairline,
  },
  phoneCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.ink.DEFAULT,
  },
  passwordHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginLeft: 4,
  },
  passwordHintText: {
    fontSize: 11,
    color: Palette.ink.muted,
  },
  eyeBtn: {
    padding: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: Palette.saffron.DEFAULT,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...Shadows.soft,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    marginTop: 6,
  },
  backStepText: {
    fontSize: 13,
    color: Palette.ink.soft,
    fontWeight: '600',
  },
  switchModeLink: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchModeText: {
    fontSize: 13,
    color: Palette.ink.soft,
    fontWeight: '500',
  },
  switchModeHighlight: {
    color: Palette.saffron.DEFAULT,
    fontWeight: '700',
  },
  otpInput: {
    fontSize: 22,
    letterSpacing: 6,
    textAlign: 'center',
    fontWeight: '800',
    color: Palette.saffron.DEFAULT,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
    gap: 4,
  },
  resendText: {
    fontSize: 12,
    color: Palette.ink.muted,
  },
  resendBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.saffron.DEFAULT,
  },
  resendTimerText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.ink.soft,
  },
});
