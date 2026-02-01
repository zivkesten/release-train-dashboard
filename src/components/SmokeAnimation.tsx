import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SmokeParticle {
  id: number;
  x: number;
  delay: number;
  size: number;
  duration: number;
}

interface SmokeAnimationProps {
  isActive: boolean;
  onComplete?: () => void;
}

export function SmokeAnimation({ isActive, onComplete }: SmokeAnimationProps) {
  const [particles, setParticles] = useState<SmokeParticle[]>([]);

  useEffect(() => {
    if (isActive) {
      // Generate smoke particles
      const newParticles: SmokeParticle[] = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 60 - 30, // Random horizontal offset
        delay: Math.random() * 0.5,
        size: 20 + Math.random() * 30,
        duration: 1.5 + Math.random() * 1,
      }));
      setParticles(newParticles);

      // Clear particles and call onComplete after animation
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="absolute pointer-events-none"
          initial={{
            opacity: 0.8,
            scale: 0.3,
            x: 0,
            y: 0,
          }}
          animate={{
            opacity: 0,
            scale: 1.5,
            x: particle.x,
            y: -80 - Math.random() * 40,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: 'easeOut',
          }}
          style={{
            width: particle.size,
            height: particle.size,
            left: '50%',
            top: '50%',
            marginLeft: -particle.size / 2,
            marginTop: -particle.size / 2,
          }}
        >
          <div 
            className="w-full h-full rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(180, 180, 180, 0.6) 0%, rgba(140, 140, 140, 0.3) 50%, transparent 70%)',
              filter: 'blur(4px)',
            }}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
