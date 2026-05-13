import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../theme';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5001'
  : 'http://10.0.2.2:5001';

export default function InventoryPanel({ visible, onClose, onMenuUpdate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [restockModal, setRestockModal] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [uploadingImage, setUploadingImage] = useState(null); // item _id being uploaded
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [uploadPhase, setUploadPhase] = useState(''); // current phase label
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fileInputRef = useRef(null);
  const [selectedItemForImage, setSelectedItemForImage] = useState(null);
  const selectedItemRef = useRef(null); // Ref to avoid stale closures in onChange handler

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = filter === 'low-stock'
        ? `${API_URL}/api/inventory/low-stock`
        : `${API_URL}/api/inventory`;
      const response = await fetch(endpoint);
      const data = await response.json();
      setItems(data.items || data || []);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (visible) fetchInventory();
  }, [visible, fetchInventory]);

  const handleRestock = async () => {
    if (!restockQty || parseInt(restockQty) <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/inventory/${restockModal._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock: restockModal.stock + parseInt(restockQty),
          reason: 'restock',
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Restock failed');
      }

      Alert.alert('Success', `Restocked ${restockQty} units of ${restockModal.name}`);
      setRestockModal(null);
      setRestockQty('');
      fetchInventory();
    } catch (error) {
      Alert.alert('Restock Error', error.message);
    }
  };

  // ── Image Upload ──
  const animateProgress = (toValue, duration = 800) => {
    Animated.timing(progressAnim, {
      toValue,
      duration,
      useNativeDriver: false,
    }).start();
    setUploadProgress(toValue);
  };

  const handleImageUpload = async (itemId, file) => {
    if (!file) return;
    // Find the item name for logging — look up from current items list
    const itemForLog = items.find(i => i._id === itemId);
    console.log(`[InventoryPanel] handleImageUpload — item: "${itemForLog?.name || 'unknown'}" (${itemId}), file: ${file.name}`);

    // ── Client-side file size check ──
    const MAX_RAW_SIZE = 10 * 1024 * 1024; // 10MB raw limit
    if (file.size > MAX_RAW_SIZE) {
      Alert.alert(
        'File Too Large',
        `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum upload size is 10MB.\n\nThe system will automatically compress large images for POS display.`
      );
      return;
    }

    // Show size info for transparency
    const sizeKB = (file.size / 1024).toFixed(0);
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    const sizeLabel = file.size > 1024 * 1024 ? `${sizeMB}MB` : `${sizeKB}KB`;

    setUploadingImage(itemId);
    setUploadProgress(0);
    setUploadPhase('Uploading file...');
    progressAnim.setValue(0);

    // Record start time to enforce minimum progress bar visibility
    const startTime = Date.now();
    const MIN_VISIBLE_MS = 1200; // Show progress bar for at least 1.2s

    try {
      // Phase 1: Upload to server (0% → 30%)
      animateProgress(30, 1200);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/api/upload/menu/${itemId}/image`, {
        method: 'POST',
        body: formData,
        // No Content-Type header — browser sets multipart boundary automatically
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.details || 'Upload failed');
      }

      // Phase 2: Server processing (30% → 60%)
      setUploadPhase('Processing image...');
      animateProgress(60, 800);

      const data = await res.json();

      // Phase 3: Saving to cloud (60% → 90%)
      setUploadPhase('Saving to cloud storage...');
      animateProgress(90, 600);

      // Phase 4: Done (90% → 100%)
      setUploadPhase('Complete!');
      animateProgress(100, 400);

      // Ensure minimum visibility time so user sees the progress bar
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_VISIBLE_MS) {
        await new Promise(r => setTimeout(r, MIN_VISIBLE_MS - elapsed));
      }

      // Show processing stats if available
      let message = 'Image uploaded successfully';
      if (data.processing) {
        const saved = ((1 - data.processing.compressedSize / data.processing.originalSize) * 100).toFixed(0);
        message = `Image optimized: ${(data.processing.originalSize / 1024).toFixed(0)}KB → ${(data.processing.compressedSize / 1024).toFixed(0)}KB (${saved}% reduction)`;
      }

      Alert.alert('Success', message);
      fetchInventory(); // Refresh inventory panel list
      // Notify parent (App.js) to refresh the main menu display
      if (typeof onMenuUpdate === 'function') {
        onMenuUpdate();
      }
    } catch (error) {
      setUploadPhase('Upload failed');
      animateProgress(0, 200);
      Alert.alert('Upload Error', error.message);
    } finally {
      // Clear upload state after a brief delay so user sees the progress bar
      setTimeout(() => {
        setUploadingImage(null);
        setUploadProgress(0);
        setUploadPhase('');
        setSelectedItemForImage(null);
        selectedItemRef.current = null;
      }, 1000);
    }
  };

  const handlePickImage = (item) => {
    if (Platform.OS === 'web') {
      setSelectedItemForImage(item);
      selectedItemRef.current = item; // Keep ref in sync for onChange closure
      // Trigger hidden file input after a tick so the click event works
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }, 100);
    } else {
      Alert.alert('Not Supported', 'Image upload is only supported on web for now.');
    }
  };

  const getStockStatus = (item) => {
    const ratio = item.stock / item.lowStockThreshold;
    if (item.stock === 0) return { label: 'Out of Stock', color: '#F44336', bg: 'rgba(244,67,54,0.15)' };
    if (ratio <= 1) return { label: 'Low Stock', color: '#FF9800', bg: 'rgba(255,152,0,0.15)' };
    if (ratio <= 2) return { label: 'Running Low', color: '#FFC107', bg: 'rgba(255,193,7,0.15)' };
    return { label: 'In Stock', color: '#4CAF50', bg: 'rgba(76,175,80,0.15)' };
  };

  const renderItem = ({ item }) => {
    const status = getStockStatus(item);
    // Generate a unique image key that changes when the URL changes
    const itemImageUri = item.image
      ? (item.image.startsWith('/') ? `${API_URL}${item.image}` : item.image)
      : null;
    const itemImageKey = itemImageUri ? `inv-img-${item._id}-${itemImageUri}` : null;
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeaderRow}>
          {item.image && (
            <Image
              key={itemImageKey}
              source={{ uri: itemImageUri }}
              style={styles.itemThumb}
              resizeMode="cover"
            />
          )}
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemCategory}>{item.category}</Text>
            </View>
            <View style={[styles.stockBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.stockText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.stockBar}>
          <View style={styles.stockBarBg}>
            <View style={[
              styles.stockBarFill,
              {
                width: `${Math.min((item.stock / (item.lowStockThreshold * 3)) * 100, 100)}%`,
                backgroundColor: status.color,
              },
            ]} />
          </View>
        </View>

        <View style={styles.stockDetails}>
          <View style={styles.stockDetail}>
            <Text style={styles.detailLabel}>Stock</Text>
            <Text style={[styles.detailValue, { color: status.color }]}>{item.stock}</Text>
          </View>
          <View style={styles.stockDetail}>
            <Text style={styles.detailLabel}>Threshold</Text>
            <Text style={styles.detailValue}>{item.lowStockThreshold}</Text>
          </View>
          <View style={styles.stockDetail}>
            <Text style={styles.detailLabel}>Sold</Text>
            <Text style={styles.detailValue}>{item.sold}</Text>
          </View>
          <View style={styles.stockDetail}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>${item.price.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.itemActions}>
          {item.stock <= item.lowStockThreshold && (
            <TouchableOpacity
              style={styles.restockBtn}
              onPress={() => setRestockModal(item)}
            >
              <Text style={styles.restockBtnText}>+ Restock</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.imageBtn}
            onPress={() => handlePickImage(item)}
            disabled={uploadingImage === item._id}
          >
            <Text style={styles.imageBtnText}>
              {uploadingImage === item._id ? '⏳' : '🖼️'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const FILTERS = [
    { key: 'all', label: 'All Items' },
    { key: 'low-stock', label: 'Low Stock' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Inventory</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filters}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>
                {filter === 'low-stock' ? 'All items are well-stocked!' : 'No items found'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>

      {/* Restock Modal — inside main Modal */}
      <Modal visible={!!restockModal} transparent animationType="fade">
        <View style={styles.restockOverlay}>
          <View style={styles.restockModal}>
            <Text style={styles.restockTitle}>Restock {restockModal?.name}</Text>
            <Text style={styles.restockSubtitle}>
              Current stock: <Text style={{ color: Colors.primary, fontWeight: '700' }}>{restockModal?.stock}</Text>
            </Text>
            <TextInput
              style={styles.restockInput}
              placeholder="Enter quantity"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={restockQty}
              onChangeText={setRestockQty}
              autoFocus
            />
            <View style={styles.restockActions}>
              <TouchableOpacity style={styles.restockConfirmBtn} onPress={handleRestock}>
                <Text style={styles.restockConfirmText}>Add Stock</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.restockCancelBtn}
                onPress={() => { setRestockModal(null); setRestockQty(''); }}
              >
                <Text style={styles.restockCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Hidden file input for web image upload */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Use ref to avoid stale closure — always reads the latest selected item
            const item = selectedItemRef.current;
            if (file && item) {
              handleImageUpload(item._id, file);
            }
            // Reset so the same file can be picked again
            e.target.value = '';
          }}
        />
      )}

      {/* Image Preview Modal */}
      <Modal visible={!!selectedItemForImage && uploadingImage === null} transparent animationType="fade">
        <View style={styles.restockOverlay}>
          <View style={styles.restockModal}>
            <Text style={styles.restockTitle}>Upload Image</Text>
            {selectedItemForImage && (
              <>
                {selectedItemForImage.image ? (
                  <Image
                    source={{ uri: selectedItemForImage.image.startsWith('/') ? `${API_URL}${selectedItemForImage.image}` : selectedItemForImage.image }}
                    style={{ width: '100%', height: 180, borderRadius: BorderRadius.md, marginBottom: Spacing.md }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={{ width: '100%', height: 180, borderRadius: BorderRadius.md, marginBottom: Spacing.md, backgroundColor: Colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 48, opacity: 0.3 }}>🖼️</Text>
                    <Text style={{ color: Colors.textMuted, marginTop: Spacing.sm }}>No image set</Text>
                  </View>
                )}
                <Text style={{ color: Colors.text, textAlign: 'center', marginBottom: Spacing.md }}>
                  {selectedItemForImage.name}
                </Text>
                <TouchableOpacity
                  style={styles.restockConfirmBtn}
                  onPress={() => handlePickImage(selectedItemForImage)}
                >
                  <Text style={styles.restockConfirmText}>
                    {selectedItemForImage.image ? 'Change Image' : 'Choose Image'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.restockCancelBtn}
                  onPress={() => { setSelectedItemForImage(null); selectedItemRef.current = null; }}
                >
                  <Text style={styles.restockCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Upload Progress Overlay — rendered inside the main Modal with elevated z-index */}
      <Modal visible={!!uploadingImage} transparent animationType="fade">
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadModal}>
            <Text style={styles.uploadTitle}>
              {uploadPhase || 'Uploading...'}
            </Text>
            <View style={styles.uploadBarBg}>
              <Animated.View
                style={[
                  styles.uploadBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.uploadPercent}>
              {Math.round(uploadProgress)}%
            </Text>
            {uploadProgress < 100 && (
              <Text style={styles.uploadHint}>
                {fileInputRef.current?.files?.[0]
                  ? `File: ${fileInputRef.current.files[0].name}`
                  : ''}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  // ── Upload Progress ──
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadModal: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  uploadTitle: {
    fontSize: Typography.h3,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  uploadBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  uploadBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  uploadPercent: {
    fontSize: Typography.h2,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  uploadHint: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    fontSize: 20,
    color: Colors.textSecondary,
    padding: 4,
  },
  filters: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.surfaceLight,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#151515',
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textMuted,
  },
  list: {
    padding: Spacing.md,
  },
  itemCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  itemThumb: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
  },
  itemHeader: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  itemCategory: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textMuted,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  stockBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stockBar: {
    marginBottom: Spacing.sm,
  },
  stockBarBg: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  stockBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stockDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockDetail: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: Typography.caption.fontSize,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  imageBtn: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  imageBtnText: {
    fontSize: 16,
  },
  restockBtn: {
    backgroundColor: 'rgba(221, 155, 29, 0.15)',
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(221, 155, 29, 0.3)',
  },
  restockBtnText: {
    fontSize: Typography.caption.fontSize,
    color: Colors.primary,
    fontWeight: '600',
  },
  restockOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  restockModal: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 320,
  },
  restockTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  restockSubtitle: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  restockInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  restockActions: {
    gap: Spacing.sm,
  },
  restockConfirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  restockConfirmText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: '#151515',
  },
  restockCancelBtn: {
    padding: Spacing.sm,
    alignItems: 'center',
  },
  restockCancelText: {
    fontSize: Typography.body.fontSize,
    color: Colors.textSecondary,
  },
});
