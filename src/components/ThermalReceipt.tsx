import React from 'react';
import { Printer, X } from 'lucide-react';
import { Invoice, ShopSettings } from '../types/pos';
import { formatDateTime, formatPKRCompact, formatQty } from '../utils/format';

interface ThermalReceiptProps {
  invoice: Invoice;
  settings: ShopSettings;
}

export const ThermalReceiptContent: React.FC<ThermalReceiptProps> = ({ invoice, settings }) => {
  return (
    <div className="text-black font-mono text-[11px] leading-snug bg-white">
      {/* Shop Header */}
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <div className="text-[14px] font-bold uppercase tracking-wide">{settings.shopName}</div>
        {settings.shopAddress && <div className="text-[10px] mt-0.5">{settings.shopAddress}</div>}
        {settings.shopPhone && <div className="text-[10px]">Tel: {settings.shopPhone}</div>}
      </div>

      {/* Invoice Meta */}
      <div className="border-b border-dashed border-black pb-2 mb-2 space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Invoice #:</span>
          <span className="font-bold">{invoice.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{formatDateTime(invoice.createdAt)}</span>
        </div>
        {invoice.customerName && (
          <div className="flex justify-between">
            <span>Customer:</span>
            <span className="font-semibold">{invoice.customerName}</span>
          </div>
        )}
        {invoice.customerPhone && (
          <div className="flex justify-between">
            <span>Phone:</span>
            <span>{invoice.customerPhone}</span>
          </div>
        )}
      </div>

      {/* Column Headers */}
      <div className="flex justify-between text-[10px] font-bold border-b border-black pb-1 mb-1.5">
        <span>ITEM / QTY x RATE</span>
        <span>TOTAL</span>
      </div>

      {/* Line Items */}
      <div className="space-y-1.5 border-b border-dashed border-black pb-2 mb-2">
        {invoice.items.map((item, index) => (
          <div key={`${item.productId}_${index}`}>
            <div className="font-bold text-[11px]">{item.name}</div>
            <div className="flex justify-between text-[10px] tabular-nums">
              <span>
                {formatQty(item.qty, item.unitType)} x {formatPKRCompact(item.unitPrice)}
              </span>
              <span className="font-semibold">{formatPKRCompact(item.lineSubtotal)}</span>
            </div>
            {item.itemDiscount > 0 && (
              <div className="flex justify-between text-[10px] tabular-nums">
                <span>Item Discount</span>
                <span>-{formatPKRCompact(item.itemDiscount)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-1 border-b border-dashed border-black pb-2 mb-2 text-[11px] tabular-nums">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>PKR {formatPKRCompact(invoice.subtotal)}</span>
        </div>
        {invoice.totalDiscount > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-PKR {formatPKRCompact(invoice.totalDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between text-[13px] font-bold border-t border-black pt-1 mt-1">
          <span>GRAND TOTAL</span>
          <span>PKR {formatPKRCompact(invoice.grandTotal)}</span>
        </div>
        {invoice.cashTendered !== undefined && invoice.cashTendered > 0 && (
          <>
            <div className="flex justify-between text-[10px] pt-1">
              <span>Cash Received</span>
              <span>PKR {formatPKRCompact(invoice.cashTendered)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span>Change Due</span>
              <span>PKR {formatPKRCompact(invoice.changeDue || 0)}</span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pt-1 space-y-1">
        <div className="font-bold text-[11px]">Thank You for Shopping</div>
        {settings.receiptFooter && (
          <div className="text-[9px] leading-tight">{settings.receiptFooter}</div>
        )}
      </div>
    </div>
  );
};

interface ReceiptPreviewModalProps {
  invoice: Invoice | null;
  settings: ShopSettings;
  onPrint: (invoice: Invoice) => void;
  onClose: () => void;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  invoice,
  settings,
  onPrint,
  onClose,
}) => {
  if (!invoice) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-[#F8FAFC]">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">80mm Thermal Receipt Preview</h3>
            <p className="text-xs text-[#64748B]">{invoice.invoiceNumber}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt preview"
            className="h-11 w-11 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto bg-[#F1F5F9] flex justify-center">
          <div className="w-[80mm] bg-white border border-slate-300 shadow-sm p-4">
            <ThermalReceiptContent invoice={invoice} settings={settings} />
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-bold text-[#0F172A]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onPrint(invoice)}
            className="min-h-[48px] rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
