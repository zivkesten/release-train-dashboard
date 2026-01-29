import { motion } from 'framer-motion';
import { Train } from 'lucide-react';

interface TrainIconProps {
  isMoving?: boolean;
  isFinal?: boolean;
}

export function TrainIcon({ isMoving, isFinal }: TrainIconProps) {
  return (
    <motion.div
      className={`
        relative flex items-center justify-center w-10 h-10 rounded-full
        bg-train-body text-primary-foreground shadow-glow
        ${isFinal ? 'ring-4 ring-status-done ring-offset-2 ring-offset-background' : ''}
      `}
      animate={isMoving ? {
        y: [0, -8, -4, -2, 0],
        scale: [1, 1.1, 1.05, 1.02, 1],
      } : {}}
      transition={{
        duration: 0.6,
        ease: [0.34, 1.56, 0.64, 1],
      }}
    >
      <Train className="w-5 h-5" />
      
      {/* Wheels animation */}
      <motion.div 
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-3"
        animate={isMoving ? { rotate: [0, 360] } : {}}
        transition={{ duration: 0.3, repeat: isMoving ? 2 : 0 }}
      >
        <div className="w-2 h-2 rounded-full bg-train-accent" />
        <div className="w-2 h-2 rounded-full bg-train-accent" />
      </motion.div>
      
      {/* Steam puff when moving */}
      {isMoving && (
        <motion.div
          className="absolute -top-4 left-1/2"
          initial={{ opacity: 0, scale: 0.5, y: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 1.5], y: -10 }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
        </motion.div>
      )}
    </motion.div>
  );
}
