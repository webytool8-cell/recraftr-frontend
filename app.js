// Important: DO NOT remove this `ErrorBoundary` component.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center p-8 max-w-md">
            <h1 className="text-2xl font-serif font-bold text-black mb-4">Something went wrong.</h1>
            <p className="text-gray-600 mb-6 font-serif">We encountered an unexpected error. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary rounded-full"
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

function ScrollToTopButton() {
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
        const toggleVisibility = () => {
            if (window.pageYOffset > 500) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    if (!isVisible) return null;

    return (
        <button 
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 w-12 h-12 flex items-center justify-center bg-white border border-gray-200 text-gray-500 rounded-full hover:border-black hover:text-black transition-all duration-300"
            title="Back to Top"
        >
            <div className="icon-arrow-up text-xl"></div>
        </button>
    );
}

function App() {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [results, setResults] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const outputRef = React.useRef(null);
  const workspaceRef = React.useRef(null);

  React.useEffect(() => {
    // Initialize User from Auth
    const fetchUser = async () => {
        try {
            const currentUser = await getCurrentUser();
            if (currentUser) {
                 setUser(currentUser);
            }
        } catch (e) {
            console.error("User init error", e);
        }
    };
    fetchUser();
  }, []);

  const scrollToWorkspace = () => {
      if (workspaceRef.current) {
          workspaceRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
  };

  const handleRestructure = async (inputContent, inputMode, targets, tone) => {
    if (!user) {
        if(confirm("Join Recraftr to create your content. Sign in now?")) {
            window.location.href = 'login.html';
        }
        return;
    }
    
    // Check Limits
    if (user) {
        if (user.is_premium) {
            // Unlimited for premium
        } else {
            // Free user check
            const dailyCount = await getDailyUsageCount(user.id);
            if (dailyCount >= 5) {
                if(confirm(`Daily creative limit reached (5/5).\n\nUnlock unlimited ideas with the Pro Writer plan?`)) {
                    window.location.href = 'payment.html';
                }
                return;
            }
        }
    }

    setIsProcessing(true);
    // Do NOT clear results immediately to avoid jarring UI, keep previous results until new ones ready if re-running
    if (!results) setResults([]); 
    
    // Smooth scroll
    setTimeout(() => {
        if (outputRef.current) {
            outputRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
    
    try {
        // Step 1: Fetch Content
        let textToProcess = inputContent;
        
        if (inputMode === 'article' || inputMode === 'youtube') {
            try {
                textToProcess = await fetchContentFromURL(inputContent);
                if (!textToProcess || textToProcess.length < 50) {
                     throw new Error("Could not extract enough content from URL");
                }
            } catch (fetchErr) {
                console.warn("Fetch failed:", fetchErr);
                const msg = fetchErr.message || "Unknown error";
                alert(`We couldn't read that link directly (${msg}).\n\nTry pasting the text content instead!`);
                setIsProcessing(false);
                return;
            }
        }

        // Log history
        await safeCreateObject('usage_history', {
            user_id: user.id,
            action: 'restructure',
            amount: 1,
            details: `Drafted ${targets.join(', ')} from ${inputMode}`
        });

        // Step 2: Single Unified API Call (Batch Generation)
        const batchResults = await generateBatchContent(textToProcess, targets, tone);

        // Step 3: Transform JSON result into UI format
        const uiResults = Object.keys(batchResults).map(platform => {
            let content = batchResults[platform];
            if (Array.isArray(content)) {
                content = content.join('\n\n---\n\n');
            }
            return { platform: platform, content: content };
        });

        setResults(uiResults);

    } catch (error) {
        console.error("Processing error:", error);
        alert(`Something went wrong: ${error.message}`);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col" data-name="app" data-file="app.js">
        <Header user={user} />
        
        <main className="flex-1 w-full">
            
            {/* HERO SECTION - Minimalist Editorial */}
            <section className="pt-24 pb-20 md:pt-32 md:pb-24 px-6 border-b border-[var(--border-color)] transition-colors duration-300">
                <div className="max-w-4xl mx-auto text-center">
                    
                    <h1 className="text-hero text-5xl md:text-8xl text-[var(--text-main)] mb-6 md:mb-8 leading-[1.1]">
                        Stay curious. <br/>
                        <span className="italic font-serif text-[var(--text-muted)] font-normal">Write better.</span>
                    </h1>
                    
                    <p className="text-lg md:text-2xl text-[var(--text-main)] font-serif max-w-2xl mx-auto leading-relaxed mb-10 md:mb-12 opacity-90 px-4">
                        Turn your rough drafts, articles, or random notes into polished newsletters, threads, and posts. Instantly.
                    </p>
                    
                    <div className="flex justify-center">
                         <button onClick={scrollToWorkspace} className="btn btn-primary text-lg px-10 py-4 rounded-full bg-[var(--text-main)] text-[var(--bg-color)] hover:opacity-90 transition-all font-bold shadow-xl shadow-black/10">
                            Start writing
                        </button>
                    </div>
                </div>
            </section>

            {/* WORKSPACE - The Core Tool */}
            <section ref={workspaceRef} id="workspace" className="py-20 md:py-24 px-6 scroll-mt-20 bg-[var(--bg-color)] transition-colors duration-300">
                <div className="max-w-5xl mx-auto">
                    <InputPanel onRestructure={handleRestructure} isProcessing={isProcessing} />
                </div>
            </section>

            {/* RESULTS SECTION - Tabbed output */}
            <section ref={outputRef} className="py-20 md:py-24 px-6 bg-[var(--secondary-color)]">
                <div className="max-w-5xl mx-auto">
                     <OutputPanel results={results} isProcessing={isProcessing} />
                </div>
            </section>

            {/* MARKETING SECTIONS */}
            <FeatureGrid />
            <UseCases />
            <PricingCompare />
            
        </main>
        
        <Footer />
        <ScrollToTopButton />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);