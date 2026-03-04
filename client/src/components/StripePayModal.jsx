import { useState, useEffect, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { paymentService } from '../services/services';

const stripePk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripePk ? loadStripe(stripePk) : null;

function PaymentForm({ clientSecret, orderTotal, onSuccess, onClose }) {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setLoading(true);
        setError('');
        try {
            // Validate form and submit elements state before confirmation
            const { error: submitError } = await elements.submit();
            if (submitError) {
                setError(submitError.message);
                setLoading(false);
                return;
            }

            const { error: confirmError } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.origin + window.location.pathname + '?payment_success=true',
                },
            });
            if (confirmError) {
                setError(confirmError.message || 'Payment failed');
                setLoading(false);
                return;
            }
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.message || 'Payment failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement options={{ layout: 'tabs' }} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button type="button" onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors order-2 sm:order-1">
                    Cancel
                </button>
                <button type="submit" disabled={!stripe || loading} className="flex-[2] py-3.5 rounded-2xl bg-accent-gradient text-white text-sm font-bold hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 order-1 sm:order-2">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Processing...</span>
                        </div>
                    ) : `Pay $${(orderTotal || 0).toFixed(2)}`}
                </button>
            </div>
        </form>
    );
}

export default function StripePayModal({ orderId, orderTotal, onSuccess, onClose }) {
    const [clientSecret, setClientSecret] = useState(null);
    const [loading, setLoading] = useState(!!orderId);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!orderId || !stripePk) {
            if (!stripePk) setError('Stripe is not configured (VITE_STRIPE_PUBLISHABLE_KEY).');
            return;
        }
        setError('');
        setLoading(true);
        paymentService
            .createPaymentIntent(orderId)
            .then(({ data }) => {
                if (data.data?.clientSecret) setClientSecret(data.data.clientSecret);
                else setError('Could not create payment session');
            })
            .catch((err) => setError(err.response?.data?.error?.message || 'Failed to start payment'))
            .finally(() => setLoading(false));
    }, [orderId]);

    if (!stripePk) {
        return (
            <div className="p-6 text-center">
                <p className="text-sm text-amber-600">Add VITE_STRIPE_PUBLISHABLE_KEY to your .env to accept payments.</p>
                <button type="button" onClick={onClose} className="mt-4 py-2 px-4 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium">Close</button>
            </div>
        );
    }

    const options = useMemo(() => (clientSecret ? { clientSecret, appearance: { theme: 'stripe' } } : null), [clientSecret]);

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-2xl font-black text-gray-900">Checkout</h3>
                    <p className="text-sm text-gray-500 mt-1 uppercase tracking-widest font-bold text-[10px]">Secure encrypted payment</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04kM12 21.48l3.992-4.99a3.333 3.333 0 014.288-1.012 3.333 3.333 0 011.012 4.288L12 21.48z" />
                    </svg>
                </div>
            </div>

            {loading && <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-10 h-10 border-3 border-gray-100 border-t-primary rounded-full animate-spin" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Preparing your session...</p>
            </div>}

            {error && !loading && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <p className="text-sm font-semibold text-red-600">{error}</p>
                </div>
            )}

            {clientSecret && !loading && stripePromise && options && (
                <div className="animate-fade-in">
                    <Elements stripe={stripePromise} options={options}>
                        <PaymentForm clientSecret={clientSecret} orderTotal={orderTotal} onSuccess={onSuccess} onClose={onClose} />
                    </Elements>
                </div>
            )}
        </div>
    );
}
