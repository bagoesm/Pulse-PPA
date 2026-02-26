import React, { useRef, useEffect, useState } from 'react';

interface ParticlesBackgroundProps {
    particleCount?: number;
    particleSize?: number;
    particleSpeed?: number;
    connectionRadius?: number;
    interactionRadius?: number;
    className?: string;
    color?: string; // Hex color for the particles, defaults to white/light silver
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
}

const ParticlesBackground: React.FC<ParticlesBackgroundProps> = ({
    particleCount = 50,
    particleSize = 1.5,
    particleSpeed = 0.5,
    connectionRadius = 120,
    interactionRadius = 150,
    className = '',
    color = '255, 255, 255', // e.g. "255, 255, 255"
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isMobile, setIsMobile] = useState(false);
    const mouseRef = useRef({ x: -1000, y: -1000, active: false });
    const particlesRef = useRef<Particle[]>([]);
    const animationFrameIdRef = useRef<number | null>(null);

    // Check if it's a mobile device to optionally disable or reduce effects
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width;
        let height = canvas.height;

        // Resize handler
        const resizeCanvas = () => {
            // Use parent constraints or full window if absolute
            width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
            height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;

            // Handle high DPI displays for crispness
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;

            ctx.scale(dpr, dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            initParticles();
        };

        // Initialize particles
        const initParticles = () => {
            // Reduce particle count significantly on mobile
            const count = isMobile ? Math.floor(particleCount / 3) : particleCount;
            const particles: Particle[] = [];

            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * particleSpeed * 2,
                    vy: (Math.random() - 0.5) * particleSpeed * 2,
                    size: Math.random() * particleSize + 0.5,
                });
            }
            particlesRef.current = particles;
        };

        // Draw frame
        const render = () => {
            ctx.clearRect(0, 0, width, height);
            const particles = particlesRef.current;
            const mouse = mouseRef.current;

            // Update positions & Draw particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                // Move
                p.x += p.vx;
                p.y += p.vy;

                // Bounce off edges
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                // Mouse interaction (repel subtly or attract, let's do a subtle repel)
                if (mouse.active && !isMobile) {
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < interactionRadius && distance > 0.0001) {
                        // Calculate force (1 close to 0 distance, 0 closer to radius boundary)
                        const force = (interactionRadius - distance) / interactionRadius;
                        // Shift position slightly away from cursor
                        const repelStrength = 1.0;
                        p.x -= (dx / distance) * force * repelStrength;
                        p.y -= (dy / distance) * force * repelStrength;
                    }
                }

                // Draw point
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${color}, 1)`;
                ctx.fill();
            }

            // Draw connections
            if (!isMobile) {
                ctx.lineWidth = 0.5;
                for (let i = 0; i < particles.length; i++) {
                    for (let j = i + 1; j < particles.length; j++) {
                        const p1 = particles[i];
                        const p2 = particles[j];
                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < connectionRadius) {
                            const opacity = 1 - (distance / connectionRadius);
                            // Connection lines between particles
                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(${color}, ${opacity * 0.4})`;
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();
                        }
                    }

                    // Connection to mouse
                    if (mouse.active) {
                        const p = particles[i];
                        const dx = mouse.x - p.x;
                        const dy = mouse.y - p.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < connectionRadius * 1.5 && distance > 0.0001) {
                            const opacity = 1 - (distance / (connectionRadius * 1.5));
                            ctx.beginPath();
                            ctx.strokeStyle = `rgba(${color}, ${opacity * 0.5})`;
                            ctx.moveTo(mouse.x, mouse.y);
                            ctx.lineTo(p.x, p.y);
                            ctx.stroke();
                        }
                    }
                }
            }

            animationFrameIdRef.current = requestAnimationFrame(render);
        };

        // Setup events
        window.addEventListener('resize', resizeCanvas);

        // Initial setup
        resizeCanvas();
        render();

        // Cleanup
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
        };
    }, [isMobile, particleCount, particleSize, particleSpeed, connectionRadius, interactionRadius, color]);

    // Mouse event handlers
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
        // We get bounding rect to calculate correct coordinates relative to canvas
        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                active: true
            };
        }
    };

    const handleMouseLeave = () => {
        mouseRef.current.active = false;
    };

    // For global tracking if the component root isn't catching everything
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            handleMouseMove(e);
        };

        // Only track globally if not on mobile
        if (!isMobile) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
        }
    }, [isMobile]);


    return (
        <div
            className={`absolute inset-0 pointer-events-none z-0 overflow-hidden ${className}`}
            onMouseLeave={handleMouseLeave}
        >
            <canvas
                ref={canvasRef}
                style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }}
            />
        </div>
    );
};

export default ParticlesBackground;
