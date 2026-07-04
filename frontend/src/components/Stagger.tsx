import { motion, type HTMLMotionProps } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
};

/** Wraps a grid/list of children (e.g. StatCards) and staggers their entrance. */
export function StaggerContainer({ className, children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Single staggered child — use inside `StaggerContainer`. */
export function StaggerItem({ className, children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div className={className} variants={itemVariants} {...props}>
      {children}
    </motion.div>
  );
}
