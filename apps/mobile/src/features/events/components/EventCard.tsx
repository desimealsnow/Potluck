import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { gradients } from '@/theme';
import { formatDateTimeRange } from '@/utils/dateUtils';
import type { EventItem, Attendee, Diet } from '@common/types';

/**
 * Renders a dietary tag based on the provided diet type.
 */
function DietTag({ diet }: { diet: Diet }) {
  const map = {
    veg: { bg: '#22C55E', fg: '#062E16', label: 'veg' },
    nonveg: { bg: '#F59E0B', fg: '#3A2000', label: 'non-veg' },
    mixed: { bg: '#7C3AED', fg: '#120B20', label: 'mixed' },
  } as const;
  const d = map[diet];
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: d.bg + '22', borderWidth: 1, borderColor: d.bg + '55' }}>
      <Text style={{ color: d.fg, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' }}>{d.label}</Text>
    </View>
  );
}

/**
 * Renders a status pill component based on the provided status.
 *
 * The function determines the appropriate color, text color, and icon for the status pill by evaluating the status parameter. It then returns a styled View component containing an icon and the status text, with optional testID for testing purposes.
 *
 * @param status - The status of the pill, which can be 'active', 'cancelled', 'draft', 'deleted', or 'past'.
 * @param testID - An optional string used for testing purposes to identify the component.
 * @returns A JSX element representing the status pill.
 */
function StatusPill({ status, testID }: { status: 'active' | 'cancelled' | 'draft' | 'deleted' | 'past'; testID?: string }) {
  const config = (() => {
    switch (status) {
      case 'active':
        return { color: 'rgba(16,185,129,0.95)', textColor: '#0b3d2a', icon: 'CircleCheck' as const };
      case 'cancelled':
        return { color: 'rgba(239,68,68,0.95)', textColor: '#7f1d1d', icon: 'CircleX' as const };
      case 'draft':
        return { color: 'rgba(251,191,36,0.95)', textColor: '#78350f', icon: 'Pencil' as const };
      case 'deleted':
        return { color: 'rgba(107,114,128,0.95)', textColor: '#111827', icon: 'Trash2' as const };
      case 'past':
        return { color: 'rgba(59,130,246,0.95)', textColor: '#1e3a8a', icon: 'Clock' as const };
      default:
        return { color: 'rgba(16,185,129,0.95)', textColor: '#0b3d2a', icon: 'Circle' as const };
    }
  })();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: config.color }} testID={testID}>
      <Icon name={config.icon as any} size={14} color="#fff" style={{ marginRight: 4 }} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: config.textColor, marginLeft: 6 }} testID={`${testID}-text`}>{status}</Text>
    </View>
  );
}

/**
 * Renders a row of avatar icons for the given attendees, with an optional extra count.
 */
function Avatars({ people, extra }: { people: Attendee[]; extra?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {people.slice(0, 3).map((p, idx) => (
        <View key={p.id} style={[styles.avatarWrap, { marginLeft: idx === 0 ? 0 : -10 }]}>
          <View style={[styles.avatar, { alignItems: 'center', justifyContent: 'center' }]}> 
            <Icon name="User" size={14} color="#fff" />
          </View>
        </View>
      ))}
      {extra && extra > 0 ? (
        <View style={[styles.avatarWrap, { marginLeft: -10, backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

export type EventCardAction = {
  key: string;
  label: string;
  icon: string;
  color: string;
  handler: () => void;
};

export type EventCardProps = {
  item: EventItem;
  onPress: () => void;
  actions?: EventCardAction[];
  testID?: string;
};

/**
 * Renders an event card with details and actions for a specific event.
 *
 * The function formats the event date and determines the role of the user (host or guest) based on ownership.
 * It displays the event title, date, venue, attendee count, and any associated actions.
 * Each action can trigger a handler while preventing event propagation.
 *
 * @param {Object} props - The properties for the event card.
 * @param {Object} props.item - The event item containing details like title, date, venue, and attendees.
 * @param {Function} props.onPress - The function to call when the card is pressed.
 * @param {Array} [props.actions] - An optional array of action objects to display on the card.
 * @param {string} [props.testID] - An optional test ID for testing purposes.
 */
function EventCardBase({ item, onPress, actions = [], testID }: EventCardProps) {
  const dateLabel = formatDateTimeRange(new Date(item.date), item.time ? new Date(item.time) : undefined);
  const roleLabel = item.ownership === 'mine' ? 'host' : 'guest';
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="button" accessibilityLabel={`Open event ${item.title}`}>
      <View style={[styles.card, { backgroundColor: '#FFFFFF' }]}>
        <View style={styles.cardHeader} testID={`${testID}-header`}>
          <Text style={styles.cardTitle} testID={`${testID}-title`}>{item.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ marginRight: 6 }}>
              <View accessibilityLabel={`You are ${roleLabel} of this event`}>
                <Icon name={roleLabel === 'host' ? 'User' : 'Users'} size={12} color="#fff" />
              </View>
            </View>
            {item.statusBadge ? <StatusPill status={item.statusBadge} testID={`${testID}-status`} /> : null}
          </View>
        </View>
        <View style={styles.metaRow}>
          <Icon name="Calendar" size={16} color="#6B7280" style={{ marginRight: 8 }} />
          <Text style={styles.metaText}>{dateLabel}</Text>
        </View>
        <View style={[styles.metaRow, { marginTop: 4 }]}>
          <Icon name="MapPin" size={16} color="#6B7280" style={{ marginRight: 8 }} />
          <Text style={styles.metaText}>{item.venue}</Text>
        </View>
        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            <Icon name="Users" size={16} color="#6B7280" />
            <Text style={[styles.metaText, { marginLeft: 6 }]}>{item.attendeeCount}</Text>
          </View>
          <View style={styles.footerCenter}>
            <DietTag diet={item.diet} />
          </View>
          <View style={styles.footerRight}>
            <Avatars
              people={item.attendeesPreview || []}
              extra={Math.max(0, (item.attendeeCount || 0) - (item.attendeesPreview?.length || 0))}
            />
          </View>
        </View>
        {actions.length > 0 && (
          <View style={styles.actionsContainer} testID={`${testID}-actions`}>
            {actions.map(action => (
              <Pressable
                key={action.key}
                onPress={(e) => { e.stopPropagation(); action.handler(); }}
                style={[styles.actionButton, { backgroundColor: action.color }]}
                testID={`${testID}-action-${action.key}`}
                accessibilityRole="button"
                accessibilityLabel={`${action.label} event`}
              >
                <Icon name={
                  action.icon === 'rocket-outline' ? 'Rocket' :
                  action.icon === 'trash-outline' ? 'Trash2' :
                  action.icon === 'close-circle-outline' ? 'CircleX' :
                  action.icon === 'checkmark-circle-outline' ? 'CircleCheck' :
                  action.icon === 'refresh-outline' ? 'RefreshCw' : 'Circle'
                } size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.actionButtonText} testID={`${testID}-action-${action.key}-text`}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

export const EventCard = React.memo(EventCardBase);

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }, android: { elevation: 6 } }),
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#374151', fontSize: 18, fontWeight: '800', flex: 1, paddingRight: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  metaText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  footerRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', minWidth: 64 },
  footerCenter: { flex: 1, alignItems: 'center' },
  footerRight: { minWidth: 86, alignItems: 'flex-end' },
  avatarWrap: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(255,255,255,0.25)' },
  avatar: { width: '100%', height: '100%', borderRadius: 14 },
  actionsContainer: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  actionButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }, android: { elevation: 3 } }), minWidth: 80 },
  actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});


