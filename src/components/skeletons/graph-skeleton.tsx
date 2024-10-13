import { cn } from "@/lib/utils";

const GraphSkeleton = ({ pie }: { pie?: boolean }) => {
  return (
    <div className="w-full h-full animate-pulse">
      {!!pie ? (
        <div
          className={cn(
            "bg-gray-200 dark:bg-white/30 backdrop-blur-lg max-w-4xl size-60 m-auto rounded-full"
          )}
        ></div>
      ) : (
        <div className="max-w-4xl space-y-1">
          <div className="bg-gray-200 dark:bg-white/30 backdrop-blur-lg h-6 w-1/4 rounded" />
          <div className="bg-gray-200 dark:bg-white/30 backdrop-blur-lg h-6 w-1/2 rounded" />
          <div className="bg-gray-200 dark:bg-white/30 backdrop-blur-lg h-20 rounded" />
          <div className="bg-gray-200 dark:bg-white/30 backdrop-blur-lg h-20 rounded" />
        </div>
      )}
    </div>
  );
};

export default GraphSkeleton;
