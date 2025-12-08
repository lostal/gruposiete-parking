import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-gray-200 brutal-border rounded-xl brutal-shimmer",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
