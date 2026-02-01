// Configuration
const STRIPE_PK = "pk_live_51SsY1YJND8CIumcoDgm4GlwpRQXpqWpt9ijhsdPOqLyQ24vJO5EkzNKpqoy6nOVlHo2wfuoTYqNuLdVV9HZA4lil00C35usxSi";
const BACKEND_URL = "https://recraftr.com";

function PaymentApp() {
    const [user, setUser] = React.useState(null);
    const [stripe, setStripe] = React.useState(null);
    const [elements, setElements] = React.useState(null);
    const [cardElement, setCardElement] = React.useState(null);
    
    const [loading, setLoading] = React.useState(true);
    const [processing, setProcessing] = React.useState(false);
    const [success, setSuccess] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState('');
    const [isConfigError, setIsConfigError] = React.useState(false);

    // Initialize User
    React.useEffect(() => {
        const initUser = async () => {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                window.location.href = 'login.html?redirect=payment.html';
                return;
            }
            setUser(currentUser);
            setLoading(false);
        };
        initUser();
    }, []);

    // Initialize Stripe
    React.useEffect(() => {
        if (!window.Stripe) {
            console.error("Stripe.js not loaded");
            return;
        }
        
        const stripeInstance = window.Stripe(STRIPE_PK);
        setStripe(stripeInstance);
        
        const elementsInstance = stripeInstance.elements();
        setElements(elementsInstance);

        // Create and mount the card element
        const style = {
            base: {
                color: '#18181B',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                fontSmoothing: 'antialiased',
                fontSize: '16px',
                '::placeholder': {
                    color: '#A1A1AA'
                },
                backgroundColor: 'transparent'
            },
            invalid: {
                color: '#D93025',
                iconColor: '#D93025'
            }
        };

        const card = elementsInstance.create('card', { style: style, hidePostalCode: true });
        setCardElement(card);
        
    }, []);

    // Mount Card Element when DOM is ready and stripe is initialized
    React.useEffect(() => {
        if (cardElement && !loading && document.getElementById('card-element')) {
            cardElement.mount('#card-element');
        }
    }, [cardElement, loading]);

    const handleSuccess = async (txId = 'mock_tx_123') => {
        setProcessing(true);
        try {
            // Update Database
            await safeUpdateObject('user', user.id, { 
                ...user, 
                is_premium: true
            });
            
            await safeCreateObject('usage_history', {
                user_id: user.id,
                action: 'subscription_started',
                amount: 15,
                details: `Creator Plan ($15.00) - TxID: ${txId}`
            });

            setSuccess(true);
            setProcessing(false);
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
        } catch (e) {
            console.error(e);
            setErrorMsg("Failed to update user record.");
            setProcessing(false);
        }
    };

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!stripe || !elements || !cardElement) return;

        setProcessing(true);
        setErrorMsg('');
        setIsConfigError(false);

        try {
            // 1. Create Payment Intent on Backend
            const response = await fetch(`${BACKEND_URL}/api/create-payment-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 1500 }) // $15.00
            });

            if (!response.ok) {
                let errorDetails = `Backend Error (${response.status})`;
                try {
                    const errorJson = await response.json();
                    if (errorJson.error) {
                        errorDetails = errorJson.error;
                        // Check for common config errors
                        if (errorDetails.includes('provide an API key') || errorDetails.includes('STRIPE_SECRET_KEY')) {
                            setIsConfigError(true);
                        }
                    }
                } catch (e) {}
                throw new Error(errorDetails);
            }

            const { clientSecret } = await response.json();

            // 2. Confirm Card Payment
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: user.name,
                        email: user.email
                    }
                }
            });

            if (result.error) {
                console.error(result.error.message);
                setErrorMsg(`Stripe: ${result.error.message}`);
                setProcessing(false);
            } else {
                if (result.paymentIntent.status === 'succeeded') {
                    await handleSuccess(result.paymentIntent.id);
                }
            }

        } catch (err) {
            console.error(err);
            setErrorMsg(err.message || "Connection error. Please try again.");
            if (err.message && (err.message.includes('provide an API key') || err.message.includes('API key'))) {
                setIsConfigError(true);
            }
            setProcessing(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-color)]"><div className="icon-loader animate-spin text-[var(--primary-color)]"></div></div>;

    if (success) {
        return (
            <div className="min-h-screen flex flex-col bg-[var(--bg-color)]">
                <Header user={user} />
                <main className="flex-1 flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
                        <div className="w-20 h-20 bg-[var(--primary-color)] rounded-full flex items-center justify-center mx-auto text-[var(--primary-text)] shadow-lg shadow-black/5">
                            <div className="icon-check text-4xl"></div>
                        </div>
                        <h1 className="text-3xl font-bold font-sans text-[var(--text-main)]">Access Granted</h1>
                        <p className="text-[var(--text-muted)]">Transaction confirmed. Welcome to the Creator Plan.</p>
                        <div className="pt-4">
                            <button onClick={() => window.location.href = 'index.html'} className="btn btn-primary w-full">Enter Workspace</button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[var(--bg-color)]">
            <Header user={user} />
            
            <main className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full p-6 gap-12 py-12">
                
                {/* Left: Summary */}
                <div className="md:w-1/3 space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-4 font-sans text-[var(--text-main)]">Upgrade to Creator</h1>
                        <p className="text-[var(--text-muted)] text-lg">Unrestricted access to the transformation engine.</p>
                    </div>

                    <div className="bg-[var(--surface-color)] p-8 border border-[var(--border-color)] rounded-xl space-y-6 relative shadow-xl shadow-black/5">
                        <div className="absolute top-0 right-0 bg-[var(--primary-color)] text-[var(--primary-text)] text-[10px] font-bold px-2 py-1 uppercase tracking-widest rounded-bl-lg rounded-tr-lg">Active Choice</div>
                        <div className="flex justify-between items-baseline border-b border-[var(--border-color)] pb-4">
                            <span className="font-bold text-lg text-[var(--text-main)] uppercase tracking-wide">Creator Plan</span>
                            <span className="text-2xl font-bold text-[var(--primary-color)] font-mono">$15<span className="text-sm text-[var(--text-muted)] font-sans">/mo</span></span>
                        </div>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3 text-sm text-[var(--text-main)]">
                                <div className="icon-check text-[var(--primary-color)]"></div>
                                <span>Unlimited Operations</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-[var(--text-main)]">
                                <div className="icon-check text-[var(--primary-color)]"></div>
                                <span>All Platform Targets</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-[var(--text-main)]">
                                <div className="icon-check text-[var(--primary-color)]"></div>
                                <span>Advanced AI Models</span>
                            </li>
                        </ul>
                    </div>
                    
                    <div className="text-xs text-[var(--text-muted)] opacity-60">
                        <p>Secure payment processed by Stripe. We do not store your card details.</p>
                    </div>
                </div>

                {/* Right: Payment Form */}
                <div className="md:w-2/3">
                    <div className="bg-[var(--surface-color)] border border-[var(--border-color)] p-8 shadow-xl rounded-xl">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-bold font-sans text-[var(--text-main)]">Secure Payment</h2>
                            <div className="flex gap-2">
                                <div className="h-6 bg-[var(--bg-color)] border border-[var(--border-color)] px-2 flex items-center text-[10px] font-mono text-[var(--success-color)] uppercase border-[var(--success-color)] rounded">
                                    <div className="icon-lock w-3 h-3 mr-1"></div>
                                    Encrypted_SSL
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubscribe} className="space-y-6">
                            
                            {/* Stripe Card Element Container */}
                            <div className="space-y-4">
                                <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-[var(--text-muted)]">
                                    Card Details
                                </label>
                                <div 
                                    id="card-element" 
                                    className="w-full rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-color)] px-4 py-4 min-h-[50px] transition-colors focus-within:border-[var(--primary-color)] focus-within:ring-1 focus-within:ring-[var(--primary-color)]"
                                >
                                    {/* Stripe Element mounts here */}
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex flex-col items-start gap-2 rounded-[var(--radius-md)]">
                                    <div className="flex items-center gap-2 font-bold">
                                         <div className="icon-triangle-alert mt-0.5"></div>
                                         <span>Processing Error</span>
                                    </div>
                                    <p>{errorMsg}</p>
                                    
                                    {isConfigError && (
                                        <div className="mt-2 p-3 bg-black/20 rounded w-full text-xs text-red-300 border border-red-500/20">
                                            <strong>Developer Note:</strong> The backend is missing the <code>STRIPE_SECRET_KEY</code>.
                                            <ul className="list-disc ml-4 mt-1 space-y-1">
                                                <li>Check your Vercel/Hosting Environment Variables.</li>
                                                <li>Ensure the key starts with <code>sk_test_...</code> or <code>sk_live_...</code>.</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="pt-6">
                                <button 
                                    type="submit" 
                                    disabled={processing || !stripe}
                                    className="w-full btn btn-primary py-4 text-lg shadow-lg hover:shadow-black/10 rounded-full"
                                >
                                    {processing ? (
                                        <div className="flex items-center gap-2">
                                            <div className="icon-loader animate-spin"></div>
                                            Processing Transaction...
                                        </div>
                                    ) : (
                                        `Pay $15.00`
                                    )}
                                </button>
                                
                                {isConfigError && (
                                    <button
                                        type="button"
                                        onClick={() => handleSuccess('test_bypass_tx')}
                                        className="w-full mt-4 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-widest border border-dashed border-[var(--border-color)] py-2 hover:bg-[var(--surface-color)]"
                                    >
                                        [DEV: Bypass Payment & Activate]
                                    </button>
                                )}
                            </div>

                        </form>
                    </div>
                </div>

            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<PaymentApp />);