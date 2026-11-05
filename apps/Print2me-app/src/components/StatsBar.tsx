import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IndianRupee, Clock, AlertCircle, Printer, CheckCircle2 } from 'lucide-react-native';
import { Palette, Shadows } from '@/constants/theme';
import { Order } from '@/services/api';

interface StatsBarProps {
  orders: Order[];
  activeTab?: string;
  onSelectTab?: (tabKey: string) => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({ orders, activeTab = 'ALL', onSelectTab }) => {
  const paidOrders = orders.filter(
    (o) => o.paymentStatus === 'SUCCESS' || o.paymentStatus === 'CASH_COLLECTED'
  );
  const totalRevenuePaise = paidOrders.reduce((acc, o) => acc + (o.totalAmountMinor || 0), 0);

  const awaitingApprovalCount = orders.filter(
    (o) => o.status === 'AWAITING_VENDOR_APPROVAL'
  ).length;
  const cashPendingCount = orders.filter(
    (o) => o.paymentStatus === 'CASH_PENDING' || o.paymentStatus === 'PENDING'
  ).length;
  const inQueueCount = orders.filter(
    (o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING'
  ).length;

  const revenueInr = (totalRevenuePaise / 100).toFixed(0);

  return (
    <View style={styles.container}>
      {/* Left Tile: Revenue & Volume */}
      <TouchableOpacity
        style={styles.revenueTile}
        activeOpacity={0.7}
        onPress={() => onSelectTab && onSelectTab('ALL')}
      >
        <Text style={styles.tileLabel}>TODAY'S REVENUE</Text>
        <View style={styles.revenueRow}>
          <Text style={styles.currencySymbol}>₹</Text>
          <Text style={styles.revenueAmount}>{revenueInr}</Text>
        </View>
        <Text style={styles.revenueSubtext}>{orders.length} total orders received</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Right Tile: Active Status & Action Needed */}
      <View style={styles.statusTile}>
        <Text style={styles.tileLabel}>QUEUE STATUS</Text>
        <View style={styles.statusPills}>
          {/* Spool / In Queue Pill */}
          <TouchableOpacity
            style={[styles.pill, inQueueCount > 0 ? styles.spoolPill : styles.idlePill]}
            onPress={() => onSelectTab && onSelectTab('CONFIRMED')}
            activeOpacity={0.7}
          >
            <Printer
              size={12}
              color={inQueueCount > 0 ? Palette.success.DEFAULT : Palette.ink.soft}
            />
            <Text
              style={[
                styles.pillText,
                inQueueCount > 0 ? styles.spoolPillText : styles.idlePillText,
              ]}
            >
              {inQueueCount} Spooling
            </Text>
          </TouchableOpacity>

          {/* Cash Due Pill */}
          {cashPendingCount > 0 ? (
            <TouchableOpacity
              style={[styles.pill, styles.cashPill]}
              onPress={() => onSelectTab && onSelectTab('AWAITING_VENDOR_APPROVAL')}
              activeOpacity={0.7}
            >
              <Clock size={12} color={Palette.saffron.dark} />
              <Text style={styles.cashPillText}>{cashPendingCount} Cash Due</Text>
            </TouchableOpacity>
          ) : null}

          {/* Approval Pill */}
          {awaitingApprovalCount > 0 ? (
            <TouchableOpacity
              style={[styles.pill, styles.alertPill]}
              onPress={() => onSelectTab && onSelectTab('AWAITING_VENDOR_APPROVAL')}
              activeOpacity={0.7}
            >
              <AlertCircle size={12} color={Palette.danger.DEFAULT} />
              <Text style={styles.alertPillText}>{awaitingApprovalCount} Need Approval</Text>
            </TouchableOpacity>
          ) : null}

          {/* All caught up state */}
          {inQueueCount === 0 && cashPendingCount === 0 && awaitingApprovalCount === 0 ? (
            <View style={[styles.pill, styles.clearPill]}>
              <CheckCircle2 size={12} color={Palette.success.DEFAULT} />
              <Text style={styles.clearPillText}>Queue Clear</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.hairline,
    flexDirection: 'row',
    padding: 14,
    marginBottom: 12,
    ...Shadows.soft,
  },
  revenueTile: {
    flex: 1,
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: Palette.hairline,
    marginHorizontal: 14,
  },
  statusTile: {
    flex: 1.2,
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Palette.ink.soft,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.ink.DEFAULT,
  },
  revenueAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: Palette.ink.DEFAULT,
    letterSpacing: -0.5,
  },
  revenueSubtext: {
    fontSize: 10,
    color: Palette.ink.soft,
    marginTop: 2,
    fontWeight: '500',
  },
  statusPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  spoolPill: {
    backgroundColor: Palette.success.tint,
  },
  spoolPillText: {
    color: Palette.success.DEFAULT,
  },
  cashPill: {
    backgroundColor: Palette.saffron.tint,
  },
  cashPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.saffron.dark,
  },
  alertPill: {
    backgroundColor: '#FFF2F2',
  },
  alertPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.danger.DEFAULT,
  },
  idlePill: {
    backgroundColor: '#F1F5F9',
  },
  idlePillText: {
    color: Palette.ink.soft,
  },
  clearPill: {
    backgroundColor: Palette.success.tint,
  },
  clearPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.success.DEFAULT,
  },
});
