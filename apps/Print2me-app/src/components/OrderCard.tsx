import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import {
  Printer,
  Phone,
  MessageCircle,
  FileText,
  CheckCircle,
  Clock,
  IndianRupee,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  Eye,
  X,
  ExternalLink,
} from 'lucide-react-native';
import { Palette, Shadows } from '@/constants/theme';
import { Order, OrderItem } from '@/services/api';
import { PrintService } from '@/services/printService';

interface OrderCardProps {
  order: Order;
  vendorName: string;
  onStatusUpdate: (orderId: string, action: string) => Promise<void>;
  onFetchDocument: (orderId: string) => Promise<any>;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  vendorName,
  onStatusUpdate,
  onFetchDocument,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState<OrderItem | null>(null);

  const isCashPending =
    order.paymentStatus === 'CASH_PENDING' || order.paymentStatus === 'PENDING';
  const isPaid = order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'CASH_COLLECTED';
  const isAwaitingApproval = order.status === 'AWAITING_VENDOR_APPROVAL';
  const isReady = order.status === 'READY_FOR_PICKUP';
  const isCompleted = order.status === 'COMPLETED';

  const totalInr = ((order.totalAmountMinor || 0) / 100).toFixed(2);

  // Short 2-digit pickup token number
  const rawDigits = (order.orderNumber || '').replace(/[^0-9]/g, '');
  const tokenNumber = rawDigits.slice(-2) || (order.orderNumber || '').slice(-2).toUpperCase();

