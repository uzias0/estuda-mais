import { SkeletonList } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="page-container">
      <SkeletonList count={3} />
    </div>
  );
}
