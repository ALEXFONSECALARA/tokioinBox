import React, { useRef } from 'react';
import { Order, RestaurantConfig } from '../types';
import { formatCurrency, playSoundEffect } from '../utils/helpers';
import { 
  Printer, 
  X, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  Bike, 
  MapPin, 
  Clock, 
  Phone 
} from 'lucide-react';

interface ReceiptPrintModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  config: RestaurantConfig;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  order,
  isOpen,
  onClose,
  config,
}) => {
  const [copied, setCopied] = React.useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const paymentLabels: Record<string, string> = {
    pix: 'PIX (Pagamento Instantâneo)',
    credit_card: 'Cartão de Crédito na Entrega',
    debit_card: 'Cartão de Débito na Entrega',
    cash: 'Dinheiro na Entrega',
    meal_voucher: 'Vale Refeição (VR / Sodexo)',
  };

  const getPlainTextReceipt = (): string => {
    let txt = `========================================\n`;
    txt += `         ${config.name.toUpperCase()}\n`;
    txt += `   ${config.address}\n`;
    txt += `   WhatsApp: ${config.whatsapp}\n`;
    txt += `========================================\n`;
    txt += `PEDIDO #${order.orderNumber} - VIA DE PRODUÇÃO & ENTREGA\n`;
    txt += `Data/Hora: ${new Date(order.createdAt).toLocaleString('pt-BR')}\n`;
    txt += `Tipo: ENTREGA DELIVERY 🛵\n`;
    txt += `========================================\n`;
    txt += `DADOS DO CLIENTE:\n`;
    txt += `Nome: ${order.customer.name}\n`;
    txt += `Telefone: ${order.customer.phone}\n`;
    if (order.customer.address) {
      const a = order.customer.address;
      txt += `Endereço: ${a.street}, ${a.number}\n`;
      if (a.complement) txt += `Complemento: ${a.complement}\n`;
      txt += `Bairro: ${a.neighborhood}\n`;
      txt += `Cidade: ${a.city} - CEP: ${a.cep || 'S/N'}\n`;
      if (a.reference) txt += `Ponto de Ref: ${a.reference}\n`;
    }
    txt += `========================================\n`;
    txt += `ITENS DO PEDIDO:\n`;
    order.items.forEach((item, idx) => {
      txt += `${item.quantity}x ${item.menuItem.name} - ${formatCurrency(item.totalPrice)}\n`;
      if (item.selectedChoices.length > 0) {
        txt += `   Opções: ${item.selectedChoices.map((c) => c.optionName).join(', ')}\n`;
      }
      if (item.selectedExtras.length > 0) {
        txt += `   Adicionais: ${item.selectedExtras.map((e) => `${e.quantity}x ${e.name}`).join(', ')}\n`;
      }
      if (item.specialNotes) {
        txt += `   OBS: ${item.specialNotes}\n`;
      }
    });
    txt += `========================================\n`;
    txt += `Subtotal: ${formatCurrency(order.subtotal)}\n`;
    txt += `Taxa de Entrega: ${order.deliveryFee === 0 ? 'GRÁTIS' : formatCurrency(order.deliveryFee)}\n`;
    if (order.discount > 0) {
      txt += `Desconto (${order.couponCode || 'Cupom'}): -${formatCurrency(order.discount)}\n`;
    }
    txt += `TOTAL: ${formatCurrency(order.total)}\n`;
    txt += `========================================\n`;
    txt += `FORMA DE PAGAMENTO: ${paymentLabels[order.paymentMethod] || order.paymentMethod}\n`;
    if (order.paymentMethod === 'cash' && order.cashChangeFor) {
      txt += `Troco para: ${formatCurrency(order.cashChangeFor)} (Levar: ${formatCurrency(order.cashChangeFor - order.total)})\n`;
    }
    if (order.driver) {
      txt += `ENTREGADOR: ${order.driver.name} (${order.driver.vehicle} - ${order.driver.plate || ''})\n`;
    }
    if (order.notes) {
      txt += `OBS GERAIS: ${order.notes}\n`;
    }
    txt += `========================================\n`;
    txt += `     OBRIGADO PELA PREFERÊNCIA!\n`;
    txt += `========================================\n`;
    return txt;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(getPlainTextReceipt());
    setCopied(true);
    playSoundEffect('beep');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    playSoundEffect('beep');
    window.print();
  };

  const handleDownloadTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([getPlainTextReceipt()], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `comanda_pedido_${order.orderNumber}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">
                Comanda Térmica - Pedido #{order.orderNumber}
              </h3>
              <p className="text-xs text-stone-400">Padrão POS 80mm / 58mm para Cozinha e Despacho</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Paper Preview Container */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-stone-100 flex-1 flex justify-center">
          <div
            ref={printRef}
            id="thermal-receipt-container"
            className="bg-white p-5 w-full max-w-sm rounded-xl shadow-md border border-stone-300 font-mono text-[11px] leading-relaxed text-stone-900 select-text"
          >
            {/* Header POS */}
            <div className="text-center pb-3 border-b-2 border-dashed border-stone-400 space-y-1">
              <p className="font-black text-sm tracking-tight">{config.name.toUpperCase()}</p>
              <p className="text-[10px] text-stone-600">{config.address}</p>
              <p className="text-[10px] text-stone-600">WhatsApp: {config.whatsapp}</p>
              <div className="mt-2 py-1 px-2 bg-stone-900 text-white font-black text-xs rounded">
                PEDIDO #{order.orderNumber} • DELIVERY 🛵
              </div>
              <p className="text-[10px] text-stone-500 mt-1">
                Data: {new Date(order.createdAt).toLocaleDateString('pt-BR')} às{' '}
                {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Customer Details */}
            <div className="py-3 border-b-2 border-dashed border-stone-400 space-y-1 text-[11px]">
              <p className="font-bold uppercase text-stone-800">CLIENTE / ENTREGA:</p>
              <p className="font-semibold text-xs">👤 {order.customer.name}</p>
              <p>📱 {order.customer.phone}</p>
              {order.customer.address && (
                <div className="mt-1 bg-stone-50 p-2 rounded border border-stone-200">
                  <p className="font-bold">
                    📍 {order.customer.address.street}, {order.customer.address.number}
                  </p>
                  {order.customer.address.complement && (
                    <p className="text-stone-600">Comp: {order.customer.address.complement}</p>
                  )}
                  <p className="font-semibold text-stone-800">
                    Bairro: {order.customer.address.neighborhood}
                  </p>
                  <p className="text-stone-500">
                    {order.customer.address.city} • CEP: {order.customer.address.cep || 'S/N'}
                  </p>
                  {order.customer.address.reference && (
                    <p className="text-amber-800 font-medium italic mt-0.5">
                      Ref: {order.customer.address.reference}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="py-3 border-b-2 border-dashed border-stone-400 space-y-2">
              <p className="font-bold uppercase text-stone-800">ITENS:</p>
              {order.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5 pb-1 border-b border-stone-100 last:border-0">
                  <div className="flex justify-between font-bold text-xs">
                    <span>{item.quantity}x {item.menuItem.name}</span>
                    <span>{formatCurrency(item.totalPrice)}</span>
                  </div>
                  {item.selectedChoices.length > 0 && (
                    <p className="text-[10px] text-stone-600 pl-3">
                      • {item.selectedChoices.map((c) => c.optionName).join(', ')}
                    </p>
                  )}
                  {item.selectedExtras.length > 0 && (
                    <p className="text-[10px] text-stone-600 pl-3">
                      + {item.selectedExtras.map((e) => `${e.quantity}x ${e.name}`).join(', ')}
                    </p>
                  )}
                  {item.specialNotes && (
                    <p className="text-[10px] text-amber-900 font-bold bg-amber-50 p-1 rounded mt-0.5">
                      ⚠️ OBS: {item.specialNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-3 border-b-2 border-dashed border-stone-400 space-y-1 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Taxa de Entrega:</span>
                <span>{order.deliveryFee === 0 ? 'GRÁTIS' : formatCurrency(order.deliveryFee)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Desconto ({order.couponCode || 'Cupom'}):</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-1.5 border-t border-stone-300 text-stone-950">
                <span>TOTAL:</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Payment & Driver */}
            <div className="py-3 border-b-2 border-dashed border-stone-400 space-y-1 text-[11px]">
              <p className="font-bold text-stone-800">PAGAMENTO:</p>
              <p className="font-semibold text-xs text-stone-900">
                💳 {paymentLabels[order.paymentMethod] || order.paymentMethod}
              </p>
              {order.paymentMethod === 'cash' && order.cashChangeFor && (
                <p className="font-bold text-amber-900 bg-amber-50 p-1 rounded">
                  💵 Troco para {formatCurrency(order.cashChangeFor)} (Levar troco de{' '}
                  {formatCurrency(order.cashChangeFor - order.total)})
                </p>
              )}
              {order.driver && (
                <div className="mt-2 pt-2 border-t border-stone-200">
                  <p className="font-bold text-stone-800">MOTOBOY / ENTREGA:</p>
                  <p className="font-semibold">🛵 {order.driver.name}</p>
                  <p className="text-stone-600">{order.driver.vehicle} • Placa: {order.driver.plate || 'S/N'}</p>
                </div>
              )}
            </div>

            {/* Footer POS */}
            <div className="text-center pt-3 space-y-1">
              <p className="font-bold text-xs">OBRIGADO PELA PREFERÊNCIA!</p>
              <p className="text-[10px] text-stone-500">Impresso via Sistema Delivery Express</p>
              <div className="text-stone-300 text-center select-none pt-1">
                - - - - - - CORTE AQUI - - - - - -
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-white border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
            <button
              onClick={handleDownloadTxt}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Baixar .TXT</span>
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-xs transition-transform active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Comanda (Ctrl+P)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
