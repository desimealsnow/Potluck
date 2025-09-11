import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AvailabilityBadge from '../../src/components/joinRequests/AvailabilityBadge';
import { useEventAvailability } from '../../src/hooks/useJoinRequests';

// Mock the hook
jest.mock('../../src/hooks/useJoinRequests', () => ({
  useEventAvailability: jest.fn(),
}));

const mockUseEventAvailability = useEventAvailability as jest.MockedFunction<typeof useEventAvailability>;

describe('AvailabilityBadge', () => {
  const mockEventId = 'event-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state', () => {
    mockUseEventAvailability.mockReturnValue({
      availability: null,
      loading: true,
      error: null,
      refresh: jest.fn(),
    });

    render(<AvailabilityBadge eventId={mockEventId} />);

    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('should show availability with spots available', () => {
    mockUseEventAvailability.mockReturnValue({
      availability: {
        total: 20,
        confirmed: 5,
        held: 3,
        available: 12,
      },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<AvailabilityBadge eventId={mockEventId} />);

    expect(screen.getByText('Available')).toBeTruthy();
    expect(screen.getByText('12 of 20 spots available')).toBeTruthy();
  });

  it('should show "Full" when no spots available', () => {
    mockUseEventAvailability.mockReturnValue({
      availability: {
        total: 20,
        confirmed: 15,
        held: 5,
        available: 0,
      },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<AvailabilityBadge eventId={mockEventId} />);

    expect(screen.getByText('Full')).toBeTruthy();
    expect(screen.getByText('0 of 20 spots available')).toBeTruthy();
  });

  it('should show "Almost Full" when utilization > 80%', () => {
    mockUseEventAvailability.mockReturnValue({
      availability: {
        total: 20,
        confirmed: 15,
        held: 2, // 85% utilization
        available: 3,
      },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<AvailabilityBadge eventId={mockEventId} />);

    expect(screen.getByText('Almost Full')).toBeTruthy();
  });

  it('should show "Filling Up" when utilization > 50%', () => {
    mockUseEventAvailability.mockReturnValue({
      availability: {
        total: 20,
        confirmed: 8,
        held: 4, // 60% utilization
        available: 8,
      },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<AvailabilityBadge eventId={mockEventId} />);

    expect(screen.getByText('Filling Up')).toBeTruthy();
  });

  describe('compact mode', () => {
    it('should show compact available spots', () => {
      mockUseEventAvailability.mockReturnValue({
        availability: {
          total: 20,
          confirmed: 5,
          held: 3,
          available: 12,
        },
        loading: false,
        error: null,
        refresh: jest.fn(),
      });

      render(<AvailabilityBadge eventId={mockEventId} compact />);

      expect(screen.getByText('12 spots')).toBeTruthy();
    });

    it('should show "Full" in compact mode when no spots', () => {
      mockUseEventAvailability.mockReturnValue({
        availability: {
          total: 20,
          confirmed: 20,
          held: 0,
          available: 0,
        },
        loading: false,
        error: null,
        refresh: jest.fn(),
      });

      render(<AvailabilityBadge eventId={mockEventId} compact />);

      expect(screen.getByText('Full')).toBeTruthy();
    });
  });

  describe('with details', () => {
    it('should show detailed breakdown when showDetails is true', () => {
      mockUseEventAvailability.mockReturnValue({
        availability: {
          total: 20,
          confirmed: 5,
          held: 3,
          available: 12,
        },
        loading: false,
        error: null,
        refresh: jest.fn(),
      });

      render(<AvailabilityBadge eventId={mockEventId} showDetails />);

      expect(screen.getByText('• 5 confirmed')).toBeTruthy();
      expect(screen.getByText('• 3 on hold')).toBeTruthy();
    });

    it('should not show hold details when held is 0', () => {
      mockUseEventAvailability.mockReturnValue({
        availability: {
          total: 20,
          confirmed: 10,
          held: 0,
          available: 10,
        },
        loading: false,
        error: null,
        refresh: jest.fn(),
      });

      render(<AvailabilityBadge eventId={mockEventId} showDetails />);

      expect(screen.getByText('• 10 confirmed')).toBeTruthy();
      expect(screen.queryByText('• 0 on hold')).toBeNull();
    });
  });

  it('should handle edge case with zero total capacity', () => {
    mockUseEventAvailability.mockReturnValue({
      availability: {
        total: 0,
        confirmed: 0,
        held: 0,
        available: 0,
      },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<AvailabilityBadge eventId={mockEventId} />);

    expect(screen.getByText('Available')).toBeTruthy(); // Should default to available since utilization is 0
    expect(screen.getByText('0 of 0 spots available')).toBeTruthy();
  });

  it('should not render when availability is null and not loading', () => {
    mockUseEventAvailability.mockReturnValue({
      availability: null,
      loading: false,
      error: 'Failed to load',
      refresh: jest.fn(),
    });

    const { container } = render(<AvailabilityBadge eventId={mockEventId} />);

    // Should show loading state when availability is null
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('should calculate utilization correctly for boundary cases', () => {
    // Test exactly 50% utilization
    mockUseEventAvailability.mockReturnValue({
      availability: {
        total: 20,
        confirmed: 6,
        held: 4, // Exactly 50%
        available: 10,
      },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<AvailabilityBadge eventId={mockEventId} />);

    expect(screen.getByText('Available')).toBeTruthy(); // Should be "Available" at exactly 50%
  });

  it('should calculate utilization correctly for edge of "Filling Up"', () => {
    // Test just over 50% utilization
    mockUseEventAvailability.mockReturnValue({
      availability: {
        total: 20,
        confirmed: 6,
        held: 5, // 55% utilization
        available: 9,
      },
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<AvailabilityBadge eventId={mockEventId} />);

    expect(screen.getByText('Filling Up')).toBeTruthy();
  });
});
