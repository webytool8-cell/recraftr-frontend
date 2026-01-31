function LoginApp() {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = React.useState(false); 
    const [authMode, setAuthMode] = React.useState('signin'); 
    
    const logo = getCurrentLogo();

    React.useEffect(() => {
        // Redirect if already logged in
        const checkSession = async () => {
            const user = await getCurrentUser();
            if (user) {
                window.location.href = 'index.html';
            }
        };
        checkSession();
    }, []);

    const handleAuth = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            alert("Please enter both email and password.");
            return;
        }
        
        setIsLoading(true);
        try {
            if (authMode === 'signup') {
                await registerWithEmailAndPassword(email, password);
            } else {
                try {
                    await loginWithEmailAndPassword(email, password);
                } catch (err) {
                    // Helpful error handling
                    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                        alert("User not found or incorrect password. Did you mean to Sign Up?");
                    } else {
                        throw err;
                    }
                    setIsLoading(false);
                    return;
                }
            }
            window.location.href = 'index.html';
        } catch (err) {
            console.error(err);
            alert(err.message || 'Authentication failed.');
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        // IMPORTANT: Do not unmount the button (via setAuthMode) before the popup triggers.
        // Browsers block popups if the triggering element is removed or if the stack is lost.
        setIsGoogleLoading(true);
        try {
            await loginWithGoogle();
            window.location.href = 'index.html';
        } catch (err) {
            console.error(err);
            // Only alert if it's not a closed-popup-by-user error to reduce noise
            if (err.code !== 'auth/popup-closed-by-user') {
                 alert('Google sign in failed: ' + err.message);
            }
            setIsGoogleLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--bg-color)]">
            <div className="w-full max-w-md bg-[var(--surface-color)] border border-[var(--border-color)] p-8 md:p-12 relative z-10 shadow-xl">
                <div className="text-center mb-8">
                    <div 
                        className="inline-flex items-center gap-2 cursor-pointer mb-2"
                        onClick={() => window.location.href='index.html'}
                    >
                         <img 
                            src={logo} 
                            alt="Logo" 
                            className="w-8 h-8 object-contain transition-opacity duration-300"
                        />
                        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-main)] lowercase">recraftr</h1>
                    </div>
                    <p className="text-[var(--text-muted)] text-sm">
                        {authMode === 'signup' ? 'Create your creator account' : 'Welcome back'}
                    </p>
                </div>

                {/* Auth Type Toggles */}
                <div className="flex border-b border-[var(--border-color)] mb-8">
                    <button 
                        onClick={() => setAuthMode('signin')}
                        className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wide transition-colors ${authMode === 'signin' ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={() => setAuthMode('signup')}
                        className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wide transition-colors ${authMode === 'signup' ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleAuth} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Email</label>
                        <input 
                            type="email" 
                            required
                            className="input-field py-3 font-mono text-sm"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Password</label>
                        <input 
                            type="password" 
                            required
                            className="input-field py-3 font-mono text-sm"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isLoading || isGoogleLoading}
                        className="w-full btn btn-primary py-3 mt-2 hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="icon-loader animate-spin"></div>
                        ) : (
                            authMode === 'signup' ? 'Create Account' : 'Access Account'
                        )}
                    </button>
                </form>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[var(--border-color)]"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase tracking-widest">
                        <span className="px-4 bg-[var(--surface-color)] text-[var(--text-muted)]">Or continue with</span>
                    </div>
                </div>

                <button 
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading || isLoading}
                    className="w-full flex items-center justify-center gap-3 bg-[var(--bg-color)] border border-[var(--border-color)] text-[var(--text-main)] font-medium py-3 px-4 rounded-[var(--radius-md)] hover:border-[var(--text-main)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGoogleLoading ? (
                        <>
                            <div className="icon-loader animate-spin text-[var(--text-muted)]"></div>
                            <span className="font-sans text-[var(--text-muted)]">Connecting...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            <span className="font-sans">Google</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<LoginApp />);