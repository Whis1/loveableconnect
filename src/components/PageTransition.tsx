import { motion, Variants, Transition } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

 const pageVariants: Variants = {
   initial: {
     opacity: 0,
   },
   animate: {
     opacity: 1,
   },
   exit: {
     opacity: 0,
   },
 };

 const pageTransition: Transition = {
   type: "tween",
   ease: "easeOut",
   duration: 0.15,
 };

export const PageTransition = ({ children }: PageTransitionProps) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
};
