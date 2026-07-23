'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import { Plus, DollarSign, Calendar, Tag, UserCheck, CreditCard, Building2, AlertCircle, Trash2, Edit, Save, X } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  category: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  notes: string | null;
}

interface Expense {
  id: string;
  vendor_id: string | null;
  concept: string;
  category: string;
  currency: string;
  budget_amount: number | null;
  contracted_amount: number | null;
  total_amount: number | null;
  payment_status: string;
  due_date: string | null;
  responsible: string | null;
  notes: string | null;
}

interface ExpensePayment {
  id: string;
  expense_id: string;
  amount: number | null;
  currency: string;
  payment_date: string | null;
  payment_type: string | null;
  status: string;
  reference: string | null;
  notes: string | null;
}

export default function FinancePage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<ExpensePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'expenses' | 'vendors' | 'payments'>('expenses');

  // Modal State
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);

  const [vForm, setVForm] = useState({ name: '', category: 'Locación', status: 'Contratado', notes: '' });
  const [eForm, setEForm] = useState({ concept: '', category: 'Locación', vendor_id: '', total_amount: '', due_date: '', responsible: 'Felipe & Camila' });
  const [pForm, setPForm] = useState({ expense_id: '', amount: '', payment_type: 'Transferencia', status: 'Pagado', notes: '' });

  async function loadFinanceData() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: vData } = await supabase.from('vendors').select('*').order('name');
      const { data: eData } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      const { data: pData } = await supabase.from('expense_payments').select('*').order('created_at', { ascending: false });

      if (vData) setVendors(vData as Vendor[]);
      if (eData) setExpenses(eData as Expense[]);
      if (pData) setPayments(pData as ExpensePayment[]);
    } catch (err) {
      console.error('Error loading finance data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinanceData();
  }, []);

  // Financial Calculations Separated by Currency (CLP vs UF)
  const paymentsCLP = payments.filter(p => p.currency === 'CLP' && p.status === 'Pagado');
  const paymentsUF = payments.filter(p => p.currency === 'UF' && p.status === 'Pagado');

  const totalPaidCLP = paymentsCLP.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalPaidUF = paymentsUF.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const expensesCLP = expenses.filter(e => e.currency === 'CLP');
  const expensesUF = expenses.filter(e => e.currency === 'UF');

  const totalContractedCLP = expensesCLP.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);
  const totalContractedUF = expensesUF.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);

  const itemsWithoutAmountCLP = expensesCLP.filter(e => e.total_amount === null || e.total_amount === undefined).length;
  const itemsWithoutAmountUF = expensesUF.filter(e => e.total_amount === null || e.total_amount === undefined).length;

  const totalBalanceCLP = totalContractedCLP - totalPaidCLP;
  const totalBalanceUF = totalContractedUF - totalPaidUF;

  async function handleAddVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!vForm.name) return;
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: vForm.name,
          category: vForm.category,
          status: vForm.status,
          notes: vForm.notes || null
        })
      });

      if (res.ok) {
        setShowAddVendor(false);
        setVForm({ name: '', category: 'Locación', status: 'Contratado', notes: '' });
        loadFinanceData();
      }
    } catch (err) {
      console.error('Error adding vendor:', err);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!eForm.concept) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: eForm.concept,
          category: eForm.category,
          vendor_id: eForm.vendor_id || null,
          total_amount: eForm.total_amount ? Number(eForm.total_amount) : null,
          due_date: eForm.due_date || null,
          responsible: eForm.responsible || null,
          payment_status: 'Pendiente'
        })
      });

      if (res.ok) {
        setShowAddExpense(false);
        setEForm({ concept: '', category: 'Locación', vendor_id: '', total_amount: '', due_date: '', responsible: 'Felipe & Camila' });
        loadFinanceData();
      }
    } catch (err) {
      console.error('Error adding expense:', err);
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!pForm.expense_id || !pForm.amount) return;
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_id: pForm.expense_id,
          amount: Number(pForm.amount),
          currency: 'CLP',
          payment_date: new Date().toISOString().substring(0, 10),
          payment_type: pForm.payment_type,
          status: pForm.status,
          notes: pForm.notes || null
        })
      });

      if (res.ok) {
        setShowAddPayment(false);
        setPForm({ expense_id: '', amount: '', payment_type: 'Transferencia', status: 'Pagado', notes: '' });
        loadFinanceData();
      }
    } catch (err) {
      console.error('Error adding payment:', err);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!confirm('¿Confirmas que deseas eliminar este registro de pago?')) return;
    try {
      const res = await fetch(`/api/payments?id=${paymentId}`, { method: 'DELETE' });
      if (res.ok) {
        loadFinanceData();
      }
    } catch (err) {
      console.error('Error deleting payment:', err);
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-[var(--accent-gold)] font-semibold block">
              Control de Presupuesto & Pagos Multi-moneda
            </span>
            <h1 className="font-serif text-3xl text-[var(--text-primary)] mt-1">
              Finanzas & Proveedores
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAddVendor(true)} className="btn-secondary flex items-center gap-2">
              <Building2 size={14} /> Nuevo Proveedor
            </button>
            <button onClick={() => setShowAddExpense(true)} className="btn-secondary flex items-center gap-2">
              <Plus size={14} /> Registrar Gasto
            </button>
            <button onClick={() => setShowAddPayment(true)} className="btn-primary flex items-center gap-2">
              <DollarSign size={14} /> Registrar Pago
            </button>
          </div>
        </div>

        {/* Financial KPI Cards - Separated by Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="kpi-card">
            <span className="kpi-title flex items-center gap-2 text-[#2D5A27]">
              <DollarSign size={14} /> Pagado (CLP / UF)
            </span>
            <div className="kpi-value text-[#2D5A27] text-2xl">${totalPaidCLP.toLocaleString('es-CL')} CLP</div>
            <span className="text-xs text-[var(--text-secondary)] mt-1 block">
              {totalPaidUF > 0 ? `${totalPaidUF} UF pagadas` : '0 UF pagadas'}
            </span>
          </div>

          <div className="kpi-card">
            <span className="kpi-title flex items-center gap-2">
              Contratado CLP
            </span>
            <div className="kpi-value text-2xl">${totalContractedCLP.toLocaleString('es-CL')} CLP</div>
            <span className="text-xs text-[var(--text-secondary)] mt-1 block">
              {totalContractedUF > 0 ? `${totalContractedUF} UF contratadas` : 'Sin contratos en UF'}
            </span>
          </div>

          <div className="kpi-card">
            <span className="kpi-title flex items-center gap-2 text-[#8E703E]">
              Saldo CLP
            </span>
            <div className="kpi-value text-[#8E703E] text-2xl">
              {itemsWithoutAmountCLP > 0 ? (
                <span className="text-[#A83232] font-semibold italic text-lg">POR COMPLETAR</span>
              ) : (
                `$${totalBalanceCLP.toLocaleString('es-CL')} CLP`
              )}
            </div>
            <span className="text-xs text-[var(--text-secondary)] mt-1 block">
              {totalBalanceUF > 0 ? `Saldo UF: ${totalBalanceUF} UF` : 'Saldo UF: 0 UF'}
            </span>
          </div>

          <div className="kpi-card border-l-4 border-l-[#A83232]">
            <span className="kpi-title flex items-center gap-2 text-[#A83232]">
              <AlertCircle size={14} /> Montos Por Confirmar
            </span>
            <div className="kpi-value text-[#A83232]">{itemsWithoutAmountCLP + itemsWithoutAmountUF}</div>
            <span className="text-xs text-[var(--text-secondary)] mt-1 block">Conceptos sin monto total</span>
          </div>
        </div>

        {/* View Selector Tabs */}
        <div className="flex border-b border-[var(--border-color)]">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'expenses' ? 'border-[var(--text-primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)]'
            }`}
          >
            Gastos ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'vendors' ? 'border-[var(--text-primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)]'
            }`}
          >
            Proveedores ({vendors.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all ${
              activeTab === 'payments' ? 'border-[var(--text-primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-secondary)]'
            }`}
          >
            Historial de Pagos ({payments.length})
          </button>
        </div>

        {/* TAB 1: GASTOS */}
        {activeTab === 'expenses' && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Categoría</th>
                  <th>Proveedor</th>
                  <th>Monto Total</th>
                  <th>Estado Pago</th>
                  <th>Vencimiento</th>
                  <th>Responsable</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => {
                  const vendor = vendors.find(v => v.id === e.vendor_id);
                  return (
                    <tr key={e.id}>
                      <td className="font-semibold text-[var(--text-primary)]">{e.concept}</td>
                      <td>{e.category}</td>
                      <td>{vendor?.name || 'No asignado'}</td>
                      <td>{e.total_amount ? `$${e.total_amount.toLocaleString('es-CL')} ${e.currency}` : <span className="text-[#A83232] font-semibold italic text-xs">POR COMPLETAR</span>}</td>
                      <td>
                        <span className="badge badge-pending">{e.payment_status}</span>
                      </td>
                      <td>{e.due_date || 'Por definir'}</td>
                      <td>{e.responsible || 'Felipe & Camila'}</td>
                      <td className="text-xs text-[var(--text-secondary)]">{e.notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: PROVEEDORES */}
        {activeTab === 'vendors' && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Categoría</th>
                  <th>Contacto</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id}>
                    <td className="font-semibold text-[var(--text-primary)]">{v.name}</td>
                    <td>{v.category}</td>
                    <td>{v.contact_name || '-'}</td>
                    <td>{v.phone || '-'}</td>
                    <td>
                      <span className="badge badge-confirmed">{v.status}</span>
                    </td>
                    <td className="text-xs text-[var(--text-secondary)]">{v.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: PAGOS */}
        {activeTab === 'payments' && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha Pago</th>
                  <th>Tipo / Concepto</th>
                  <th>Monto</th>
                  <th>Moneda</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.payment_date || 'Por definir'}</td>
                    <td className="font-semibold">{p.payment_type}</td>
                    <td className="font-semibold text-[#2D5A27]">
                      {p.amount ? `$${p.amount.toLocaleString('es-CL')}` : <span className="text-[#A83232] italic">POR COMPLETAR</span>}
                    </td>
                    <td>{p.currency}</td>
                    <td>
                      <span className="badge badge-confirmed">{p.status}</span>
                    </td>
                    <td>
                      <button onClick={() => handleDeletePayment(p.id)} className="text-[var(--text-muted)] hover:text-[#A83232] p-1">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Registrar Pago */}
        {showAddPayment && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 w-full max-w-md space-y-4">
              <h3 className="font-serif text-xl border-b border-[var(--border-color)] pb-3">Registrar Pago</h3>
              <form onSubmit={handleAddPayment} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Concepto de Gasto</label>
                  <select
                    required
                    value={pForm.expense_id}
                    onChange={(e) => setPForm({ ...pForm, expense_id: e.target.value })}
                    className="w-full bg-transparent border border-[var(--border-color)] p-2 focus:outline-none"
                  >
                    <option value="">Seleccionar gasto...</option>
                    {expenses.map(e => (
                      <option key={e.id} value={e.id}>{e.concept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Monto CLP</label>
                  <input
                    type="number"
                    required
                    value={pForm.amount}
                    onChange={(e) => setPForm({ ...pForm, amount: e.target.value })}
                    className="w-full bg-transparent border border-[var(--border-color)] p-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Tipo de Pago</label>
                  <select
                    value={pForm.payment_type}
                    onChange={(e) => setPForm({ ...pForm, payment_type: e.target.value })}
                    className="w-full bg-transparent border border-[var(--border-color)] p-2 focus:outline-none"
                  >
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Efectivo">Efectivo</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddPayment(false)} className="btn-secondary">Cancelar</button>
                  <button type="submit" className="btn-primary">Guardar Pago</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
