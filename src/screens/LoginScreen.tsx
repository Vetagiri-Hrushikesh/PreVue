import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  Facebook,
  Google,
  Eye,
  EyeSlash,
} from 'iconsax-react-nativejs';
import Icon from 'react-native-vector-icons/FontAwesome';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Colors } from '../constants/colors';
import useAuth from '../hooks/useAuth';
import GuestGuard from '../components/GuestGuard';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  const [email, setEmail] = useState('owner@maigha.com');
  const [password, setPassword] = useState('Owner@123');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, loading } = useAuth();
  const scriptedRef = useRef(true);

  const handleLogin = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      const trimmedEmail = email.trim();
      await login(trimmedEmail, password);

      if (scriptedRef.current) {
        // If we were sent here due to a deep link, redirect to the target screen.
        const redirectTo = route.params?.redirectTo;
        const redirectParams = route.params?.redirectParams;

        if (redirectTo === 'Preview' && redirectParams) {
          navigation.replace('Preview', redirectParams);
        } else {
          // Default behaviour: go to main application tabs.
          navigation.replace('MainTabs');
        }
      }
    } catch (err: any) {
      console.error(err);
      if (scriptedRef.current) {
        setError(err.message || 'Login failed');
        Alert.alert('Login Failed', err.message || 'An error occurred during login');
      }
    } finally {
      if (scriptedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert(`${provider} Login`, `${provider} login functionality would be implemented here`);
  };

  return (
    <GuestGuard>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.brandName}>
              Pre<Text style={styles.brandPro}>Vue</Text>
            </Text>
          </View>

          {/* Social Login Buttons */}
          <View style={styles.socialContainer}>
            <Pressable
              style={styles.socialButton}
              onPress={() => handleSocialLogin('Facebook')}
            >
              <Facebook size={20} color={Colors.facebook} />
              <Text style={styles.socialButtonText}>Sign In With Facebook</Text>
            </Pressable>

            <Pressable
              style={styles.socialButton}
              onPress={() => handleSocialLogin('GitHub')}
            >
              <Icon name="github" size={20} color={Colors.github} />
              <Text style={styles.socialButtonText}>Sign In With GitHub</Text>
            </Pressable>

            <Pressable
              style={styles.socialButton}
              onPress={() => handleSocialLogin('Google')}
            >
              <Google size={20} color={Colors.google} />
              <Text style={styles.socialButtonText}>Sign In With Google</Text>
            </Pressable>
          </View>

          {/* Separator */}
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>OR</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Login Form Header */}
          <View style={styles.formHeader}>
            <Text style={styles.loginTitle}>Login</Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? (
                  <EyeSlash size={20} color={Colors.textSecondary} />
                ) : (
                  <Eye size={20} color={Colors.textSecondary} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            <Pressable
              style={styles.checkboxContainer}
              onPress={() => setKeepSignedIn(!keepSignedIn)}
            >
              <View style={[styles.checkbox, keepSignedIn && styles.checkboxChecked]}>
                {keepSignedIn && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>Keep me sign in</Text>
            </Pressable>
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Login Button */}
          <Pressable 
            style={[styles.loginButton, (isSubmitting || loading?.login) && styles.loginButtonDisabled]} 
            onPress={handleLogin}
            disabled={isSubmitting || loading?.login}
          >
            <Text style={styles.loginButtonText}>
              {isSubmitting || loading?.login ? 'Logging in...' : 'Login'}
            </Text>
          </Pressable>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GuestGuard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 10,
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  brandPro: {
    fontSize: 16,
    fontWeight: 'normal',
    color: Colors.primaryLight,
  },
  socialContainer: {
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray[100],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray[200],
  },
  separatorText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.gray[300],
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: Colors.gray[400],
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LoginScreen;