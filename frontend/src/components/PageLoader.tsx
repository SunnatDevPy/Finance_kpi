import { motion } from "framer-motion";
import { Loader2Icon } from "lucide-react";

/** Shown while a lazily-loaded route chunk is fetched. */
export function PageLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: 0.15 }}
      className="flex min-h-[50vh] flex-col items-center justify-center"
    >
      <Loader2Icon className="size-6 animate-spin text-emerald-500" />
    </motion.div>
  );
}
