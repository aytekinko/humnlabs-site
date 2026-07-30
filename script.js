/* ==========================================================================
   HUMN Labs - Premium Cybernetic Engine & Interaction Layer
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // ---------------------------------------------------------
    // 1. Ambient Interactive Particle Canvas Network
    // ---------------------------------------------------------
    const canvas = document.getElementById("canvas-bg");
    const ctx = canvas.getContext("2d");
    
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    
    let particles = [];
    
    // Detect mobile or touch devices to optimize rendering performance
    const isMobileOrTablet = window.innerWidth < 1024 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const maxParticles = isMobileOrTablet ? 25 : Math.min(100, Math.floor((width * height) / 15000)); 
    const connectionDist = isMobileOrTablet ? 90 : 120; // Reduce line calculations on mobile
    
    const mouse = {
        x: null,
        y: null,
        radius: 180,
    };
    
    window.addEventListener("mousemove", (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    
    window.addEventListener("mouseout", () => {
        mouse.x = null;
        mouse.y = null;
    });
    
    window.addEventListener("resize", () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initParticles();
    });
    
    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            // Extremely gentle, organic speeds to prevent distraction
            this.vx = (Math.random() - 0.5) * 0.35;
            this.vy = (Math.random() - 0.5) * 0.35;
            this.radius = Math.random() * 2 + 1;
            
            // Varied cyan/violet glow
            this.color = Math.random() > 0.4 ? "rgba(0, 240, 255, 0.45)" : "rgba(112, 0, 255, 0.45)";
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            
            // Screen boundaries wrap around
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
            
            // Interactive push away from mouse
            if (mouse.x !== null && mouse.y !== null) {
                const dx = this.x - mouse.x;
                const dy = this.y - mouse.y;
                const distance = Math.hypot(dx, dy);
                
                if (distance < mouse.radius) {
                    const force = (mouse.radius - distance) / mouse.radius;
                    const angle = Math.atan2(dy, dx);
                    
                    // Push gently
                    this.x += Math.cos(angle) * force * 1.5;
                    this.y += Math.sin(angle) * force * 1.5;
                }
            }
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }
    
    function initParticles() {
        particles = [];
        for (let i = 0; i < maxParticles; i++) {
            particles.push(new Particle());
        }
    }
    
    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        // Update and draw particles
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
        }
        
        // Draw lines connecting close particles
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.hypot(dx, dy);
                
                if (distance < connectionDist) {
                    // Line opacity scales down the further apart they are
                    const opacity = (1 - distance / connectionDist) * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 240, 255, ${opacity})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
            
            // Connect particles to mouse
            if (mouse.x !== null && mouse.y !== null) {
                const dx = particles[i].x - mouse.x;
                const dy = particles[i].y - mouse.y;
                const distance = Math.hypot(dx, dy);
                
                if (distance < mouse.radius) {
                    const opacity = (1 - distance / mouse.radius) * 0.18;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(mouse.x, mouse.y);
                    // Beautiful subtle gradient effect via canvas stroke
                    ctx.strokeStyle = `rgba(112, 0, 255, ${opacity})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }
        
        requestAnimationFrame(animate);
    }
    
    initParticles();
    animate();
    
    
    // ---------------------------------------------------------
    // 2. Interactive Telemetry UI Dashboard Simulator
    // ---------------------------------------------------------
    const scanStatusText = document.getElementById("mockup-scan-status");
    const scanNodeText = document.getElementById("scan-node-id");
    const mockupEntropyText = document.getElementById("mockup-entropy");
    const mockupTrustText = document.getElementById("mockup-trust");
    const mockupSourceText = document.getElementById("mockup-source");
    const terminalLines = document.getElementById("mockup-terminal");
    
    // UI Progress Bar elements
    const barBiometric = document.getElementById("mockup-bar-biometric");
    const barBehavioral = document.getElementById("mockup-bar-behavioral");
    const barNoise = document.getElementById("mockup-bar-noise");
    
    const statuses = [
        { text: "ANALYST_PENDING", color: "#00f0ff" },
        { text: "ZK_HANDSHAKE_INITIATED", color: "#7000ff" },
        { text: "SCANNING_BEHAVIORAL_ENTROPY", color: "#ff007f" },
        { text: "CRYPTOGRAPHIC_EVALUATION", color: "#00f0ff" },
        { text: "PRESENCE_CONFIDENCE_ESTIMATED", color: "#00ff87" }
    ];
    
    let statusIndex = 0;
    
    // Live loop to update statuses and bar values
    setInterval(() => {
        statusIndex = (statusIndex + 1) % statuses.length;
        const current = statuses[statusIndex];
        
        // Fade text transition
        scanStatusText.style.opacity = 0;
        setTimeout(() => {
            scanStatusText.textContent = current.text;
            scanStatusText.style.color = current.color;
            scanStatusText.style.opacity = 1;
            
            // Adjust biometric graphics or scanner speed based on status
            const scannerFingerprint = document.querySelector(".biometric-fingerprint");
            if (current.text === "PRESENCE_CONFIDENCE_ESTIMATED") {
                scannerFingerprint.style.color = "#00ff87";
                scannerFingerprint.style.filter = "drop-shadow(0 0 12px rgba(0, 255, 135, 0.5))";
            } else if (current.text === "ZK_HANDSHAKE_INITIATED" || current.text === "CRYPTOGRAPHIC_EVALUATION") {
                scannerFingerprint.style.color = "#7000ff";
                scannerFingerprint.style.filter = "drop-shadow(0 0 10px rgba(112, 0, 255, 0.4))";
            } else {
                scannerFingerprint.style.color = "#00f0ff";
                scannerFingerprint.style.filter = "drop-shadow(0 0 8px rgba(0, 240, 255, 0.35))";
            }
        }, 200);
        
        // Fluctuate telemetry figures
        // Synthetic Entropy
        const randEntropy = (Math.random() * 0.0003 + 0.0003).toFixed(5);
        mockupEntropyText.textContent = `${randEntropy} bits`;
        
        // Trust Evaluation Score
        const randTrust = (99.70 + Math.random() * 0.25).toFixed(2);
        mockupTrustText.textContent = `${randTrust}%`;
        
        // Verification Bars fluctuation
        if (current.text === "PRESENCE_CONFIDENCE_ESTIMATED") {
            barBiometric.style.width = "99.8%";
            barBehavioral.style.width = "99.2%";
            barNoise.style.width = "0.08%";
        } else {
            const bioVal = Math.floor(Math.random() * 8 + 90);
            const behVal = Math.floor(Math.random() * 10 + 85);
            const noiseVal = (Math.random() * 4 + 1).toFixed(1);
            barBiometric.style.width = `${bioVal}%`;
            barBehavioral.style.width = `${behVal}%`;
            barNoise.style.width = `${noiseVal}%`;
        }
        
        // Add log outputs to terminal
        addTerminalLog(current.text);
        
    }, 4500);
    
    // Terminal Log system
    const terminalLogs = [
        "validating cryptographic signature broadcasts...",
        "analyzing human interactive entropy fields...",
        "zero-knowledge presence signal evaluated.",
        "evaluating passive cursor acceleration path details...",
        "secure handshakes completed with local validator #821",
        "generating cryptographically secure confidence score...",
        "presence confidence registered on research ledger.",
        "noise filtering active (attenuation: 98.4dB)",
        "connection telemetry metrics refreshed."
    ];
    
    function addTerminalLog(statusText) {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        let logLine = "";
        
        if (statusText === "PRESENCE_CONFIDENCE_ESTIMATED") {
            logLine = `<div class="line green">&gt; [${time}] PRESENCE_ESTIMATED // Confidence calculation complete</div>`;
        } else if (statusText === "ZK_HANDSHAKE_INITIATED") {
            logLine = `<div class="line blue">&gt; [${time}] ZK_HANDSHAKE // Handshake broadcasting</div>`;
        } else {
            const randomMsg = terminalLogs[Math.floor(Math.random() * terminalLogs.length)];
            logLine = `<div class="line">&gt; [${time}] ${randomMsg}</div>`;
        }
        
        terminalLines.innerHTML += logLine;
        
        // Keep the latest 5 log lines visible
        const lines = terminalLines.getElementsByClassName("line");
        if (lines.length > 5) {
            terminalLines.removeChild(lines[0]);
        }
        
        // Auto scroll terminal to the bottom
        terminalLines.scrollTop = terminalLines.scrollHeight;
    }
    
    // Fluctuate IP / Node ID slightly
    setInterval(() => {
        const nodeNum = Math.floor(Math.random() * 9000 + 1000);
        scanNodeText.textContent = `NODE_ID: HMN-${nodeNum}-X`;
        
        const ipArr = [
            "104.22.4.9",
            "172.67.20.144",
            "104.22.5.9",
            "192.168.1.104",
            "185.190.140.2"
        ];
        const randomIp = ipArr[Math.floor(Math.random() * ipArr.length)];
        mockupSourceText.textContent = `IP_SEC: ${randomIp}`;
    }, 8000);
    
    
    // ---------------------------------------------------------
    // 3. Scroll Reveal System (IntersectionObserver)
    // ---------------------------------------------------------
    const revealElements = document.querySelectorAll(".reveal-fade, .reveal-slide");
    
    const observerOptions = {
        root: null,
        rootMargin: "0px 0px -40px 0px", // Trigger 40px before bottom edge
        threshold: 0.05, // Reveal when just 5% visible
    };
    
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("revealed");
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    revealElements.forEach((el) => {
        revealObserver.observe(el);
    });
    
    // Safety fallback: after 1.5s, force-reveal any elements that still haven't animated
    // This handles cases where observer doesn't fire (e.g. page already scrolled, browser quirks)
    setTimeout(() => {
        document.querySelectorAll(".reveal-fade:not(.revealed), .reveal-slide:not(.revealed)").forEach(el => {
            el.classList.add("revealed");
        });
    }, 1500);
    
    
    // ---------------------------------------------------------
    // 4. Formspree Early Access Waitlist Ajax Submission
    // ---------------------------------------------------------
    const waitlistForm = document.querySelector(".waitlist-form");
    const feedbackBlock = document.getElementById("form-message");
    const submitBtn = waitlistForm.querySelector(".btn-submit");
    const btnText = submitBtn.querySelector(".btn-text");
    const btnIcon = submitBtn.querySelector(".btn-icon");
    const emailInput = document.getElementById("user-email");
    
    if (waitlistForm) {
        waitlistForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            
            // Set loading state on button
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.7";
            btnText.textContent = "Evaluating Signals...";
            btnIcon.className = "fa-solid fa-spinner fa-spin";
            
            const data = new FormData(event.target);
            
            try {
                const response = await fetch(event.target.action, {
                    method: waitlistForm.method,
                    body: data,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    // Success UI Sequence
                    feedbackBlock.style.display = "block";
                    feedbackBlock.style.opacity = "0";
                    setTimeout(() => {
                        feedbackBlock.style.transition = "opacity 0.5s ease";
                        feedbackBlock.style.opacity = "1";
                    }, 50);
                    
                    waitlistForm.reset();
                    btnText.textContent = "Registered";
                    btnIcon.className = "fa-solid fa-check";
                    submitBtn.style.background = "#00ff87";
                    submitBtn.style.color = "#030305";
                    submitBtn.style.boxShadow = "0 0 15px rgba(0, 255, 135, 0.4)";
                } else {
                    const responseData = await response.json();
                    if (responseData.errors) {
                        alert(responseData.errors.map(error => error.message).join(", "));
                    } else {
                        alert("An error occurred. Signal evaluation failed. Please try again.");
                    }
                    resetSubmitButton();
                }
            } catch (error) {
                alert("Network latency detected. Signal transmission failed.");
                resetSubmitButton();
            }
        });
    }
    
    function resetSubmitButton() {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        btnText.textContent = "Access the Report";
        btnIcon.className = "fa-solid fa-arrow-right";
        submitBtn.style.background = "";
        submitBtn.style.color = "";
        submitBtn.style.boxShadow = "";
    }
    
    // ---------------------------------------------------------
    // 5. Mobile Responsive Hamburger Menu Interaction
    // ---------------------------------------------------------
    const navToggle = document.querySelector(".mobile-nav-toggle");
    const mainNav = document.querySelector(".main-nav");
    const navLinks = document.querySelectorAll(".main-nav .nav-link");

    if (navToggle && mainNav) {
        navToggle.addEventListener("click", () => {
            const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
            navToggle.setAttribute("aria-expanded", !isExpanded);
            mainNav.classList.toggle("active");
            document.body.classList.toggle("nav-open");
        });

        // Close menu and restore body scrolling when a link is clicked
        navLinks.forEach((link) => {
            link.addEventListener("click", () => {
                navToggle.setAttribute("aria-expanded", "false");
                mainNav.classList.remove("active");
                document.body.classList.remove("nav-open");
            });
        });

        // Close menu on Escape and return focus to the toggle button
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && mainNav.classList.contains("active")) {
                navToggle.setAttribute("aria-expanded", "false");
                mainNav.classList.remove("active");
                document.body.classList.remove("nav-open");
                navToggle.focus();
            }
        });
    }

    // ---------------------------------------------------------
    // 6. Floating Action Button Footer Overlap Prevention
    // ---------------------------------------------------------
    const xFloatPill = document.querySelector(".x-float-pill");
    const appFooter = document.querySelector(".app-footer");
    
    if (xFloatPill && appFooter) {
        window.addEventListener("scroll", () => {
            const footerRect = appFooter.getBoundingClientRect();
            // If the top of the footer is visible in the viewport, fade out the FAB
            if (footerRect.top < window.innerHeight) {
                xFloatPill.style.opacity = "0";
                xFloatPill.style.pointerEvents = "none";
            } else {
                xFloatPill.style.opacity = "1";
                xFloatPill.style.pointerEvents = "all";
            }
        });
    }

    // ---------------------------------------------------------
    // 7. Mobile Touch Glow — Social Icon
    // CSS :active is unreliable on iOS/Android. We use a JS-driven
    // .is-touching class via touchstart/touchend for guaranteed feedback.
    // ---------------------------------------------------------
    const socialIcons = document.querySelectorAll(".social-icon");

    socialIcons.forEach((icon) => {
        icon.addEventListener("touchstart", (e) => {
            icon.classList.add("is-touching");
        }, { passive: true });

        icon.addEventListener("touchend", () => {
            // Brief delay so user can see the glow before it fades
            setTimeout(() => icon.classList.remove("is-touching"), 300);
        });

        icon.addEventListener("touchcancel", () => {
            icon.classList.remove("is-touching");
        });
    });
});
