import { SkeletonList } from "@/components/Skeleton";

export default function AdminLoading() {
  return (
    <div className="page-container">
      <SkeletonList count={3} />
    </div>
  );
}
