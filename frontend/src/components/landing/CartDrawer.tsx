import { useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import { toast } from '../../lib/toast';

export function CartDrawer() {
  const { isOpen, items, closeCart, getTotal, removeItem } = useCartStore();
  const [showTransferForm, setShowTransferForm] = useState(false);

  if (!isOpen) return null;

  const total = getTotal();

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-[100] transition-opacity" 
        onClick={closeCart} 
        aria-hidden="true"
      />
      <div 
        className="fixed inset-y-0 right-0 w-full max-w-sm bg-[var(--bg-card)] shadow-2xl z-[101] flex flex-col transition-transform duration-300 transform translate-x-0 border-l border-[var(--border-color)]"
        role="dialog"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-bold text-[var(--text-main)]">Kosár</h2>
          <button 
            type="button" 
            onClick={closeCart}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-2xl font-bold px-2"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          {items.length === 0 ? (
            <div className="text-[var(--text-muted)] text-center mt-10">
              A kosár üres. Válassz egy csomagot az Árak és Vásárlás szekcióból.
            </div>
          ) : (
            <>
              {!showTransferForm ? (
                <>
                  <ul className="space-y-4 flex-1">
                    {items.map(item => (
                      <li key={item.id} className="flex justify-between items-center bg-[var(--bg-input)] p-4 rounded-xl border border-[var(--border-color)]">
                        <div>
                          <div className="font-semibold text-[var(--text-main)]">{item.title}</div>
                          <div className="text-sm text-[var(--text-muted)]">Mennyiség: {item.quantity}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">{(item.price * item.quantity).toLocaleString('hu-HU')} Ft</div>
                          <button 
                            onClick={() => removeItem(item.id)}
                            className="text-xs text-red-500 hover:underline mt-1"
                          >
                            Törlés
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="border-t border-[var(--border-color)] p-4 space-y-4">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-lg font-bold text-[var(--text-main)]">Összesen:</span>
                      <span className="text-xl font-bold text-primary">{total.toLocaleString('hu-HU')} Ft</span>
                    </div>
                    
                    <button 
                      type="button"
                      className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded transition-colors"
                      onClick={() =>
                        toast.neutral(
                          'A bankkártyás fizetés folyamatban — addig egyeztess utalással vagy írj az info@vbfpremium.hu címre.'
                        )
                      }
                    >
                      Megrendelés folytatása
                    </button>
                    
                    <div className="mt-4 space-y-3">
                      <p className="text-xs text-[var(--text-muted)] text-center">
                        A jegyzőkönyvek tartalmáért kizárólag én vállalok felelősséget. Vállalkozóként vagy jogi személyként üzleti célból vásárolok.
                      </p>
                      <button 
                        className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] hover:bg-[var(--bg-main)] text-[var(--text-main)] font-semibold py-3 px-4 rounded-xl transition-colors"
                        onClick={() => setShowTransferForm(true)}
                      >
                        Utalásos fizetés – számla kérése
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col pt-2">
                  <h3 className="text-lg font-bold text-[var(--text-main)] mb-4">Utalásos számla kérése</h3>
                  
                  <div className="space-y-4 flex-1">
                    <div>
                      <label className="block text-sm font-semibold text-[var(--text-main)] mb-1">E-mail *</label>
                      <input type="email" className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] rounded-xl outline-none focus:ring-2 focus:ring-primary/50" placeholder="pelda@ceg.hu" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[var(--text-main)] mb-1">Név / Cégnév *</label>
                      <input type="text" className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] rounded-xl outline-none focus:ring-2 focus:ring-primary/50" placeholder="Kovács Kft." />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[var(--text-main)] mb-1">Számlázási cím *</label>
                      <input type="text" className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] rounded-xl outline-none focus:ring-2 focus:ring-primary/50" placeholder="Irányítószám, város, utca, házszám" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[var(--text-main)] mb-1">Adószám (opcionális)</label>
                      <input type="text" className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] rounded-xl outline-none focus:ring-2 focus:ring-primary/50" placeholder="Céges vásárlás esetén" />
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    <button 
                      type="button"
                      className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded transition-colors"
                      onClick={() => {
                        toast.success('Kérés rögzítve — éles üzemben e-mailben visszaigazoljuk a számlaadatokat.');
                        setShowTransferForm(false);
                      }}
                    >
                      Számla kérése utaláshoz
                    </button>
                    <button 
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] hover:bg-[var(--bg-input)] text-[var(--text-muted-strong)] font-semibold py-3 px-4 rounded-xl transition-colors"
                      onClick={() => setShowTransferForm(false)}
                    >
                      ← Vissza a kosárhoz
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
