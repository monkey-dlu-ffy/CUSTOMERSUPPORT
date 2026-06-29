import InkReveal from "../ui/InkReveal";

/**
 * AuthShell
 *
 * Shared layout for the login/register screens. The left panel carries an
 * ink-wash mask over a photograph. The right panel is plain and quiet, 
 * holding whatever form is passed in as `children`.
 *
 * Both panels feature a smooth entrance animation on mount.
 */
export default function AuthShell({
  brand = "Customer Support System",
  eyebrow ,
  title,
  subtitle,
  tagline,
  hint,
  error,
  footer,
  children,
}) {
  return (
    <div className="ar-shell">
      <style>{CSS}</style>

      <div className="ar-visual">
        <img
          className="ar-visual-img"
          src="https://st2.depositphotos.com/3591429/7169/i/950/depositphotos_71693845-stock-photo-diverse-people-and-customer-service.jpg"
          alt=""
        />
        <InkReveal maskColor={[20, 22, 31]} brushSize={150} />
        <div className="ar-visual-content">
          <div className="ar-mark">
            <span className="ar-mark-glyph">{brand.charAt(0)}</span>
            <span className="ar-mark-name">{brand}</span>
          </div>
          <div className="ar-visual-foot">
            {tagline && <p className="ar-tagline">{tagline}</p>}
            <p className="ar-hint">{hint}</p>
          </div>
        </div>
      </div>

      <div className="ar-form-side">
        <div className="ar-form-card">
          <div className="ar-mark ar-mark--mobile">
            <span className="ar-mark-glyph">{brand.charAt(0)}</span>
            <span className="ar-mark-name">{brand}</span>
          </div>

          {eyebrow && <p className="ar-eyebrow">{eyebrow}</p>}
          <h1 className="ar-title">{title}</h1>
          {subtitle && <p className="ar-subtitle">{subtitle}</p>}

          {error && (
            <div className="ar-error" role="alert">
              {error}
            </div>
          )}

          {children}

          {footer && <div className="ar-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

const CSS = `
/* --- Animations --- */
@keyframes slideRevealLeft {
  0% { opacity: 0; transform: translateX(-40px); }
  100% { opacity: 1; transform: translateX(0); }
}

@keyframes slideRevealUp {
  0% { opacity: 0; transform: translateY(30px); }
  100% { opacity: 1; transform: translateY(0); }
}

.ar-shell {
  --ar-ink-900: #14161f;
  --ar-paper: #f6f4ef;
  --ar-ink-text: #1b1d27;
  --ar-muted: #6b6f7c;
  --ar-accent: #a8732f;
  --ar-accent-dark: #7d5722;
  --ar-line: #ddd8cc;
  --ar-error: #9a2d24;
  --ar-serif: 'Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', Georgia, serif;
  --ar-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  display: flex;
  min-height: 100vh;
  background: var(--ar-paper);
  font-family: var(--ar-sans);
  overflow: hidden; /* Prevents scrollbars during animation */
}

/* --- Override Browser Autofill Styles --- */
.ar-input:-webkit-autofill,
.ar-input:-webkit-autofill:hover, 
.ar-input:-webkit-autofill:focus, 
.ar-input:-webkit-autofill:active {
  /* Match this to your new gray background! */
  -webkit-box-shadow: 0 0 0 30px #e8e6df inset !important;
  
  -webkit-text-fill-color: var(--ar-ink-text) !important;
  transition: background-color 5000s ease-in-out 0s;
}



.ar-visual {
  position: relative;
  flex: 0 0 46%;
  overflow: hidden;
  background: var(--ar-ink-900);
  
  /* Left Panel Animation */
  opacity: 0; 
  animation: slideRevealLeft 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.ar-visual-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(0.15) contrast(1.05);
}

.ar-visual-content {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 48px;
  pointer-events: none;
  box-sizing: border-box;
}

.ar-mark { display: flex; align-items: center; gap: 10px; }
.ar-mark-glyph {
  width: 30px;
  height: 30px;
  border: 1px solid rgba(246,244,239,0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ar-serif);
  font-size: 14px;
  color: #f6f4ef;
  flex-shrink: 0;
}
.ar-mark-name {
  color: #f6f4ef; /* Keeps the inside text light cream */
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  
  /* Adds the black outline */
  -webkit-text-stroke: 0.2px #000000;
  
  /* Fallback for older browsers (optional but recommended) */
  text-shadow: 
    -1px -1px 0 #000,  
     1px -1px 0 #000,
    -1px  1px 0 #000,
     1px  1px 0 #000;
}

.ar-mark--mobile { display: none; margin-bottom: 28px; }
.ar-mark--mobile .ar-mark-glyph { border-color: var(--ar-line); color: var(--ar-ink-text); }
.ar-mark--mobile .ar-mark-name { color: var(--ar-ink-text); }

.ar-visual-foot { display: flex; flex-direction: column; gap: 12px; }
.ar-tagline {
  font-family: var(--ar-serif);
  font-style: italic;
  font-size: 28px;
  line-height: 1.35;
  color: #f6f4ef;
  max-width: 360px;
  margin: 0;
}
.ar-hint {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(246,244,239,0.55);
  margin: 0;
}

.ar-form-side {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  box-sizing: border-box;
}

.ar-form-card { 
  width: 100%; 
  max-width: 380px; 
  
  /* Right Panel Animation (Staggered Delay) */
  opacity: 0;
  animation: slideRevealUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
}

.ar-eyebrow {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ar-accent);
  margin: 0 0 14px;
  font-weight: 600;
}
.ar-title {
  font-family: var(--ar-serif);
  font-size: 32px;
  color: var(--ar-ink-text);
  margin: 0 0 10px;
}
.ar-subtitle {
  font-size: 14px;
  color: var(--ar-muted);
  margin: 0 0 32px;
  line-height: 1.5;
}

.ar-error {
  border-left: 3px solid var(--ar-error);
  background: rgba(154,45,36,0.06);
  color: var(--ar-error);
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 24px;
}

.ar-field { margin-bottom: 22px; }
.ar-label {
  display: block;
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--ar-muted);
  margin-bottom: 8px;
}
.ar-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--ar-line);
  
  /* 1. Change background to a gray shade */
  background: #e8e6df; 
  
  /* 2. (Optional but recommended) Add a little padding and rounded corners so the gray box looks nice */
  padding: 10px 12px; 
  border-radius: 4px 4px 0 0; 
  
  font-size: 15px;
  color: var(--ar-ink-text);
  font-family: var(--ar-sans);
  box-sizing: border-box;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
.ar-input:focus { outline: none; border-bottom: 1px solid var(--ar-accent); }
.ar-input:focus-visible { outline: 2px solid var(--ar-accent); outline-offset: 3px; }

.ar-button {
  width: 100%;
  padding: 13px;
  margin-top: 8px;
  background: var(--ar-accent);
  color: #fff;
  border: none;
  font-size: 14px;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.ar-button:hover:not(:disabled) { background: var(--ar-accent-dark); }
.ar-button:disabled { opacity: 0.6; cursor: not-allowed; }
.ar-button:focus-visible { outline: 2px solid var(--ar-ink-text); outline-offset: 3px; }

.ar-footer {
  margin-top: 26px;
  font-size: 13px;
  color: var(--ar-muted);
  text-align: center;
}
.ar-footer a { color: var(--ar-accent); font-weight: 600; text-decoration: none; }
.ar-footer a:hover { text-decoration: underline; }

@media (max-width: 860px) {
  .ar-visual { display: none; }
  .ar-mark--mobile { display: flex; }
  .ar-form-side { padding: 40px 24px; }
}

/* Accessibility: Disable animations for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  .ar-visual, .ar-form-card {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .ar-input, .ar-button { transition: none; }
}
`;