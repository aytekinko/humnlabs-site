/* -------------------------------------------------------------
 * HUMN Labs Interactive Controller
 * Premium Interactive Backgrounds & Live Simulators
 * ------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    
    // ---------------------------------------------------------
    // 1. HTML5 Canvas Interactive Particle Network
    // ---------------------------------------------------------
    const canvas = document.getElementById('canvas-bg');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        let mouse = { x: null, y: null, radius: 120 };
        
        // Handle window resizing
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        }
        
        // Particle Class definition
        class Particle {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.baseX = x;
                this.baseY = y;
                this.size = Math.random() * 1.5 + 1;
                this.density = (Math.random() * 20) + 10;
                this.vx = (Math.random() * 0.4) - 0.2;
                this.vy = (Math.random() * 0.4) - 0.2;
                this.alpha = Math.random() * 0.5 + 0.25;
            }
            
            draw() {
                ctx.fillStyle = `rgba(0, 180, 216, ${this.alpha})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
            }
            
            update() {
                // Drifting motion
                this.x += this.vx;
                this.y += this.vy;
                
                // Keep inside screen
                if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
                if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;
                
                // Mouse interaction (Push/Spring physics)
                if (mouse.x !== null && mouse.y !== null) {
                    let dx = mouse.x - this.x;
                    let dy = mouse.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < mouse.radius) {
                        let force = (mouse.radius - distance) / mouse.radius;
                        let directionX = dx / distance;
                        let directionY = dy / distance;
                        
                        // Push away from mouse
                        this.x -= directionX * force * 1.5;
                        this.y -= directionY * force * 1.5;
                    }
                }
            }
        }
        
        function initParticles() {
            particles = [];
            let numberOfParticles = Math.floor((canvas.width * canvas.height) / 14000);
            // Cap particles for mobile performance
            if (numberOfParticles > 120) numberOfParticles = 120;
            if (numberOfParticles < 30) numberOfParticles = 30;
            
            for (let i = 0; i < numberOfParticles; i++) {
                let x = Math.random() * canvas.width;
                let y = Math.random() * canvas.height;
                particles.push(new Particle(x, y));
            }
        }
        
        // Connect nearby particles with thin lines
        function connectParticles() {
            let maxDistance = 110;
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    let dx = particles[a].x - particles[b].x;
                    let dy = particles[a].y - particles[b].y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < maxDistance) {
                        // Calculate opacity based on distance
                        let opacity = (1 - (distance / maxDistance)) * 0.12;
                        ctx.strokeStyle = `rgba(0, 180, 216, ${opacity})`;
                        ctx.lineWidth = 0.5;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        }
        
        // Animation Loop
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            for (let i = 0; i < particles.length; i++) {
                particles[i].draw();
                particles[i].update();
            }
            
            connectParticles();
            requestAnimationFrame(animate);
        }
        
        // Event Listeners
        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.x;
            mouse.y = e.y;
        });
        window.addEventListener('mouseleave', () => {
            mouse.x = null;
            mouse.y = null;
        });
        
        // Init and start
        resizeCanvas();
        animate();
    }
    
    // ---------------------------------------------------------
    // 2. IntersectionObserver Scroll Reveal Animations
    // ---------------------------------------------------------
    const revealElements = document.querySelectorAll('.reveal-fade, .reveal-slide');
    
    if (revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    // Once animated, no need to keep observing
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px' // Trigger slightly before element is centered
        });
        
        revealElements.forEach(el => revealObserver.observe(el));
    }
    
    // Proactively active hero elements just in case
    setTimeout(() => {
        const heroElements = document.querySelectorAll('#hero .reveal-fade, #hero .reveal-slide');
        heroElements.forEach(el => el.classList.add('active'));
    }, 150);

    // ---------------------------------------------------------
    // 3. Interactive Trust-Score Mockup Simulation
    // ---------------------------------------------------------
    const mockScannerStatus = document.getElementById('mockup-scan-status');
    const mockFingerprint = document.querySelector('.biometric-fingerprint');
    const mockNodeId = document.getElementById('scan-node-id');
    const mockSource = document.getElementById('mockup-source');
    const mockEntropy = document.getElementById('mockup-entropy');
    const mockTrust = document.getElementById('mockup-trust');
    
    const mockBarBiometric = document.getElementById('mockup-bar-biometric');
    const mockBarBehavioral = document.getElementById('mockup-bar-behavioral');
    const mockBarNoise = document.getElementById('mockup-bar-noise');
    
    const mockTerminal = document.getElementById('mockup-terminal');
    
    let isHumanState = true;
    
    // Terminal Log helper
    function appendTerminalLog(text, type = '') {
        if (!mockTerminal) return;
        const line = document.createElement('div');
        line.className = `line ${type}`;
        line.innerHTML = `&gt; ${text}`;
        mockTerminal.appendChild(line);
        
        // Limit lines to 5
        while (mockTerminal.children.length > 5) {
            mockTerminal.removeChild(mockTerminal.firstChild);
        }
    }
    
    function runSimulationCycle() {
        if (!mockScannerStatus) return;
        
        // Phase 1: Scanner Analysing
        mockScannerStatus.textContent = "ANALYSIS_IN_PROGRESS";
        mockScannerStatus.style.color = "var(--color-accent-blue)";
        if (mockFingerprint) {
            mockFingerprint.style.color = "var(--color-accent-blue)";
            mockFingerprint.style.transform = "scale(1.05)";
        }
        
        appendTerminalLog("initiating connection node protocol...", "blue");
        appendTerminalLog("polling biometric packets...", "");
        
        // Phase 2: Complete Scan & Display Results (after 2 seconds)
        setTimeout(() => {
            if (isHumanState) {
                // Verified Human State
                mockScannerStatus.textContent = "HUMAN_VERIFIED";
                mockScannerStatus.style.color = "var(--color-accent-green)";
                if (mockFingerprint) {
                    mockFingerprint.style.color = "var(--color-accent-green)";
                    mockFingerprint.style.transform = "scale(1.0)";
                }
                
                if (mockNodeId) mockNodeId.textContent = "NODE_ID: HMN-9031-H";
                if (mockSource) mockSource.textContent = "GATEWAY: Browser Client (Safari)";
                if (mockEntropy) mockEntropy.textContent = "0.00031 entropy bits";
                if (mockTrust) {
                    mockTrust.textContent = "99.88%";
                    mockTrust.style.color = "var(--color-accent-green)";
                }
                
                if (mockBarBiometric) mockBarBiometric.style.width = "99%";
                if (mockBarBehavioral) mockBarBehavioral.style.width = "97%";
                if (mockBarNoise) mockBarNoise.style.width = "1%";
                
                appendTerminalLog("zero-knowledge authentication: PASS", "green");
                appendTerminalLog("trust token ledger synchronized.", "green");
            } else {
                // Synthetic AI Threat State
                mockScannerStatus.textContent = "SYNTHETIC_AI_DETECTED";
                mockScannerStatus.style.color = "#ff5f56";
                if (mockFingerprint) {
                    mockFingerprint.style.color = "#ff5f56";
                    mockFingerprint.style.transform = "scale(0.95)";
                }
                
                if (mockNodeId) mockNodeId.textContent = "NODE_ID: SYN-4109-A";
                if (mockSource) mockSource.textContent = "GATEWAY: Headless Script (Puppeteer)";
                if (mockEntropy) mockEntropy.textContent = "1.84920 entropy bits";
                if (mockTrust) {
                    mockTrust.textContent = "03.14%";
                    mockTrust.style.color = "#ff5f56";
                }
                
                if (mockBarBiometric) mockBarBiometric.style.width = "6%";
                if (mockBarBehavioral) mockBarBehavioral.style.width = "12%";
                if (mockBarNoise) mockBarNoise.style.width = "98%";
                
                appendTerminalLog("synthetic mimic signature detected!", "red");
                appendTerminalLog("access authorization: REVOKED", "red");
            }
            
            // Toggle state for next iteration
            isHumanState = !isHumanState;
            
        }, 1800);
    }
    
    // Start simulation loop (runs cycle every 6 seconds)
    if (mockScannerStatus) {
        setInterval(runSimulationCycle, 6000);
        // Run first cycle slightly after page load
        setTimeout(runSimulationCycle, 2000);
    }

    // ---------------------------------------------------------
    // 4. Interactive Waitlist Capture Form
    // ---------------------------------------------------------
    const signupForm = document.getElementById('signup-form');
    const formMessage = document.getElementById('form-message');
    const emailInput = document.getElementById('user-email');
    
    if (signupForm && formMessage) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = emailInput ? emailInput.value.trim() : '';
            if (!email) return;
            
            // Animate Button submission state
            const submitBtn = signupForm.querySelector('.btn-submit');
            const btnText = signupForm.querySelector('.btn-text');
            const btnIcon = signupForm.querySelector('.btn-icon');
            
            if (submitBtn) {
                submitBtn.style.opacity = '0.7';
                submitBtn.disabled = true;
                if (btnText) btnText.textContent = "Verifying Identity...";
                if (btnIcon) {
                    btnIcon.className = "fa-solid fa-spinner fa-spin";
                }
            }
            
            // Simulate cryptographic verification and registration latency
            setTimeout(() => {
                // Success state transition
                signupForm.style.display = 'none';
                formMessage.classList.add('active');
                
                // If simulator exists, print registration log to mockup
                appendTerminalLog(`Waitlist registered: ${email}`, "green");
                appendTerminalLog("Assigned HUMN Layer priority #20,491", "blue");
            }, 1500);
        });
    }
    
    // Smooth scrolling adjustments for anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
    
const form = document.querySelector('.waitlist-form');

form.addEventListener('submit', async function(e) {
  e.preventDefault();

  const data = new FormData(form);

  const response = await fetch(form.action, {
    method: 'POST',
    body: data,
    headers: {
      'Accept': 'application/json'
    }
  });

  if (response.ok) {
    form.innerHTML = `
      <div class="success-message">
        ✓ Access request received.
      </div>
    `;
  }
});
