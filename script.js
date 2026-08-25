/* ==========================================================================
   HUMN Labs - Premium Cybernetic Engine & Interaction Layer
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    
    // ---------------------------------------------------------
    // 1. Ambient Interactive Particle Canvas Network
    // ---------------------------------------------------------
    const canvas = document.getElementById("canvas-bg");
    const ctx = canvas.getContext("2d");
    
    const initialWidth = window.innerWidth;
    const initialHeight = window.innerHeight;
    const isMobileOrTablet = initialWidth < 1024 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    canvas.width = initialWidth;
    canvas.height = initialHeight;
    let width = initialWidth;
    let height = initialHeight;
    
    let particles = [];
    
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
    // 2. Scroll Reveal System (IntersectionObserver)
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
    
    if (waitlistForm) {
        const feedbackBlock = document.getElementById("form-message");
        const submitBtn = waitlistForm.querySelector(".btn-submit");
        const btnText = submitBtn ? submitBtn.querySelector(".btn-text") : null;
        const btnIcon = submitBtn ? submitBtn.querySelector(".btn-icon") : null;

        function setButtonIcon(iconId, isSpinning = false) {
            if (!btnIcon) return;
            const useElem = btnIcon.querySelector("use");
            if (useElem) {
                useElem.setAttribute("href", `#${iconId}`);
            }
            if (isSpinning) {
                btnIcon.classList.add("spin-icon");
            } else {
                btnIcon.classList.remove("spin-icon");
            }
        }

        function resetSubmitButton() {
            if (!submitBtn || !btnText || !btnIcon) return;
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
            btnText.textContent = "Access the Report";
            setButtonIcon("icon-arrow-right", false);
            submitBtn.style.background = "";
            submitBtn.style.color = "";
            submitBtn.style.boxShadow = "";
        }

        waitlistForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            
            // Set loading state on button
            if (submitBtn && btnText && btnIcon) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = "0.7";
                btnText.textContent = "Registering...";
                setButtonIcon("icon-spinner", true);
            }
            
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
                    if (feedbackBlock) {
                        feedbackBlock.style.display = "block";
                        feedbackBlock.style.opacity = "0";
                        setTimeout(() => {
                            feedbackBlock.style.transition = "opacity 0.5s ease";
                            feedbackBlock.style.opacity = "1";
                        }, 50);
                    }
                    
                    waitlistForm.reset();
                    if (submitBtn && btnText && btnIcon) {
                        btnText.textContent = "Registered";
                        setButtonIcon("icon-check", false);
                        submitBtn.style.background = "#00ff87";
                        submitBtn.style.color = "#030305";
                        submitBtn.style.boxShadow = "0 0 15px rgba(0, 255, 135, 0.4)";
                    }
                } else {
                    const responseData = await response.json();
                    if (responseData.errors) {
                        alert(responseData.errors.map(error => error.message).join(", "));
                    } else {
                        alert("An error occurred. Please try again.");
                    }
                    resetSubmitButton();
                }
            } catch (error) {
                alert("We couldn't complete your registration. Please check your connection and try again.");
                resetSubmitButton();
            }
        });
    }
    
    // ---------------------------------------------------------
    // 5. Mobile Responsive Hamburger Menu Interaction & Focus Trap
    // ---------------------------------------------------------
    const navToggle = document.querySelector(".mobile-nav-toggle");
    const mainNav = document.querySelector(".main-nav");
    const navLinks = document.querySelectorAll(".main-nav .nav-link");

    if (navToggle && mainNav) {
        const getFocusableControls = () => {
            const links = Array.from(mainNav.querySelectorAll("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"));
            return [navToggle, ...links];
        };

        const openNav = () => {
            navToggle.setAttribute("aria-expanded", "true");
            mainNav.classList.add("active");
            document.body.classList.add("nav-open");
            // Move focus into first navigation link inside drawer
            const firstLink = mainNav.querySelector(".nav-link");
            if (firstLink) {
                firstLink.focus();
            }
        };

        const closeNav = (returnFocus = true) => {
            if (!mainNav.classList.contains("active")) return;
            navToggle.setAttribute("aria-expanded", "false");
            mainNav.classList.remove("active");
            document.body.classList.remove("nav-open");
            if (returnFocus) {
                navToggle.focus();
            }
        };

        navToggle.addEventListener("click", () => {
            const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
            if (isExpanded) {
                closeNav(true);
            } else {
                openNav();
            }
        });

        // Close menu and restore body scrolling when a link is clicked
        navLinks.forEach((link) => {
            link.addEventListener("click", () => {
                closeNav(false);
            });
        });

        // Focus trap and Escape key handler
        document.addEventListener("keydown", (e) => {
            if (!mainNav.classList.contains("active")) return;

            if (e.key === "Escape") {
                e.preventDefault();
                closeNav(true);
                return;
            }

            if (e.key === "Tab") {
                const controls = getFocusableControls();
                if (controls.length === 0) return;

                const firstControl = controls[0]; // navToggle
                const lastControl = controls[controls.length - 1]; // last nav link

                if (e.shiftKey) {
                    if (document.activeElement === firstControl || !mainNav.contains(document.activeElement) && document.activeElement !== navToggle) {
                        e.preventDefault();
                        lastControl.focus();
                    }
                } else {
                    if (document.activeElement === lastControl) {
                        e.preventDefault();
                        firstControl.focus();
                    }
                }
            }
        });

        // Reset state cleanly if resized to desktop viewport
        window.addEventListener("resize", () => {
            if (window.innerWidth > 768 && mainNav.classList.contains("active")) {
                closeNav(false);
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
