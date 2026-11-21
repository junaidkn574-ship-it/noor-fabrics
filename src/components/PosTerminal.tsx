import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Minus,
  Percent,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { CartItem, Invoice, Product } from '../types/pos';
import {
  formatPKR,
  formatQty,
  formatUnitShort,
  roundQty,
} from '../utils/format';
import { KeypadMode, NumericKeypadModal } from './NumericKeypadModal';

interface PosTerminalProps {
  products: Product[];
  onCompleteSale: (payload: {
    cart: CartItem[];
    billDiscount: number;
    customerName: string;
    customerPhone: string;
    cashTendered?: number;
  }) => Invoice | null;
}

type ActiveKeypadState =
  | {
      type: 'product-add';
      product: Product;
    }
  | {
      type: 'cart-qty';
      productId: string;
    }
  | {
      type: 'item-discount';
      productId: string;
    }
  | {
      type: 'bill-discount';
    }
  | {
      type: 'cash-tendered';
    };

export const PosTerminal: React.FC<PosTerminalProps> = ({ products, onCompleteSale }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [billDiscount, setBillDiscount] = useState<number>(0);
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerFields, setShowCustomerFields] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [keypad, setKeypad] = useState<ActiveKeypadState | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category))).sort();
    return ['All', ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, search, selectedCategory]);

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.qty * item.sellingPrice, 0);
    const itemDiscountsTotal = cart.reduce((sum, item) => sum + item.itemDiscount, 0);
    const afterItemDiscounts = Math.max(0, subtotal - itemDiscountsTotal);
    const clampedBillDiscount = Math.min(billDiscount, afterItemDiscounts);
    const totalDiscount = itemDiscountsTotal + clampedBillDiscount;
    const grandTotal = Math.max(0, Math.round(subtotal - totalDiscount));
    const totalCost = cart.reduce((sum, item) => sum + item.qty * item.costPrice, 0);
    const changeDue = cashTendered > grandTotal ? cashTendered - grandTotal : 0;
    return {
      subtotal: Math.round(subtotal),
      itemDiscountsTotal: Math.round(itemDiscountsTotal),
      billDiscount: Math.round(clampedBillDiscount),
      totalDiscount: Math.round(totalDiscount),
      grandTotal,
      totalCost: Math.round(totalCost),
      changeDue: Math.round(changeDue),
    };
  }, [cart, billDiscount, cashTendered]);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg((curr) => (curr === msg ? '' : curr));
    }, 2400);
  };

  const getProductById = (id: string) => products.find((p) => p.id === id);

  const handleProductTap = (product: Product) => {
    if (product.stock <= 0) {
      showToast(`${product.name} is out of stock.`);
      return;
    }

    if (product.unitType === 'meter') {
      setKeypad({ type: 'product-add', product });
      return;
    }

    // Per Suit / Piece: immediate +1 tap
    const existing = cart.find((c) => c.productId === product.id);
    const nextQty = (existing ? existing.qty : 0) + 1;
    if (nextQty > product.stock) {
      showToast(`Only ${formatQty(product.stock, product.unitType)} available in stock.`);
      return;
    }
    setCart((prev) => {
      if (existing) {
        return prev.map((c) => (c.productId === product.id ? { ...c, qty: nextQty } : c));
      }
      return [
        ...prev,
        {
          productId: product.id,
          code: product.code,
          name: product.name,
          category: product.category,
          unitType: product.unitType,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          qty: 1,
          itemDiscount: 0,
        },
      ];
    });
  };

  const stepCartQty = (productId: string, deltaSign: 1 | -1) => {
    const product = getProductById(productId);
    const item = cart.find((c) => c.productId === productId);
    if (!item || !product) return;

    const step = item.unitType === 'meter' ? 0.5 : 1;
    const nextQty = roundQty(item.qty + deltaSign * step, item.unitType);

    if (nextQty <= 0) {
      setCart((prev) => prev.filter((c) => c.productId !== productId));
      return;
    }
    if (nextQty > product.stock) {
      showToast(`Max available stock is ${formatQty(product.stock, product.unitType)}.`);
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.productId === productId ? { ...c, qty: nextQty } : c))
    );
  };

  const removeCartItem = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setBillDiscount(0);
    setCashTendered(0);
    setCustomerName('');
    setCustomerPhone('');
    setShowCustomerFields(false);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const invoice = onCompleteSale({
      cart,
      billDiscount: totals.billDiscount,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      cashTendered: cashTendered > 0 ? cashTendered : undefined,
    });
    if (invoice) {
      clearCart();
      setMobileCartOpen(false);
    }
  };

  // Derive keypad props
  const keypadConfig = (() => {
    if (!keypad) return null;
    if (keypad.type === 'product-add') {
      const existing = cart.find((c) => c.productId === keypad.product.id);
      return {
        title: keypad.product.name,
        subtitle: `${keypad.product.code} · ${formatPKR(keypad.product.sellingPrice)}/m · Stock: ${formatQty(keypad.product.stock, 'meter')}`,
        mode: 'qty-meter' as KeypadMode,
        initialValue: existing ? existing.qty : 0,
        maxValue: keypad.product.stock,
        maxLabel: `Max available in bolt: ${formatQty(keypad.product.stock, 'meter')}`,
        unitSuffix: 'm',
        referenceSubtotal: 0,
      };
    }
    if (keypad.type === 'cart-qty') {
      const item = cart.find((c) => c.productId === keypad.productId);
      const prod = getProductById(keypad.productId);
      if (!item || !prod) return null;
      return {
        title: `Set Quantity — ${item.name}`,
        subtitle: `Available Stock: ${formatQty(prod.stock, item.unitType)}`,
        mode: (item.unitType === 'meter' ? 'qty-meter' : 'qty-piece') as KeypadMode,
        initialValue: item.qty,
        maxValue: prod.stock,
        maxLabel: `Max available: ${formatQty(prod.stock, item.unitType)}`,
        unitSuffix: item.unitType === 'meter' ? 'm' : 'pcs',
        referenceSubtotal: 0,
      };
    }
    if (keypad.type === 'item-discount') {
      const item = cart.find((c) => c.productId === keypad.productId);
      if (!item) return null;
      const lineSub = Math.round(item.qty * item.sellingPrice);
      return {
        title: `Item Discount — ${item.name}`,
        subtitle: `Line Subtotal: ${formatPKR(lineSub)}`,
        mode: 'discount' as KeypadMode,
        initialValue: item.itemDiscount,
        maxValue: lineSub,
        maxLabel: `Discount cannot exceed line subtotal (${formatPKR(lineSub)})`,
        unitSuffix: 'PKR',
        referenceSubtotal: lineSub,
      };
    }
    if (keypad.type === 'bill-discount') {
      const afterItem = Math.max(0, totals.subtotal - totals.itemDiscountsTotal);
      return {
        title: 'Total Bill Discount',
        subtitle: `Eligible Amount: ${formatPKR(afterItem)}`,
        mode: 'discount' as KeypadMode,
        initialValue: totals.billDiscount,
        maxValue: afterItem,
        maxLabel: `Discount cannot exceed ${formatPKR(afterItem)}`,
        unitSuffix: 'PKR',
        referenceSubtotal: afterItem,
      };
    }
    if (keypad.type === 'cash-tendered') {
      return {
        title: 'Cash Received',
        subtitle: `Bill Total: ${formatPKR(totals.grandTotal)}`,
        mode: 'cash' as KeypadMode,
        initialValue: cashTendered || totals.grandTotal,
        maxValue: undefined,
        maxLabel: undefined,
        unitSuffix: 'PKR',
        referenceSubtotal: totals.grandTotal,
      };
    }
    return null;
  })();

  const handleKeypadConfirm = (value: number) => {
    if (!keypad) return;
    if (keypad.type === 'product-add') {
      const p = keypad.product;
      setCart((prev) => {
        const exists = prev.find((c) => c.productId === p.id);
        if (exists) {
          return prev.map((c) => (c.productId === p.id ? { ...c, qty: value } : c));
        }
        return [
          ...prev,
          {
            productId: p.id,
            code: p.code,
            name: p.name,
            category: p.category,
            unitType: p.unitType,
            costPrice: p.costPrice,
            sellingPrice: p.sellingPrice,
            qty: value,
            itemDiscount: 0,
          },
        ];
      });
    } else if (keypad.type === 'cart-qty') {
      setCart((prev) =>
        prev.map((c) => (c.productId === keypad.productId ? { ...c, qty: value } : c))
      );
    } else if (keypad.type === 'item-discount') {
      setCart((prev) =>
        prev.map((c) =>
          c.productId === keypad.productId ? { ...c, itemDiscount: value } : c
        )
      );
    } else if (keypad.type === 'bill-discount') {
      setBillDiscount(value);
    } else if (keypad.type === 'cash-tendered') {
      setCashTendered(value);
    }
    setKeypad(null);
  };

  const CartLedgerPanel = (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {/* Cart Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#0F172A]">Active Bill</h2>
          <p className="text-xs font-medium text-[#64748B] tabular-nums">
            {cart.length} {cart.length === 1 ? 'line item' : 'line items'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCustomerFields((v) => !v)}
            className={`min-h-[40px] px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              showCustomerFields || customerName || customerPhone
                ? 'bg-[#0F172A] text-white border-[#0F172A]'
                : 'bg-white text-[#0F172A] border-slate-200 hover:bg-slate-50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Customer
          </button>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="min-h-[40px] px-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#EF4444] hover:bg-red-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Optional Customer Info */}
      {showCustomerFields && (
        <div className="px-4 py-3 border-b border-slate-200 bg-[#F8FAFC] grid grid-cols-2 gap-2.5">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer Name"
            className="min-h-[44px] px-3 rounded-lg border border-slate-200 bg-white text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
          />
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Phone (03xx-xxxxxxx)"
            className="min-h-[44px] px-3 rounded-lg border border-slate-200 bg-white text-sm text-[#0F172A] placeholder:text-slate-400 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
          />
        </div>
      )}

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
        {cart.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center px-6 py-10">
            <div className="h-12 w-12 rounded-xl bg-[#F1F5F9] text-[#64748B] flex items-center justify-center mb-3">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#0F172A]">No items added to bill</p>
            <p className="text-xs text-[#64748B] mt-1 max-w-[240px]">
              Tap any fabric bolt or ready-made item on the left to start billing.
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const lineSubtotal = Math.round(item.qty * item.sellingPrice);
            const lineTotal = Math.max(0, lineSubtotal - item.itemDiscount);
            return (
              <div key={item.productId} className="px-4 py-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#0F172A] leading-snug truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-[#64748B] tabular-nums mt-0.5">
                      {formatQty(item.qty, item.unitType)} × {formatPKR(item.sellingPrice)}
                      {formatUnitShort(item.unitType)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-[#0F172A] tabular-nums">
                      {formatPKR(lineTotal)}
                    </div>
                    {item.itemDiscount > 0 && (
                      <div className="text-[11px] font-semibold text-[#10B981] tabular-nums">
                        -{formatPKR(item.itemDiscount)} disc
                      </div>
                    )}
                  </div>
                </div>

                {/* Touch Controls Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => stepCartQty(item.productId, -1)}
                      aria-label="Decrease quantity"
                      className="h-11 w-11 rounded-lg border border-slate-200 bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeypad({ type: 'cart-qty', productId: item.productId })}
                      className="h-11 min-w-[74px] px-2.5 rounded-lg border border-slate-200 bg-white hover:border-[#0F172A] text-sm font-bold text-[#0F172A] tabular-nums transition-colors"
                    >
                      {formatQty(item.qty, item.unitType)}
                    </button>
                    <button
                      type="button"
                      onClick={() => stepCartQty(item.productId, 1)}
                      aria-label="Increase quantity"
                      className="h-11 w-11 rounded-lg border border-slate-200 bg-[#F8FAFC] hover:bg-slate-100 text-[#0F172A] flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setKeypad({ type: 'item-discount', productId: item.productId })}
                      className="h-11 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-[#0F172A] flex items-center gap-1 transition-colors whitespace-nowrap"
                    >
                      <Percent className="w-3.5 h-3.5 text-[#64748B]" />
                      Disc
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCartItem(item.productId)}
                      aria-label="Remove item"
                      className="h-11 w-11 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#EF4444] hover:bg-red-100 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Totals & Checkout Box */}
      <div className="p-4 border-t border-slate-200 bg-[#F1F5F9] space-y-3">
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-[#64748B]">
            <span>Subtotal</span>
            <span className="font-semibold text-[#0F172A] tabular-nums">
              {formatPKR(totals.subtotal)}
            </span>
          </div>

          {totals.itemDiscountsTotal > 0 && (
            <div className="flex items-center justify-between text-[#64748B]">
              <span>Item Discounts</span>
              <span className="font-semibold text-[#10B981] tabular-nums">
                -{formatPKR(totals.itemDiscountsTotal)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => setKeypad({ type: 'bill-discount' })}
              className="text-xs font-semibold text-[#0F172A] underline underline-offset-2 hover:text-slate-700 disabled:opacity-40 disabled:no-underline"
            >
              {totals.billDiscount > 0 ? 'Edit Bill Discount' : '+ Add Bill Discount'}
            </button>
            <span className="font-semibold text-[#10B981] tabular-nums">
              {totals.billDiscount > 0 ? `-${formatPKR(totals.billDiscount)}` : 'PKR 0'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => setKeypad({ type: 'cash-tendered' })}
              className="text-xs font-semibold text-[#0F172A] flex items-center gap-1 underline underline-offset-2 hover:text-slate-700 disabled:opacity-40 disabled:no-underline"
            >
              <Banknote className="w-3.5 h-3.5" />
              {cashTendered > 0 ? 'Edit Cash Received' : 'Enter Cash Received'}
            </button>
            <span className="text-xs font-semibold text-[#0F172A] tabular-nums">
              {cashTendered > 0
                ? `${formatPKR(cashTendered)} (Change: ${formatPKR(totals.changeDue)})`
                : 'Optional'}
            </span>
          </div>
        </div>

        <div className="pt-2.5 border-t border-slate-300/80 flex items-baseline justify-between">
          <span className="text-sm font-bold text-[#0F172A]">Grand Total</span>
          <span className="text-2xl sm:text-[1.75rem] font-extrabold tracking-tight text-[#0F172A] tabular-nums">
            {formatPKR(totals.grandTotal)}
          </span>
        </div>

        <button
          type="button"
          disabled={cart.length === 0}
          onClick={handleCheckout}
          className="w-full min-h-[58px] px-5 rounded-xl bg-[#10B981] hover:bg-[#059669] active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-base font-bold flex items-center justify-center gap-2.5 transition-all"
        >
          <Printer className="w-5 h-5" />
          <span>Complete Sale &amp; Print</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative h-full">
      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="fixed top-20 right-6 z-40 px-4 py-3 rounded-xl bg-[#0F172A] text-white text-sm font-semibold shadow-lg">
          {feedbackMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_430px] gap-5 items-start">
        {/* Left Pane: Catalog & Fabric Matrix */}
        <div className="space-y-4 pb-24 lg:pb-6">
          {/* Search + Category Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5">
            <div className="relative">
              <Search className="w-5 h-5 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fabric or item by name or code (e.g. Boski, BOS-001)..."
                className="w-full min-h-[48px] pl-11 pr-11 rounded-xl border border-slate-200 bg-[#F8FAFC] text-sm font-medium text-[#0F172A] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg text-slate-500 hover:text-slate-900 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Rail */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`min-h-[42px] px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#0F172A] text-white'
                        : 'bg-[#F1F5F9] text-[#0F172A] hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <p className="text-base font-bold text-[#0F172A]">No matching items found</p>
              <p className="text-sm text-[#64748B] mt-1">
                Try another search term or select "All" categories.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const outOfStock = product.stock <= 0;
                const lowStock = !outOfStock && product.stock <= product.lowStockThreshold;
                const inCart = cart.find((c) => c.productId === product.id);

                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => handleProductTap(product)}
                    className={`group text-left rounded-2xl border p-4 transition-all flex flex-col justify-between min-h-[168px] ${
                      outOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-65 cursor-not-allowed'
                        : inCart
                        ? 'bg-white border-[#0F172A] ring-1 ring-[#0F172A] shadow-sm'
                        : 'bg-white border-slate-200 hover:border-[#0F172A] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]'
                    }`}
                  >
                    <div>
                      {/* Clean unboxed metadata kicker */}
                      <div className="flex items-center justify-between gap-2 text-xs text-[#64748B]">
                        <span className="truncate font-medium">
                          {product.category} <span aria-hidden="true">·</span>{' '}
                          <span className="font-mono uppercase">{product.code}</span>
                        </span>
                        {inCart && (
                          <span className="font-mono font-bold text-[#10B981] shrink-0 tabular-nums">
                            In Bill: {formatQty(inCart.qty, product.unitType)}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-[#0F172A] mt-1.5 leading-snug line-clamp-2">
                        {product.name}
                      </h3>

                      {product.fabricNote && (
                        <p className="text-xs text-[#64748B] mt-1 truncate">
                          {product.fabricNote}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 mt-3 border-t border-slate-100 flex items-end justify-between gap-2">
                      <div>
                        <div className="text-lg font-extrabold text-[#0F172A] tabular-nums leading-none">
                          {formatPKR(product.sellingPrice)}
                          <span className="text-xs font-semibold text-[#64748B] ml-0.5">
                            {formatUnitShort(product.unitType)}
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-[#64748B] mt-1">
                          {product.unitType === 'meter' ? 'Tap for meter keypad' : 'Tap to add +1 suit'}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {outOfStock ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#EF4444]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Out of Stock
                          </span>
                        ) : lowStock ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#EF4444] tabular-nums">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Low: {formatQty(product.stock, product.unitType)}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-[#64748B] tabular-nums">
                            Stock: {formatQty(product.stock, product.unitType)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Pane: Desktop Sticky Checkout Ledger */}
        <div className="hidden lg:block lg:sticky lg:top-20 lg:h-[calc(100vh-6.25rem)]">
          {CartLedgerPanel}
        </div>
      </div>

      {/* Mobile Sticky Bottom Checkout Trigger (well under 15% viewport cap) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
        <div>
          <div className="text-xs font-medium text-[#64748B] tabular-nums">
            {cart.length} {cart.length === 1 ? 'item' : 'items'} in bill
          </div>
          <div className="text-lg font-extrabold text-[#0F172A] tabular-nums">
            {formatPKR(totals.grandTotal)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="min-h-[48px] px-5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-bold flex items-center gap-2 whitespace-nowrap"
        >
          <ShoppingBag className="w-4 h-4" />
          Review &amp; Tender
        </button>
      </div>

      {/* Mobile Full Cart Drawer */}
      {mobileCartOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-slate-900/50 flex items-end justify-center"
          onClick={() => setMobileCartOpen(false)}
        >
          <div
            className="w-full max-h-[90vh] h-[88vh] bg-white rounded-t-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 bg-[#0F172A] text-white">
              <span className="text-xs font-semibold">Mobile Checkout Drawer</span>
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="h-9 px-3 rounded-lg bg-white/10 text-xs font-bold"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-2">{CartLedgerPanel}</div>
          </div>
        </div>
      )}

      {/* Touch Numeric Keypad Modal */}
      {keypadConfig && (
        <NumericKeypadModal
          isOpen={Boolean(keypad)}
          title={keypadConfig.title}
          subtitle={keypadConfig.subtitle}
          mode={keypadConfig.mode}
          initialValue={keypadConfig.initialValue}
          maxValue={keypadConfig.maxValue}
          maxLabel={keypadConfig.maxLabel}
          unitSuffix={keypadConfig.unitSuffix}
          referenceSubtotal={keypadConfig.referenceSubtotal}
          onConfirm={handleKeypadConfirm}
          onClose={() => setKeypad(null)}
        />
      )}
    </div>
  );
};