  const handlePrintWiFi = async () => {
    setPrinting(true);
    try {
      const docs = await onFetchDocument(order.id);
      if (!docs || docs.length === 0) {
        throw new Error('No printable documents found for this order');
      }

      for (const doc of docs) {
        await PrintService.printRemoteDocument(doc.downloadUrl, doc.filename, {
          copies: doc.copies || 1,
          duplex: doc.duplexMode?.includes('DOUBLE'),
        });
      }

      if (order.status !== 'READY_FOR_PICKUP' && order.status !== 'COMPLETED') {
        await onStatusUpdate(order.id, 'MARK_READY');
      }
      Alert.alert('Sent to Printer', `Order #${order.orderNumber} (Token #${tokenNumber}) dispatched to printer.`);
    } catch (err: any) {
      Alert.alert('Print Error', err.message || 'Could not send document to printer.');
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintReceipt = async () => {
    try {
      const html = PrintService.formatOrderReceiptHtml(order, vendorName);
      await PrintService.printReceiptSlip(html);
    } catch (err: any) {
      Alert.alert('Receipt Error', err.message || 'Could not print receipt slip');
    }
  };

  const handleCollectCash = async () => {
    Alert.alert(
      'Approve Cash Payment',
      `Confirm cash receipt of ₹${totalInr} from ${order.customerName || 'customer'} for Order #${order.orderNumber} (Token #${tokenNumber})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Approve',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              await onStatusUpdate(order.id, 'MARK_CASH_COLLECTED');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not update cash status');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await onStatusUpdate(order.id, 'APPROVE');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReady = async () => {
    setActionLoading(true);
    try {
      await onStatusUpdate(order.id, 'MARK_READY');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCompleted = async () => {
    setActionLoading(true);
    try {
      await onStatusUpdate(order.id, 'MARK_COMPLETED');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCall = () => {
    if (order.customerPhone) {
      Linking.openURL(`tel:${order.customerPhone}`);
    }
  };

  const handleOpenDocUrl = (url?: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Download Link', url);
      });
    }
  };

  return (
    <View style={styles.card}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.orderNumberContainer}>
          {/* 2-Digit Counter Pickup Token */}
          <View style={styles.tokenBadge}>
            <Text style={styles.tokenLabel}>TOKEN</Text>
            <Text style={styles.tokenNumber}>#{tokenNumber}</Text>
          </View>

          <View style={{ marginLeft: 6 }}>
            <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
            <View
              style={[
                styles.statusBadge,
                isCompleted
                  ? styles.statusCompleted
                  : isReady
                  ? styles.statusReady
                  : isAwaitingApproval
                  ? styles.statusApproval
                  : styles.statusConfirmed,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isCompleted
                    ? styles.textSuccess
                    : isReady
                    ? styles.textSuccess
                    : isAwaitingApproval
                    ? styles.textWarning
                    : styles.textSaffron,
                ]}
              >
                {order.status.replace(/_/g, ' ')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>TOTAL</Text>
          <Text style={styles.priceValue}>₹{totalInr}</Text>
        </View>
      </View>

      {/* Customer Info Row */}
      <View style={styles.customerRow}>
        <View style={styles.customerMeta}>
          <Text style={styles.customerName}>{order.customerName || 'Walk-in Customer'}</Text>
          {order.customerPhone ? (
            <Text style={styles.customerPhone}>+91 {order.customerPhone}</Text>
          ) : null}
        </View>

        {order.customerPhone ? (
          <View style={styles.contactActions}>
            <TouchableOpacity onPress={handleCall} style={styles.iconCircle}>
              <Phone size={15} color={Palette.ink.DEFAULT} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Perforated Divider */}
      <View style={styles.perforation} />

      {/* Items Summary with Quick Preview Trigger */}
      <View style={styles.itemsList}>
        {order.items.map((item: OrderItem, idx: number) => (
          <TouchableOpacity
            key={item.id || idx}
            style={styles.itemRow}
            onPress={() => setPreviewItem(item)}
            activeOpacity={0.7}
          >
            <View style={styles.itemIcon}>
              <FileText size={18} color={Palette.saffron.DEFAULT} />
            </View>
            <View style={styles.itemDetails}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.itemFilename} numberOfLines={1}>
                  {item.document?.originalName || 'Print Document'}
                </Text>
                <Eye size={12} color={Palette.ink.muted} />
              </View>
              <Text style={styles.itemSpecs}>
                {item.paperSize} • {item.colorMode === 'COLOR' ? '🎨 Color' : '⬛ B&W'} •{' '}
                {item.duplexMode?.includes('DOUBLE') ? '2-Sided' : '1-Sided'} • {item.copies}{' '}
                {item.copies === 1 ? 'copy' : 'copies'}
              </Text>
            </View>
            <View style={styles.itemPages}>
              <Text style={styles.pageCountText}>{item.document?.pageCount || 1} pgs</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notes if any */}
      {order.customerNotes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>Note from customer:</Text>
          <Text style={styles.notesText}>{order.customerNotes}</Text>
        </View>
      ) : null}

      {/* Payment Status Strip */}
      <View style={styles.paymentStrip}>
        <View style={styles.paymentMeta}>
          <Text style={styles.paymentLabel}>Payment Status</Text>
          <View
            style={[
              styles.paymentBadge,
              isPaid ? styles.paidBadge : styles.cashPendingBadge,
            ]}
          >
            <Text style={[styles.paymentBadgeText, isPaid ? styles.paidText : styles.cashText]}>
              {isPaid ? 'PAID' : 'CASH PENDING'}
            </Text>
          </View>
        </View>

        {isCashPending ? (
          <TouchableOpacity
            style={styles.collectCashBtn}
            onPress={handleCollectCash}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <CheckCircle size={14} color="#FFFFFF" />
                <Text style={styles.collectCashBtnText}>Approve Cash (₹{totalInr})</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Main Action Bar */}
      <View style={styles.actionBar}>
        {/* WiFi Print Button */}
        <TouchableOpacity
          style={[styles.wifiPrintBtn, printing && styles.btnDisabled]}
          onPress={handlePrintWiFi}
          disabled={printing}
        >
          {printing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Printer size={18} color="#FFFFFF" />
              <Text style={styles.wifiPrintBtnText}>Print via WiFi</Text>
            </>
          )}
        </TouchableOpacity>

        {/* State Action Buttons */}
        {isAwaitingApproval ? (
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={handleApprove}
            disabled={actionLoading}
          >
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
        ) : !isReady && !isCompleted ? (
          <TouchableOpacity
            style={styles.markReadyBtn}
            onPress={handleMarkReady}
            disabled={actionLoading}
          >
            <CheckCircle size={15} color={Palette.success.DEFAULT} />
            <Text style={styles.markReadyBtnText}>Mark Ready</Text>
          </TouchableOpacity>
        ) : isReady ? (
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={handleMarkCompleted}
            disabled={actionLoading}
          >
            <Text style={styles.completeBtnText}>Hand Over</Text>
          </TouchableOpacity>
        ) : null}

        {/* Quick Receipt Print */}
        <TouchableOpacity onPress={handlePrintReceipt} style={styles.receiptBtn}>
          <Text style={styles.receiptBtnText}>Slip</Text>
        </TouchableOpacity>
      </View>

      {/* In-App Document Quick Preview Modal */}
      {previewItem && (
        <Modal
          visible={!!previewItem}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setPreviewItem(null)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.modalBackdropClickable}
              activeOpacity={1}
              onPress={() => setPreviewItem(null)}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={styles.docModalIconWrap}>
                    <FileText size={20} color={Palette.saffron.DEFAULT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalDocTitle} numberOfLines={1}>
                      {previewItem.document?.originalName || 'Document'}
                    </Text>
                    <Text style={styles.modalDocSub}>
                      Token #{tokenNumber} • Order #{order.orderNumber}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setPreviewItem(null)} hitSlop={10}>
                  <X size={18} color={Palette.ink.DEFAULT} />
                </TouchableOpacity>
              </View>

              {/* Specs Grid */}
              <View style={styles.specsGrid}>
                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>PAGES</Text>
                  <Text style={styles.specVal}>{previewItem.document?.pageCount || 1}</Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>COLOR</Text>
                  <Text style={styles.specVal}>
                    {previewItem.colorMode === 'COLOR' ? 'Color' : 'B&W'}
                  </Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>DUPLEX</Text>
                  <Text style={styles.specVal}>
                    {previewItem.duplexMode?.includes('DOUBLE') ? '2-Sided' : '1-Sided'}
                  </Text>
                </View>
                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>COPIES</Text>
                  <Text style={styles.specVal}>{previewItem.copies || 1}</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.openViewerBtn}
                  onPress={() => handleOpenDocUrl((previewItem.document as any)?.downloadUrl)}
                >
                  <ExternalLink size={16} color="#FFFFFF" />
                  <Text style={styles.openViewerBtnText}>Open in Device PDF Viewer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeModalBtn}
                  onPress={() => setPreviewItem(null)}
                >
                  <Text style={styles.closeModalBtnText}>Close Preview</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.hairline,
    padding: 16,
    marginBottom: 12,
    ...Shadows.soft,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenBadge: {
    backgroundColor: Palette.ink.DEFAULT,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.ink.DEFAULT,
  },
  tokenLabel: {
    fontSize: 7.5,
    fontWeight: '800',
    color: Palette.saffron.DEFAULT,
    letterSpacing: 0.5,
  },
  tokenNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.ink.DEFAULT,
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  statusConfirmed: {
    backgroundColor: Palette.saffron.tint,
  },
  statusReady: {
    backgroundColor: Palette.success.tint,
  },
  statusCompleted: {
    backgroundColor: '#F1F5F9',
  },
  statusApproval: {
    backgroundColor: '#FFF2F2',
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textSaffron: {
    color: Palette.saffron.dark,
  },
  textSuccess: {
    color: Palette.success.DEFAULT,
  },
  textWarning: {
    color: Palette.warning.DEFAULT,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Palette.ink.muted,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Palette.ink.DEFAULT,
    letterSpacing: -0.5,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  customerMeta: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.ink.DEFAULT,
  },
  customerPhone: {
    fontSize: 12,
    color: Palette.ink.soft,
    marginTop: 1,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perforation: {
    height: 1,
    borderWidth: 0.8,
    borderColor: Palette.hairline,
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  itemsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF9F6',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Palette.saffron.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  itemDetails: {
    flex: 1,
  },
  itemFilename: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.ink.DEFAULT,
    maxWidth: 180,
  },
  itemSpecs: {
    fontSize: 10,
    color: Palette.ink.soft,
    marginTop: 1,
  },
  itemPages: {
    backgroundColor: Palette.surface,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  pageCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.ink.DEFAULT,
  },
  notesBox: {
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  notesText: {
    fontSize: 11,
    color: Palette.ink.DEFAULT,
    marginTop: 1,
  },
  paymentStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.paper,
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  paymentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentLabel: {
    fontSize: 10.5,
    color: Palette.ink.soft,
    fontWeight: '600',
  },
  paymentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  paidBadge: {
    backgroundColor: Palette.success.tint,
  },
  cashPendingBadge: {
    backgroundColor: Palette.warning.tint,
  },
  paymentBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  paidText: {
    color: Palette.success.DEFAULT,
  },
  cashText: {
    color: Palette.warning.DEFAULT,
  },
  collectCashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.success.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  collectCashBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  wifiPrintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Palette.saffron.DEFAULT,
    paddingVertical: 11,
    borderRadius: 12,
    ...Shadows.soft,
  },
  wifiPrintBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  approveBtn: {
    backgroundColor: Palette.success.DEFAULT,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  markReadyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.success.tint,
    borderWidth: 1,
    borderColor: '#C4EED0',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
  },
  markReadyBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Palette.success.DEFAULT,
  },
  completeBtn: {
    backgroundColor: Palette.ink.DEFAULT,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  receiptBtn: {
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.hairline,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.ink.DEFAULT,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  /* Document Quick Preview Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(14, 26, 58, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBackdropClickable: {
    ...(StyleSheet.absoluteFill as any),
  },
  modalCard: {
    backgroundColor: Palette.surface,
    borderRadius: 20,
    padding: 18,
    ...Shadows.soft,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  docModalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Palette.saffron.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDocTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.ink.DEFAULT,
  },
  modalDocSub: {
    fontSize: 11,
    color: Palette.ink.soft,
    marginTop: 1,
  },
  specsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  specBox: {
    flex: 1,
    backgroundColor: Palette.paper,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  specLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Palette.ink.muted,
  },
  specVal: {
    fontSize: 14,
    fontWeight: '900',
    color: Palette.ink.DEFAULT,
    marginTop: 2,
  },
  modalActions: {
    marginTop: 14,
    gap: 8,
  },
  openViewerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.ink.DEFAULT,
    paddingVertical: 12,
    borderRadius: 12,
  },
  openViewerBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  closeModalBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: Palette.ink.soft,
    fontSize: 12,
    fontWeight: '700',
  },
});
