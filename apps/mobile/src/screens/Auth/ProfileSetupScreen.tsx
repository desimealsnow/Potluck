import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../config/supabaseClient";
import { apiClient } from "../../services/apiClient";
import * as Location from "expo-location";

interface ProfileSetupScreenProps {
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Profile setup screen component for user profile configuration.
 *
 * This component manages the multi-step process of setting up a user profile, including entering a display name, selecting a location, and specifying meal preferences. It handles user input, fetches city suggestions, and manages state transitions between steps. The component also provides functionality to save user data and handle errors during the setup process.
 *
 * @param {ProfileSetupScreenProps} props - The properties for the ProfileSetupScreen component.
 * @param {function} props.onComplete - Callback function to be called upon successful completion of the profile setup.
 * @param {function} props.onSkip - Callback function to be called when the user opts to skip the setup process.
 * @returns {JSX.Element} The rendered ProfileSetupScreen component.
 */
export default function ProfileSetupScreen({ onComplete, onSkip }: ProfileSetupScreenProps) {
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [radiusKm, setRadiusKm] = useState("25");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Profile, 2: Location, 3: Meal Preferences, 4: Completion
  const [citySuggestions, setCitySuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [hasExistingLocation, setHasExistingLocation] = useState(false);
  const [mealPreferences, setMealPreferences] = useState<string[]>([]);

  // Debug function to clear user data for testing
  /**
   * Clears user data and resets the setup flag for testing purposes.
   *
   * This function updates the user's metadata in Supabase by setting the display_name and meal_preferences to null.
   * It then retrieves the current user and, if a valid user ID is found, updates the user_profiles table to reset
   * the setup_completed flag to false. Any errors encountered during the process are logged to the console.
   */
  const clearUserDataForTesting = async () => {
    try {
      // Clear user metadata
      await supabase.auth.updateUser({
        data: { display_name: null, meal_preferences: null }
      });

      // Reset setup_completed flag in database
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.id) {
        await supabase
          .from('user_profiles')
          .update({ setup_completed: false })
          .eq('user_id', currentUser.id);
      }

      console.log('User data and setup flag cleared for testing');
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  };

  // Make debug function available globally for testing
  if (typeof window !== 'undefined') {
    (window as any).clearUserDataForTesting = clearUserDataForTesting;
  }

  /**
   * Handles the profile setup by validating the display name and moving to the next step.
   */
  const handleProfileSetup = async () => {
    if (!displayName.trim()) {
      Alert.alert("Required Field", "Please enter your display name");
      return;
    }

    // Just move to next step, don't save yet
    setStep(2);
  };

  // Check if user already has location setup (only when user manually goes to step 2)
  const checkExistingLocation = useCallback(async () => {
    try {
      const response = await apiClient.get('/user-location/me/location');
      if (response && (response as any).city) {
        setHasExistingLocation(true);
        setCity((response as any).city);
        // If user already has location, skip to step 3
        setStep(3);
      }
    } catch (error) {
      // No existing location or API error, continue with setup
      console.log('No existing location found or API error:', error);
    }
  }, []);

  // Fetch city suggestions
  const fetchCitySuggestions = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setCitySuggestions([]);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm.trim())}&addressdetails=0&limit=5`
      );
      const data = await response.json();
      if (Array.isArray(data)) {
        setCitySuggestions(data.map((item: any) => ({
          display_name: item.display_name,
          lat: item.lat,
          lon: item.lon
        })));
      } else {
        setCitySuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching city suggestions:', error);
      setCitySuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced city search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const handleCityChange = useCallback((text: string) => {
    setCity(text);
    setCitySuggestions([]);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (text.trim()) {
        fetchCitySuggestions(text);
      }
    }, 300);
    
    setSearchTimeout(timeout);
  }, [fetchCitySuggestions, searchTimeout]);

  /**
   * Handles the setup of location services and permissions.
   *
   * This function requests location permissions from the user and, if granted, retrieves the current location.
   * It attempts to reverse geocode the location to obtain a city name, using a fallback if the city name is not provided.
   * The location data is stored locally, and the loading state is managed throughout the process.
   * Errors during the process are caught and displayed to the user.
   *
   * @returns {Promise<void>} A promise that resolves when the location setup is complete.
   * @throws {Error} If there is an issue with location permissions or fetching the location.
   */
  const handleLocationSetup = async () => {
    setLoading(true);
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          "Location Permission Required",
          "Location access is needed to find nearby events and help others discover your events. You can enable this later in settings.",
          [
            { text: "Skip for Now", onPress: () => setStep(3) },
            { text: "Try Again", onPress: () => handleLocationSetup() }
          ]
        );
        return;
      }

      // Get current location
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      // Use selected city or reverse geocode
      let cityName = city;
      if (!cityName) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          );
          const data = await response.json();
          cityName = data.display_name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        } catch (error) {
          cityName = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        }
      }

      // Store location data locally for now, don't save yet
      setCity(cityName);

      // Don't auto-advance - let user click Continue
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to set up location");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Moves to the next step (meal preferences).
   */
  const handleLocationContinue = () => {
    // Move to next step (meal preferences)
    setStep(3);
  };

  /**
   * Moves to the completion step.
   */
  const handleMealPreferences = () => {
    // Move to completion step
    setStep(4);
  };

  /**
   * Decreases the step by one if it is greater than one.
   */
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  /**
   * Toggles the specified meal preference in the state.
   */
  const toggleMealPreference = (preference: string) => {
    setMealPreferences(prev => 
      prev.includes(preference) 
        ? prev.filter(p => p !== preference)
        : [...prev, preference]
    );
  };

  /**
   * Handles the completion of a save process.
   *
   * This function sets a loading state to true, initiates the save process by calling
   * saveAllData, and handles success or failure of the operation. Upon successful save,
   * it invokes the onComplete callback. In case of an error, it logs the error and
   * displays an alert with the error message. Finally, it ensures the loading state is
   * reset to false.
   */
  const handleComplete = async () => {
    setLoading(true);
    try {
      console.log("Starting save process...");
      // Save all data at the end
      await saveAllData();
      console.log("Save completed successfully");
      console.log("Calling onComplete...");
      onComplete();
      console.log("onComplete called successfully");
    } catch (error: any) {
      console.error("Save failed:", error);
      Alert.alert("Error", error.message || "Failed to save data");
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  };

  /**
   * Handles the skip action by saving minimal data and updating the loading state.
   *
   * This function sets the loading state to true, attempts to save minimal data using
   * the saveMinimalData function, and calls the onSkip function upon success. If an error
   * occurs during the save process, it displays an alert with the error message. Finally,
   * it ensures that the loading state is set back to false regardless of the outcome.
   */
  const handleSkip = async () => {
    setLoading(true);
    try {
      // Save minimal data when skipping
      await saveMinimalData();
      onSkip();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save data");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save minimal user data, including display name and profile completion status.
   *
   * The function checks if a display name is provided and updates the user's display name in Supabase.
   * It then creates or updates a minimal user profile in the 'user_profiles' table, marking the setup as completed.
   * If no display name is provided, it still marks the setup as completed to prevent showing the setup again.
   *
   * @throws Error If there is an error updating the user's display name or creating the user profile.
   */
  const saveMinimalData = async () => {
    // Only save display name if provided
    if (displayName.trim()) {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() }
      });

      if (updateError) {
        throw updateError;
      }

      // Create minimal user profile
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.id) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: currentUser.id,
            display_name: displayName.trim(),
            setup_completed: true, // Mark setup as completed even when skipping
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (profileError) {
          console.warn("Profile creation failed:", profileError);
        }
      }
    } else {
      // Even if no display name, mark setup as completed to avoid showing again
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.id) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: currentUser.id,
            setup_completed: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (profileError) {
          console.warn("Profile creation failed:", profileError);
        }
      }
    }
  };

  /**
   * Saves user profile data via a REST API.
   *
   * This function retrieves the current location if the city is provided and there is no existing location.
   * It then sends a POST request to the '/user-profile/setup' endpoint with the user's display name, meal preferences,
   * city, latitude, longitude, and discoverability radius. The function handles potential errors when fetching the
   * current location and logs the completion of the profile setup.
   */
  const saveAllData = async () => {
    console.log("Saving profile data via REST API...");
    
    // Get current location if we don't have coordinates
    let lat: number | undefined;
    let lon: number | undefined;

    if (city && !hasExistingLocation) {
      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        lat = position.coords.latitude;
        lon = position.coords.longitude;
      } catch (error) {
        console.warn('Could not get current location:', error);
      }
    }

    // Use our new REST endpoint
    const response = await apiClient.post('/user-profile/setup', {
      display_name: displayName.trim(),
      meal_preferences: mealPreferences,
      city: city,
      latitude: lat,
      longitude: lon,
      discoverability_radius_km: parseInt(radiusKm, 10)
    });

    console.log("Profile setup completed via REST API");
  };

  // Check for existing location only when user manually goes to step 2
  // (removed automatic call to prevent skipping)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  /**
   * Renders a back button using Pressable and Ionicons.
   */
  const renderBackButton = () => (
    <Pressable style={styles.backButton} onPress={handleBack}>
      <Ionicons name="arrow-back" size={24} color="white" />
    </Pressable>
  );

  /**
   * Renders the first step of the profile setup process.
   *
   * This function displays a user interface for setting up a profile, including a back button if the step is greater than 1.
   * It prompts the user to enter their display name and provides a button to continue, which is disabled until a valid display name is entered.
   * The button's appearance changes based on the loading state and the validity of the input.
   */
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      {step > 1 && renderBackButton()}
      <View style={styles.iconContainer}>
        <Ionicons name="person-circle" size={80} color="#fff" />
      </View>
      <Text style={styles.stepTitle}>Set Up Your Profile</Text>
      <Text style={styles.stepDescription}>
        Let others know who you are and help them find your events
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Display Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your display name"
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      <Pressable
        style={[styles.button, !displayName.trim() && styles.buttonDisabled]}
        onPress={handleProfileSetup}
        disabled={!displayName.trim() || loading}
      >
        <LinearGradient
          colors={displayName.trim() ? ["#7C5CFF", "#2FB4FF"] : ["rgba(255,255,255,0.3)", "rgba(255,255,255,0.2)"]}
          style={styles.buttonGradient}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );

  /**
   * Renders the second step of the location setup process.
   *
   * This function checks if the user already has a location set up. If so, it displays a completion message.
   * If not, it presents options to enable location services, including input fields for city and discovery radius,
   * as well as buttons for enabling location and continuing to the next step. It also handles city suggestions
   * based on user input and manages loading states during the location setup process.
   */
  const renderStep2 = () => {
    // If user already has location setup, show completion message
    if (hasExistingLocation) {
      return (
        <View style={styles.stepContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          </View>
          <Text style={styles.stepTitle}>Location Already Set Up!</Text>
          <Text style={styles.stepDescription}>
            Your location is already configured: {city}
          </Text>

          <Pressable
            style={styles.button}
            onPress={() => setStep(3)}
          >
            <LinearGradient
              colors={["#4CAF50", "#45A049"]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.stepContainer}>
        {step > 1 && renderBackButton()}
        <View style={styles.iconContainer}>
          <Ionicons name="location" size={80} color="#fff" />
        </View>
        <Text style={styles.stepTitle}>Enable Location Services</Text>
        <Text style={styles.stepDescription}>
          Help us find nearby events and let others discover your events
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>City (Optional)</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.input}
              placeholder="Search for your city..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={city}
              onChangeText={handleCityChange}
              autoCapitalize="words"
            />
            {searching && (
              <View style={styles.searchingIndicator}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </View>

          {/* City Suggestions */}
          {citySuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {citySuggestions.map((suggestion, index) => (
                <Pressable
                  key={`${suggestion.lat}-${suggestion.lon}-${index}`}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setCity(suggestion.display_name);
                    setCitySuggestions([]);
                  }}
                >
                  <Ionicons name="location-outline" size={16} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {suggestion.display_name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Discovery Radius (km)</Text>
          <TextInput
            style={styles.input}
            placeholder="25"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={radiusKm}
            onChangeText={setRadiusKm}
            keyboardType="numeric"
          />
        </View>

        <Pressable
          style={styles.button}
          onPress={handleLocationSetup}
          disabled={loading}
        >
          <LinearGradient
            colors={["#7C5CFF", "#2FB4FF"]}
            style={styles.buttonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Enable Location</Text>
            )}
          </LinearGradient>
        </Pressable>

        {city && (
          <Pressable
            style={styles.button}
            onPress={handleLocationContinue}
          >
            <LinearGradient
              colors={["#4CAF50", "#45A049"]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </LinearGradient>
          </Pressable>
        )}

        <Pressable
          style={styles.skipButton}
          onPress={() => setStep(3)}
        >
          <Text style={styles.skipButtonText}>Skip for Now</Text>
        </Pressable>
      </View>
    );
  };

  /**
   * Renders the meal preferences selection step in the user interface.
   *
   * This function displays a view containing a title, description, and a list of dietary preferences.
   * Users can select their preferences, which are visually indicated. The function also includes a
   * button to continue to the next step, invoking the handleMealPreferences function upon pressing it.
   * The renderBackButton function is conditionally called based on the current step.
   */
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      {step > 1 && renderBackButton()}
      <View style={styles.iconContainer}>
        <Ionicons name="restaurant" size={80} color="#FF6B6B" />
      </View>
      <Text style={styles.stepTitle}>Meal Preferences</Text>
      <Text style={styles.stepDescription}>
        Help us suggest better events by sharing your dietary preferences.
      </Text>

      <View style={styles.preferencesContainer}>
        {[
          "Vegetarian",
          "Vegan", 
          "Gluten-Free",
          "Dairy-Free",
          "Nut-Free",
          "Halal",
          "Kosher",
          "No Spicy Food"
        ].map((preference) => (
          <Pressable
            key={preference}
            style={[
              styles.preferenceItem,
              mealPreferences.includes(preference) && styles.preferenceItemSelected
            ]}
            onPress={() => toggleMealPreference(preference)}
          >
            <Text style={[
              styles.preferenceText,
              mealPreferences.includes(preference) && styles.preferenceTextSelected
            ]}>
              {preference}
            </Text>
            {mealPreferences.includes(preference) && (
              <Ionicons name="checkmark" size={20} color="#fff" />
            )}
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.button}
        onPress={handleMealPreferences}
      >
        <LinearGradient
          colors={["#FF6B6B", "#FF5252"]}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  /**
   * Renders the fourth step of the profile setup, including a save button and preferences review.
   */
  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      {step > 1 && renderBackButton()}
      <View style={styles.iconContainer}>
        <Ionicons name="save" size={80} color="#fff" />
      </View>
      <Text style={styles.stepTitle}>Save Your Preferences</Text>
      <Text style={styles.stepDescription}>
        Review your settings and save them to complete your profile setup.
      </Text>

      <Pressable
        style={styles.button}
        onPress={handleComplete}
        disabled={loading}
      >
        <LinearGradient
          colors={["#7C5CFF", "#2FB4FF"]}
          style={styles.buttonGradient}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Save Preferences</Text>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );

  return (
    <LinearGradient colors={["#5A60F6", "#3C8CE7", "#00B8D4"]} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.content}>
              {/* Progress Indicator */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
                <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
                <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
                <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
                <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]} />
                <View style={[styles.progressLine, step >= 4 && styles.progressLineActive]} />
                <View style={[styles.progressDot, step >= 4 && styles.progressDotActive]} />
              </View>

              {/* Step Content */}
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}

              {/* Skip Button (only on first three steps) */}
              {step < 4 && (
                <Pressable style={styles.skipAllButton} onPress={handleSkip}>
                  <Text style={styles.skipAllButtonText}>Skip Setup</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  progressDotActive: {
    backgroundColor: "#fff",
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: "#fff",
  },
  stepContainer: {
    alignItems: "center",
    width: "100%",
  },
  iconContainer: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: "white",
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    padding: 16,
    color: "white",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  button: {
    width: "100%",
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  skipButton: {
    marginTop: 8,
  },
  skipButtonText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "center",
  },
  skipAllButton: {
    marginTop: 32,
  },
  skipAllButtonText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  searchContainer: {
    position: "relative",
  },
  searchingIndicator: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  suggestionsContainer: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  suggestionText: {
    color: "white",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  preferencesContainer: {
    width: "100%",
    marginBottom: 32,
  },
  preferenceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  preferenceItemSelected: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF5252",
  },
  preferenceText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  preferenceTextSelected: {
    color: "white",
    fontWeight: "600",
  },
  backButton: {
    position: "absolute",
    top: 0,
    left: 0,
    padding: 12,
    zIndex: 1,
  },
});
