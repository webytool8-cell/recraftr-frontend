// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ProfileApp ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-color)]">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-[var(--text-main)] mb-4">Error</h1>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProfileApp() {
    const [user, setUser] = React.useState(null);
    const [history, setHistory] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch current user
                const currentUser = await getCurrentUser();
                
                if (currentUser) {
                    setUser(currentUser);
                    
                    // Fetch history
                    try {
                        const historyRes = await safeListObjects('usage_history', 50, true);
                        if (historyRes && historyRes.items) {
                            // Filter history for this user
                            const userHistory = historyRes.items
                                .map(item => item.objectData)
                                .filter(h => h.user_id === currentUser.id);
                            setHistory(userHistory);
                        }
                    } catch (hErr) {
                        console.warn("Failed to load history", hErr);
                    }
                } else {
                    // No user logged in
                    setError("Not logged in");
                    window.location.href = 'login.html';
                }
            } catch (err) {
                console.error("Failed to fetch profile data", err);
                setError(err.message || "Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleBuyCredits = async (amount) => {
        // ... Logic preserved but UI updated
        // For new model, we just push to subscription usually, but let's keep credit buying logic for fallback
        // Just updating visual wrapper mostly
        if (!user) return;
        try {
            const newCredits = (user.credits || 0) + amount;
            await safeUpdateObject('user', user.id, { ...user, credits: newCredits });
            await safeCreateObject('usage_history', {
                user_id: user.id,
                action: 'buy_credits',
                amount: amount,
                details: `Purchased ${amount} credits`
            });
            setUser(prev => ({ ...prev, credits: newCredits }));
            alert(`Successfully added ${amount} credits!`);
            setHistory(prev => [{
                user_id: user.id,
                action: 'buy_credits',
                amount: amount,
                details: `Purchased ${amount} credits`
            }, ...prev]);
        } catch (error) {
            console.error("Purchase failed", error);
            alert("Purchase failed. Please try again.");
        }
    };
    
    const handleLogout = () => {
        logout();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-color)]">
                <div className="icon-loader animate-spin text-2xl text-[var(--primary-color)]"></div>
            </div>
        );
    }

    if (!user) {
        return null; // Redirecting...
    }

    return (
        <div className="min-h-screen flex flex-col bg-[var(--bg-color)]" data-name="profile-app">
            <Header user={user} />
            
            <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 space-y-12">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center gap-8 border-b border-[var(--border-color)] pb-8">
                    <img 
                        src={user.avatar_url || 'https://via.placeholder.com/150'} 
                        alt={user.name || 'User'} 
                        className="w-24 h-24 rounded-full border-2 border-[var(--border-color)] object-cover grayscale" 
                    />
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold mb-1 font-sans text-[var(--text-main)]">{user.name || 'Anonymous User'}</h1>
                        <p className="text-[var(--text-muted)] font-mono text-sm">{user.email || 'No email provided'}</p>
                        <div className="flex items-center gap-4 mt-4">
                            <span className={`px-3 py-1 rounded-[var(--radius-md)] text-xs font-bold uppercase tracking-wider ${user.is_premium ? 'bg-[var(--primary-color)] text-[var(--primary-text)]' : 'bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--text-muted)]'}`}>
                                {user.is_premium ? 'Creator Plan' : 'Free Plan'}
                            </span>
                            {!user.is_premium && (
                                <a href="payment.html" className="text-sm text-[var(--primary-color)] font-bold hover:underline font-sans">UPGRADE</a>
                            )}
                        </div>
                    </div>
                    <div>
                        <button 
                            onClick={handleLogout}
                            className="btn btn-secondary text-[var(--error-color)] border-[var(--border-color)] hover:border-[var(--error-color)] hover:text-[var(--error-color)]"
                        >
                            Log Out
                        </button>
                    </div>
                </div>

                {/* Credits Section - Simplified for this model */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold font-sans text-[var(--text-main)]">Subscription Status</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="card p-6">
                            <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mb-2">Plan Access</p>
                            <div className="text-2xl font-bold text-[var(--text-main)] font-sans">
                                {user.is_premium ? 'Unlimited' : 'Limited (5/day)'}
                            </div>
                        </div>
                         {!user.is_premium && (
                            <div className="card p-6 border-[var(--primary-color)] bg-[var(--surface-color)]">
                                <h3 className="font-bold text-lg mb-2 text-[var(--text-main)]">Remove Limits</h3>
                                <p className="text-sm text-[var(--text-muted)] mb-4">Upgrade to the Creator plan for unrestricted access.</p>
                                <a href="payment.html" className="btn btn-primary w-full py-2 text-sm">Upgrade Now</a>
                            </div>
                        )}
                    </div>
                </section>
                
                {/* Usage History */}
                {history.length > 0 && (
                    <section>
                        <h2 className="text-xl font-bold mb-6 font-sans text-[var(--text-main)]">System Log</h2>
                        <div className="card overflow-hidden">
                            <div className="divide-y divide-[var(--border-color)]">
                                {history.map((item, idx) => (
                                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-[var(--surface-color)] transition-colors">
                                        <div>
                                            <p className="font-mono text-xs text-[var(--text-main)] uppercase tracking-wide">
                                                {item.action ? item.action.replace('_', ' ') : 'Action'}
                                            </p>
                                            <p className="text-sm text-[var(--text-muted)] mt-1">{item.details}</p>
                                        </div>
                                        <div className="text-xs font-mono text-[var(--text-muted)]">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* Settings */}
                <section>
                     <h2 className="text-xl font-bold mb-6 font-sans text-[var(--text-main)]">Account</h2>
                     <div className="card divide-y divide-[var(--border-color)]">
                         <div className="p-6 flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-[var(--text-main)] text-sm">Delete Account</h4>
                                <p className="text-xs text-[var(--text-muted)] mt-1">Permanently remove data.</p>
                            </div>
                            <button className="text-sm text-[var(--error-color)] font-bold hover:underline uppercase tracking-wide">Delete</button>
                        </div>
                     </div>
                </section>
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <ProfileApp />
    </ErrorBoundary>
);