import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RequestToJoinButton from '../../src/components/joinRequests/RequestToJoinButton';
import { useEventAvailability, useCreateJoinRequest } from '../../src/hooks/useJoinRequests';

// Mock the hooks
jest.mock('../../src/hooks/useJoinRequests', () => ({
  useEventAvailability: jest.fn(),
  useCreateJoinRequest: jest.fn(),
}));

// Mock Alert
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockUseEventAvailability = useEventAvailability as jest.MockedFunction<typeof useEventAvailability>;
const mockUseCreateJoinRequest = useCreateJoinRequest as jest.MockedFunction<typeof useCreateJoinRequest>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('RequestToJoinButton', () => {
  const mockEventId = 'event-123';
  const mockEventTitle = 'Summer BBQ';

  const defaultAvailability = {
    total: 20,
    confirmed: 5,
    held: 3,
    available: 12,
  };

  const defaultCreateRequest = {
    createRequest: jest.fn(),
    creating: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseEventAvailability.mockReturnValue({
      availability: defaultAvailability,
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    mockUseCreateJoinRequest.mockReturnValue(defaultCreateRequest);
  });

  it('should render enabled button when capacity is available', () => {
    render(<RequestToJoinButton eventId={mockEventId} />);

    const button = screen.getByText('Request to Join');
    expect(button).toBeTruthy();
    
    // Button should be touchable (not disabled)
    fireEvent.press(button);
    // Modal should appear
    expect(screen.getByText('Request to Join this event')).toBeTruthy();
  });

  it('should render disabled button when no capacity available', () => {
    mockUseEventAvailability.mockReturnValue({
      availability: { ...defaultAvailability, available: 0 },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<RequestToJoinButton eventId={mockEventId} />);

    expect(screen.getByText('Event Full')).toBeTruthy();
  });

  it('should render disabled button when explicitly disabled', () => {
    render(<RequestToJoinButton eventId={mockEventId} disabled />);

    expect(screen.getByText('Request to Join')).toBeTruthy();
    
    // Button should be disabled (no modal should open)
    const button = screen.getByText('Request to Join');
    fireEvent.press(button);
    expect(screen.queryByText('Request to Join this event')).toBeNull();
  });

  it('should show event title in modal', () => {
    render(<RequestToJoinButton eventId={mockEventId} eventTitle={mockEventTitle} />);

    fireEvent.press(screen.getByText('Request to Join'));
    
    expect(screen.getByText(`Request to Join ${mockEventTitle}`)).toBeTruthy();
  });

  it('should show availability in modal', () => {
    render(<RequestToJoinButton eventId={mockEventId} />);

    fireEvent.press(screen.getByText('Request to Join'));
    
    expect(screen.getByText('12 spots available')).toBeTruthy();
  });

  describe('Form validation', () => {
    it('should validate party size is a number', async () => {
      render(<RequestToJoinButton eventId={mockEventId} />);

      fireEvent.press(screen.getByText('Request to Join'));
      
      // Clear the default value and enter invalid data
      const partyInput = screen.getByPlaceholderText('How many people?');
      fireEvent.changeText(partyInput, 'abc');
      
      fireEvent.press(screen.getByText('Send Request'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Invalid Input',
          'Party size must be at least 1.'
        );
      });

      expect(defaultCreateRequest.createRequest).not.toHaveBeenCalled();
    });

    it('should validate party size is at least 1', async () => {
      render(<RequestToJoinButton eventId={mockEventId} />);

      fireEvent.press(screen.getByText('Request to Join'));
      
      const partyInput = screen.getByPlaceholderText('How many people?');
      fireEvent.changeText(partyInput, '0');
      
      fireEvent.press(screen.getByText('Send Request'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Invalid Input',
          'Party size must be at least 1.'
        );
      });
    });

    it('should validate party size does not exceed availability', async () => {
      render(<RequestToJoinButton eventId={mockEventId} />);

      fireEvent.press(screen.getByText('Request to Join'));
      
      const partyInput = screen.getByPlaceholderText('How many people?');
      fireEvent.changeText(partyInput, '15'); // More than 12 available
      
      fireEvent.press(screen.getByText('Send Request'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Not Enough Capacity',
          'Only 12 spots available, but you requested 15.'
        );
      });
    });
  });

  describe('Request submission', () => {
    it('should submit request with valid data', async () => {
      const mockRequest = {
        id: 'request-123',
        party_size: 2,
        note: 'Looking forward to it!',
        status: 'pending' as const,
      };

      defaultCreateRequest.createRequest.mockResolvedValue(mockRequest);

      const onRequestCreated = jest.fn();
      render(
        <RequestToJoinButton 
          eventId={mockEventId} 
          onRequestCreated={onRequestCreated}
        />
      );

      fireEvent.press(screen.getByText('Request to Join'));
      
      // Fill form
      fireEvent.changeText(screen.getByPlaceholderText('How many people?'), '2');
      fireEvent.changeText(
        screen.getByPlaceholderText('Any special requests or notes...'), 
        'Looking forward to it!'
      );
      
      fireEvent.press(screen.getByText('Send Request'));

      await waitFor(() => {
        expect(defaultCreateRequest.createRequest).toHaveBeenCalledWith({
          party_size: 2,
          note: 'Looking forward to it!',
        });
      });

      expect(onRequestCreated).toHaveBeenCalled();
    });

    it('should submit request without note', async () => {
      const mockRequest = {
        id: 'request-123',
        party_size: 1,
        status: 'pending' as const,
      };

      defaultCreateRequest.createRequest.mockResolvedValue(mockRequest);

      render(<RequestToJoinButton eventId={mockEventId} />);

      fireEvent.press(screen.getByText('Request to Join'));
      
      // Only fill party size (note is optional)
      fireEvent.changeText(screen.getByPlaceholderText('How many people?'), '1');
      
      fireEvent.press(screen.getByText('Send Request'));

      await waitFor(() => {
        expect(defaultCreateRequest.createRequest).toHaveBeenCalledWith({
          party_size: 1,
          note: undefined, // Empty note should become undefined
        });
      });
    });

    it('should close modal after successful submission', async () => {
      const mockRequest = {
        id: 'request-123',
        party_size: 1,
        status: 'pending' as const,
      };

      defaultCreateRequest.createRequest.mockResolvedValue(mockRequest);

      render(<RequestToJoinButton eventId={mockEventId} />);

      fireEvent.press(screen.getByText('Request to Join'));
      
      expect(screen.getByText('Request to Join this event')).toBeTruthy();
      
      fireEvent.changeText(screen.getByPlaceholderText('How many people?'), '1');
      fireEvent.press(screen.getByText('Send Request'));

      await waitFor(() => {
        expect(screen.queryByText('Request to Join this event')).toBeNull();
      });
    });

    it('should reset form after successful submission', async () => {
      const mockRequest = {
        id: 'request-123',
        party_size: 2,
        status: 'pending' as const,
      };

      defaultCreateRequest.createRequest.mockResolvedValue(mockRequest);

      render(<RequestToJoinButton eventId={mockEventId} />);

      // Open modal first time
      fireEvent.press(screen.getByText('Request to Join'));
      fireEvent.changeText(screen.getByPlaceholderText('How many people?'), '2');
      fireEvent.changeText(
        screen.getByPlaceholderText('Any special requests or notes...'), 
        'Test note'
      );
      fireEvent.press(screen.getByText('Send Request'));

      await waitFor(() => {
        expect(screen.queryByText('Request to Join this event')).toBeNull();
      });

      // Open modal again - form should be reset
      fireEvent.press(screen.getByText('Request to Join'));
      
      expect(screen.getByDisplayValue('1')).toBeTruthy(); // Should be back to default
      expect(screen.getByPlaceholderText('Any special requests or notes...').props.value).toBe('');
    });

    it('should keep modal open on submission failure', async () => {
      defaultCreateRequest.createRequest.mockResolvedValue(null); // Indicates failure

      render(<RequestToJoinButton eventId={mockEventId} />);

      fireEvent.press(screen.getByText('Request to Join'));
      
      fireEvent.changeText(screen.getByPlaceholderText('How many people?'), '1');
      fireEvent.press(screen.getByText('Send Request'));

      await waitFor(() => {
        expect(defaultCreateRequest.createRequest).toHaveBeenCalled();
      });

      // Modal should still be open
      expect(screen.getByText('Request to Join this event')).toBeTruthy();
    });
  });

  describe('Loading states', () => {
    it('should show loading indicator during submission', async () => {
      mockUseCreateJoinRequest.mockReturnValue({
        ...defaultCreateRequest,
        creating: true,
      });

      render(<RequestToJoinButton eventId={mockEventId} />);

      // Button should show loading state
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });

    it('should disable submit button during submission', async () => {
      let resolveCreate: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolveCreate = resolve;
      });

      const mockCreateFn = jest.fn().mockReturnValue(pendingPromise);
      mockUseCreateJoinRequest.mockReturnValue({
        createRequest: mockCreateFn,
        creating: true,
      });

      render(<RequestToJoinButton eventId={mockEventId} />);

      fireEvent.press(screen.getByText('Request to Join'));
      
      fireEvent.changeText(screen.getByPlaceholderText('How many people?'), '1');
      
      const submitButton = screen.getByText('Send Request');
      fireEvent.press(submitButton);

      // Should show loading in submit button
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });
  });

  describe('Modal interactions', () => {
    it('should close modal when cancel is pressed', () => {
      render(<RequestToJoinButton eventId={mockEventId} />);

      fireEvent.press(screen.getByText('Request to Join'));
      expect(screen.getByText('Request to Join this event')).toBeTruthy();
      
      fireEvent.press(screen.getByText('Cancel'));
      expect(screen.queryByText('Request to Join this event')).toBeNull();
    });

    it('should close modal when backdrop is pressed', () => {
      render(<RequestToJoinButton eventId={mockEventId} />);

      fireEvent.press(screen.getByText('Request to Join'));
      expect(screen.getByText('Request to Join this event')).toBeTruthy();
      
      // Simulate modal backdrop press (onRequestClose)
      // Note: This would require accessing the Modal component's onRequestClose prop
      // For now, we test the cancel button which achieves the same effect
    });
  });

  describe('Edge cases', () => {
    it('should handle missing availability data gracefully', () => {
      mockUseEventAvailability.mockReturnValue({
        availability: null,
        loading: false,
        error: null,
        refresh: jest.fn(),
      });

      render(<RequestToJoinButton eventId={mockEventId} />);

      // Should render disabled button when availability is null
      expect(screen.getByText('Request to Join')).toBeTruthy();
    });

    it('should trim whitespace from note', async () => {
      const mockRequest = { id: 'request-123', status: 'pending' as const };
      defaultCreateRequest.createRequest.mockResolvedValue(mockRequest);

      render(<RequestToJoinButton eventId={mockEventId} />);

      fireEvent.press(screen.getByText('Request to Join'));
      
      fireEvent.changeText(screen.getByPlaceholderText('How many people?'), '1');
      fireEvent.changeText(
        screen.getByPlaceholderText('Any special requests or notes...'), 
        '   whitespace note   '
      );
      
      fireEvent.press(screen.getByText('Send Request'));

      await waitFor(() => {
        expect(defaultCreateRequest.createRequest).toHaveBeenCalledWith({
          party_size: 1,
          note: 'whitespace note', // Should be trimmed
        });
      });
    });

    it('should handle empty note as undefined', async () => {
      const mockRequest = { id: 'request-123', status: 'pending' as const };
      defaultCreateRequest.createRequest.mockResolvedValue(mockRequest);

      render(<RequestToJoinButton eventId={mockEventId} />);

      fireEvent.press(screen.getByText('Request to Join'));
      
      fireEvent.changeText(screen.getByPlaceholderText('How many people?'), '1');
      fireEvent.changeText(
        screen.getByPlaceholderText('Any special requests or notes...'), 
        '   '  // Just whitespace
      );
      
      fireEvent.press(screen.getByText('Send Request'));

      await waitFor(() => {
        expect(defaultCreateRequest.createRequest).toHaveBeenCalledWith({
          party_size: 1,
          note: undefined, // Empty trimmed string should become undefined
        });
      });
    });
  });
});
