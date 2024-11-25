import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";

const Loader = ({
  className,
  ...props
}: {
  className?: string;
  props?: typeof Loader2Icon;
}) => {
  return (
    <Loader2Icon {...props} className={cn("mx-auto animate-spin", className)} />
  );
};

export default Loader;
