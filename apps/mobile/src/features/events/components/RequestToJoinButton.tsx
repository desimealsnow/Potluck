import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  StyleSheet, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { useEventAvailability, useCreateJoinRequest } from '@/hooks/useJoinRequests';
import { apiClient } from '@/services/apiClient';

interface RequestToJoinButtonProps {
  eventId: string;
  eventTitle?: string;
  onRequestCreated?: () => void;
  disabled?: boolean;
}

export default function RequestToJoinButton({ 
  eventId, 
  eventTitle = 'this event',
  onRequestCreated,
  disabled = false 
}: RequestToJoinButtonProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [partySize, setPartySize] = useState('1');
  const [note, setNote] = useState('');
  
  const { availability } = useEventAvailability(eventId);
  const { createRequest, creating } = useCreateJoinRequest(eventId);
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const prof = await apiClient.get<any>('/user-profile/me');
        setPhoneVerified(Boolean(prof?.phone_verified));
      } catch {
        setPhoneVerified(null);
      }
    })();
  }, []);

  const canRequest = availability && availability.available > 0 && !disabled;
  
  // Debug logging
  console.log('RequestToJoinButton Debug:', {
    eventId,
    availability,
    canRequest,
    disabled,
    phoneVerified,
    creating
  });
  
  const handleSubmitRequest = async () => {
    const parsedPartySize = parseInt(partySize, 10);
    
    if (isNaN(parsedPartySize) || parsedPartySize < 1) {
      Alert.alert('Invalid Input', 'Party size must be at least 1.');
      return;
    }

    if (availability && parsedPartySize > availability.available) {
      Alert.alert(
        'Not Enough Capacity', 
        `Only ${availability.available} spots available, but you requested ${parsedPartySize}.`
      );
      return;
    }

    const request = await createRequest({
      party_size: parsedPartySize,
      note: note.trim() || undefined,
    });

    if (request) {
      setModalVisible(false);
      setPartySize('1');
      setNote('');
      onRequestCreated?.();
    }
  };

  if (!canRequest) {
    return (
      <TouchableOpacity style={[styles.button, styles.disabledButton]} disabled>
        <Text style={styles.disabledButtonText}>
          {availability?.available === 0 ? 'Event Full' : 'Request to Join'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity 
        style={styles.button} 
        onPress={async () => {
          console.log('RequestToJoinButton pressed!', { phoneVerified, canRequest, creating });
          if (phoneVerified === false) {
            Alert.alert('Verify Phone', 'Please verify your phone number in Settings > User Preferences before requesting to join.');
            return;
          }
          setModalVisible(true);
        }}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Request to Join</Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request to Join {eventTitle}</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Party Size *</Text>
              <TextInput
                style={styles.input}
                value={partySize}
                onChangeText={setPartySize}
                keyboardType="number-pad"
                placeholder="How many people?"
                maxLength={2}
              />
              <Text style={styles.hint}>
                {availability ? `${availability.available} spots available` : ''}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Message to Host (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={note}
                onChangeText={setNote}
                placeholder="Any special requests or notes..."
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.submitButton]} 
                onPress={handleSubmitRequest}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
